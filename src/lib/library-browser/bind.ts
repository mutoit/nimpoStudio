import {
    calculateLicenseQuote,
    formatEur,
    isLicenseUsageCode,
    type LicenseUsageCode,
  } from "../license-quote";
import { escapeHtml, safeAspectLabel, safeDomId, safeMediaUrl } from "../dom-escape";
import { translateFilterLabels } from "../filter-label-i18n";
import { absoluteShareUrl, libraryItemSharePath, shareUrl } from "../share";
import {
  fetchLibraryDetail,
  fetchLibraryList,
  mapLiveItem,
  type LibraryItem as Item,
} from "./catalog-client";
import { LibraryPreviewPlayer } from "./preview-player";
import { createPlaySession } from "./play-session";

export function bindLibraryBrowser() {
    document.querySelectorAll("[data-library-root]").forEach((root) => {
      if (!(root instanceof HTMLElement) || root.dataset.bound === "1") return;
      root.dataset.bound = "1";

      const data = JSON.parse(root.dataset.payload || "{}") as {
        lang: string;
        labels: Record<string, string>;
      };
      /** Cards acumuladas (páginas). Detail completo en detailCache. */
      let items: Item[] = [];
      const detailCache = new Map<string, Item>();
      let nextCursor: string | null = null;
      let hasMore = false;
      let totalCount = 0;
      let listFetchGen = 0;
      let listLoading = false;
      let listError = false;
      /** Preview único (mix ligero). Stems HQ no se reproducen en biblioteca. */
      const previewPlayer = new LibraryPreviewPlayer();
      let playAbort: AbortController | null = null;
      const abortPlay = () => {
        playAbort?.abort();
        playAbort = null;
      };
      const lang = data.lang;
      /** Vocabulario global desde API (catalog/moods.json + obras) */
      let serverMoods: string[] = [];
      let filterMoods: string[] = [];
      let filterTags: string[] = [];
      const L = data.labels;
      let catalogReady = false;

      const grid = root.querySelector("[data-lb-grid]");
      const overlay = root.querySelector("[data-lb-overlay]");
      const form = root.querySelector("[data-lb-form]");
      const countEl = root.querySelector("[data-lb-count]");
      const moodsBar = root.querySelector("[data-lb-moods]");
      const moreWrap = root.querySelector("[data-lb-more-wrap]");
      const moreBtn = root.querySelector("[data-lb-more]");

      const collectFilters = (list: Item[]) => {
        // Vocabulario R2 + moods/tags de obras (unificado en un solo filtro Mood)
        const m = new Set<string>(
          serverMoods.map((x) => String(x).trim().toLowerCase()).filter(Boolean),
        );
        for (const i of list) {
          for (const x of i.moods || []) if (x) m.add(String(x).trim().toLowerCase());
          for (const x of i.tags || []) if (x) m.add(String(x).trim().toLowerCase());
          for (const x of i.filterMoods || []) if (x) m.add(String(x).trim().toLowerCase());
          for (const x of i.filterTags || []) if (x) m.add(String(x).trim().toLowerCase());
        }
        filterMoods = [...m].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
        filterTags = [];
      };

      const paintChipBar = (
        bar: Element | null,
        values: string[],
        labels: string[],
        attr: "mood" | "tag",
        getActive: () => string | null,
        setActive: (v: string | null) => void,
      ) => {
        if (!bar) return;
        if (!values.length) {
          bar.innerHTML = `<span class="lb__chip-empty">—</span>`;
          return;
        }
        const active = getActive();
        bar.innerHTML = values
          .map((v, i) => {
            const label = labels[i] || v;
            return `<button type="button" class="lb__chip${active === v ? " is-on" : ""}" data-${attr}="${escapeHtml(v)}">${escapeHtml(label)}</button>`;
          })
          .join("");
        bar.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
          btn.addEventListener("click", () => {
            const v = (btn as HTMLElement).getAttribute(`data-${attr}`) || null;
            setActive(getActive() === v ? null : v);
            void paintFilters();
            // Filtro en servidor: reset + primera página
            void fetchList({ reset: true });
          });
        });
      };

      let typeFilter = "all";
      let moodFilter: string | null = null;
      let tagFilter: string | null = null; // legacy unused
      /** Evita que un paintFilters viejo (semilla) pise al del catálogo vivo */
      let filtersPaintGen = 0;

      /**
       * Lista común de valoraciones (misma en es/en/fr; textos tal cual).
       * Vacía hasta API real — no inventar comentarios.
       * Clave: slug de la obra.
       */
      type ReviewEntry = {
        name: string;
        stars: number;
        text: string;
        use?: string;
        date?: string;
      };
      /** SSoT en memoria (futuro: GET/POST /api/reviews). Una lista por obra, no por idioma. */
      const reviewsBySlug: Record<string, ReviewEntry[]> = {};

      const starRow = (n: number) =>
        "★★★★★"
          .split("")
          .map((_, i) => (i < n ? "★" : "☆"))
          .join("");

      const paintItemReviews = (item: Item) => {
        const slug = item.slug || item.id || "";
        const list = reviewsBySlug[slug] || [];
        const count = list.length;
        const average =
          count > 0 ? list.reduce((s, r) => s + r.stars, 0) / count : null;
        const full = average != null ? Math.min(5, Math.round(average)) : 0;
        const starsDisplay = starRow(full);

        const avgEl = root.querySelector("[data-lb-reviews-avg]");
        const starsEl = root.querySelector("[data-lb-reviews-stars]");
        const countElR = root.querySelector("[data-lb-reviews-count]");
        if (avgEl) avgEl.textContent = average != null ? average.toFixed(1) : "—";
        if (starsEl) starsEl.textContent = average != null ? starsDisplay : "☆☆☆☆☆";
        if (countElR) {
          const tpl = L.reviewsCount || "{n} valoraciones";
          countElR.textContent = tpl.replace("{n}", String(count));
        }
        const listEl = root.querySelector("[data-lb-reviews-list]");
        if (listEl) {
          if (!list.length) {
            listEl.innerHTML = `<p class="lb__reviews-empty">${escapeHtml(L.reviewsEmpty || "Sin comentarios aún.")}</p>`;
          } else {
            // Comentarios en su idioma original (lista común, no se traduce)
            listEl.innerHTML = list
              .map(
                (c) =>
                  `<article class="lb__review-item"><div class="lb__review-top"><span class="lb__review-name">${escapeHtml(c.name)}</span><span class="lb__review-stars" aria-hidden="true">${starRow(c.stars)}</span>${c.use ? `<span class="lb__review-use">${escapeHtml(c.use)}</span>` : ""}</div><p class="lb__review-text">${escapeHtml(c.text)}</p></article>`,
              )
              .join("");
          }
        }
        root.querySelectorAll("[data-lb-reviews-rate] [data-rate]").forEach((btn) => {
          btn.classList.remove("is-on");
          btn.setAttribute("aria-pressed", "false");
        });
        const ratingInput = root.querySelector("[data-lb-reviews-rating]");
        if (ratingInput instanceof HTMLInputElement) ratingInput.value = "";
        const nameIn = root.querySelector<HTMLInputElement>("[data-lb-reviews-form] input[name=name]");
        const commentIn = root.querySelector<HTMLTextAreaElement>("[data-lb-reviews-form] textarea[name=comment]");
        if (nameIn) nameIn.value = "";
        if (commentIn) commentIn.value = "";
      };

      // Estrellas + form (UI; persistencia cuando haya API)
      const reviewsRate = root.querySelector("[data-lb-reviews-rate]");
      if (reviewsRate && reviewsRate.getAttribute("data-bound") !== "1") {
        reviewsRate.setAttribute("data-bound", "1");
        reviewsRate.querySelectorAll("[data-rate]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const n = Number((btn as HTMLElement).dataset.rate || 0);
            reviewsRate.querySelectorAll("[data-rate]").forEach((b) => {
              const v = Number((b as HTMLElement).dataset.rate || 0);
              b.classList.toggle("is-on", v <= n);
              b.setAttribute("aria-pressed", v === n ? "true" : "false");
            });
            const input = root.querySelector("[data-lb-reviews-rating]");
            if (input instanceof HTMLInputElement) input.value = String(n);
          });
        });
      }
      const reviewsForm = root.querySelector("[data-lb-reviews-form]");
      if (reviewsForm instanceof HTMLFormElement && reviewsForm.dataset.bound !== "1") {
        reviewsForm.dataset.bound = "1";
        reviewsForm.addEventListener("submit", (e) => e.preventDefault());
      }

      const paintFilters = async () => {
        const gen = ++filtersPaintGen;
        // Snapshot: no usar filterMoods tras el await (puede haber cambiado)
        const list = [...filterMoods];
        const moodLabels = await translateFilterLabels(list, lang);
        if (gen !== filtersPaintGen) return;
        paintChipBar(moodsBar, list, moodLabels, "mood", () => moodFilter, (v) => {
          moodFilter = v;
        });
      };
      // Filtros se pintan tras el fetch vivo (o fallback semilla)
      let active: Item | null = null;
      let gridVideo: HTMLVideoElement | null = null;
      let statusHideTimer = 0;

      const fmtTime = (sec: number) => {
        if (!Number.isFinite(sec) || sec < 0) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
      };

      /** Solo feedback en modal (no barra flotante en la página). */
      const setPlayerStatus = (
        opts: {
          msg: string;
          kind?: "info" | "load" | "play" | "ok" | "err";
          playPct?: number;
          bufPct?: number;
          time?: string;
          autoHideMs?: number;
        },
      ) => {
        const modalSt = root.querySelector("[data-lb-modal-status]");
        const modalFill = root.querySelector("[data-lb-modal-fill]");
        const modalBuf = root.querySelector("[data-lb-modal-buf]");
        if (statusHideTimer) {
          window.clearTimeout(statusHideTimer);
          statusHideTimer = 0;
        }
        if (modalSt instanceof HTMLElement) {
          // Solo mostrar texto de carga/error en modal; play silencioso
          const showText = opts.kind === "load" || opts.kind === "err" || opts.kind === "ok";
          modalSt.hidden = !showText;
          if (showText) modalSt.textContent = opts.msg;
          modalSt.classList.toggle("is-err", opts.kind === "err");
          modalSt.classList.toggle("is-ok", opts.kind === "ok");
        }
        if (modalFill instanceof HTMLElement) {
          modalFill.style.setProperty("--p", `${Math.max(0, Math.min(100, opts.playPct ?? 0))}%`);
        }
        if (modalBuf instanceof HTMLElement) {
          modalBuf.style.setProperty("--b", `${Math.max(0, Math.min(100, opts.bufPct ?? 0))}%`);
        }
        if (opts.autoHideMs && opts.autoHideMs > 0 && modalSt instanceof HTMLElement) {
          statusHideTimer = window.setTimeout(() => {
            modalSt.hidden = true;
          }, opts.autoHideMs);
        }
      };

      previewPlayer.setHandlers({
        onUpdate: (p) => {
          updateProgressUI();
          const pct = p.duration > 0 ? (p.current / p.duration) * 100 : 0;
          const buf = (p.buffered || 0) * 100;
          if (p.phase === "loading") {
            setPlayerStatus({
              msg: `Cargando… ${Math.round(buf)}%`,
              kind: "load",
              playPct: Math.max(pct, buf * 0.15),
              bufPct: buf,
            });
          } else if (p.phase === "playing" || p.phase === "paused") {
            setPlayerStatus({
              msg: "",
              kind: "play",
              playPct: pct,
              bufPct: buf,
            });
          } else if (p.phase === "ended") {
            transportPlaying = false;
            playingId = null;
            resetPlayButtons();
            stopProgressLoop();
            updateProgressUI();
            setPlayerStatus({
              msg: "Fin del preview",
              kind: "ok",
              playPct: 100,
              bufPct: 100,
              autoHideMs: 2500,
            });
          } else if (p.phase === "error") {
            transportPlaying = false;
            playingId = null;
            resetPlayButtons();
            stopProgressLoop();
            setPlayerStatus({
              msg: p.error || "Error de audio",
              kind: "err",
              playPct: 0,
              bufPct: 0,
            });
          }
        },
      });
      let playingId: string | null = null;
      let transportPlaying = false;
      let progressRaf = 0;
      let seeking = false;
      let seekTargetSec: number | null = null;
      let loadingStems = false;

      const mediaDuration = (): number => {
        if (previewPlayer.duration > 0) return previewPlayer.duration;
        if (gridVideo && Number.isFinite(gridVideo.duration) && gridVideo.duration > 0) {
          return gridVideo.duration;
        }
        const modalVid = root.querySelector<HTMLVideoElement>("[data-modal-vid]");
        if (modalVid && Number.isFinite(modalVid.duration) && modalVid.duration > 0) {
          return modalVid.duration;
        }
        return 0;
      };

      const mediaCurrent = (): number => {
        if (seekTargetSec != null && seeking) return seekTargetSec;
        if (previewPlayer.loadedItemId) return previewPlayer.currentTime;
        if (gridVideo) return gridVideo.currentTime;
        const modalVid = root.querySelector<HTMLVideoElement>("[data-modal-vid]");
        if (modalVid) return modalVid.currentTime;
        return 0;
      };

      const updateProgressUI = () => {
        const seek = root.querySelector<HTMLInputElement>("[data-lb-seek]");
        const timeEl = root.querySelector("[data-lb-time]");
        const dur = mediaDuration();
        const cur = mediaCurrent();
        if (seek && !seeking) {
          seek.value = dur > 0 ? String(Math.round((cur / dur) * 1000)) : "0";
        }
        if (timeEl) {
          timeEl.textContent = `${fmtTime(cur)} / ${dur > 0 ? fmtTime(dur) : "--:--"}`;
        }
        root.querySelectorAll("[data-thumb-progress]").forEach((bar) => {
          if (!(bar instanceof HTMLElement)) return;
          const id = bar.dataset.thumbProgress || "";
          const isThis =
            id === playingId ||
            playingId === "modal-" + id ||
            (previewPlayer.loadedItemId === id &&
              (transportPlaying || previewPlayer.isPlaying));
          if (isThis && (transportPlaying || previewPlayer.isPlaying) && dur > 0) {
            bar.hidden = false;
            bar.style.setProperty("--p", `${Math.min(100, (cur / dur) * 100)}%`);
          } else if (isThis && loadingStems) {
            bar.hidden = false;
            bar.style.setProperty("--p", "12%");
          } else {
            bar.hidden = true;
            bar.style.setProperty("--p", "0%");
          }
        });
      };

      const stopProgressLoop = () => {
        if (progressRaf) cancelAnimationFrame(progressRaf);
        progressRaf = 0;
      };

      const startProgressLoop = () => {
        stopProgressLoop();
        const tick = () => {
          updateProgressUI();
          if (
            transportPlaying ||
            previewPlayer.isPlaying ||
            (gridVideo && !gridVideo.paused)
          ) {
            progressRaf = requestAnimationFrame(tick);
          } else {
            progressRaf = 0;
            updateProgressUI();
          }
        };
        progressRaf = requestAnimationFrame(tick);
      };

      const resetPlayButtons = () => {
        root.querySelectorAll("[data-thumb-play]").forEach((b) => {
          b.textContent = "▶";
          b.setAttribute("aria-pressed", "false");
        });
        const prev = root.querySelector("[data-lb-preview-play]");
        if (prev) prev.textContent = L.play;
      };

      const markPlayingButtons = (id: string) => {
        resetPlayButtons();
        const thumbId = id.startsWith("modal-") ? id.slice(6) : id;
        const thumb = root.querySelector(`[data-thumb-play="${thumbId}"]`);
        if (thumb) {
          thumb.textContent = L.stop;
          thumb.setAttribute("aria-pressed", "true");
        }
        if (active && (id === active.id || id === "modal-" + active.id || thumbId === active.id)) {
          const prev = root.querySelector("[data-lb-preview-play]");
          if (prev) prev.textContent = L.stop;
        }
      };

      const stopAll = () => {
        abortPlay();
        stopProgressLoop();
        seeking = false;
        seekTargetSec = null;
        transportPlaying = false;
        previewPlayer.stop();
        if (gridVideo) {
          gridVideo.pause();
          gridVideo.currentTime = 0;
          gridVideo = null;
        }
        const modalVid = root.querySelector<HTMLVideoElement>("[data-lb-media] video");
        if (modalVid) {
          modalVid.pause();
          modalVid.currentTime = 0;
        }
        playingId = null;
        resetPlayButtons();
        updateProgressUI();
      };

      const showStemError = (msg: string, kind: "err" | "info" = "err") => {
        // Unifica aviso en la barra de status del player (más visible)
        setPlayerStatus({
          msg,
          kind: kind === "info" ? "load" : "err",
          playPct: kind === "info" ? 8 : 0,
        });
        let el = root.querySelector("[data-lb-stem-err]");
        if (!el) {
          el = document.createElement("p");
          el.setAttribute("data-lb-stem-err", "");
          el.setAttribute("role", "status");
          grid?.parentElement?.insertBefore(el, grid);
        }
        el.textContent = msg;
        const node = el as HTMLElement;
        node.hidden = true; // la barra principal lleva el mensaje
        node.style.cssText =
          kind === "info"
            ? "margin:0.5rem 0;padding:0.5rem 0.75rem;border-radius:8px;background:rgb(100 160 255/0.12);color:#b0d0ff;font-size:0.8rem"
            : "margin:0.5rem 0;padding:0.5rem 0.75rem;border-radius:8px;background:rgb(240 80 80/0.12);color:#f0a0a0;font-size:0.8rem";
      };
      const hideStemError = () => {
        const el = root.querySelector("[data-lb-stem-err]");
        if (el instanceof HTMLElement) el.hidden = true;
      };

      const setPlayLoading = (playId: string, text: string) => {
        const thumb = root.querySelector(`[data-thumb-play="${CSS.escape(playId)}"]`);
        if (thumb) thumb.textContent = text;
        if (playId.startsWith("modal-") || playingId?.startsWith("modal-")) {
          const prev = root.querySelector("[data-lb-preview-play]");
          if (prev) prev.textContent = text;
        }
      };

      /** Grid y modal: solo preview mix (1 archivo). */
      const { playPreviewOrStems } = createPlaySession({
        previewPlayer,
        abortPlay,
        getPlayAbort: () => playAbort,
        setPlayAbort: (c) => {
          playAbort = c;
        },
        setLoading: (v) => {
          loadingStems = v;
        },
        isLoading: () => loadingStems,
        setPlayingId: (id) => {
          playingId = id;
        },
        setTransportPlaying: (v) => {
          transportPlaying = v;
        },
        markPlayingButtons,
        resetPlayButtons,
        setPlayLoading,
        startProgressLoop,
        updateProgressUI,
        setPlayerStatus,
        hideStemError,
      });

      const seekToRatio = async (ratio: number): Promise<boolean> => {
        const dur = mediaDuration();
        if (!(dur > 0)) return false;
        const t = Math.max(0, Math.min(ratio, 1)) * dur;
        seekTargetSec = t;
        seeking = true;

        if (previewPlayer.loadedItemId) {
          previewPlayer.seek(t);
          if (transportPlaying || previewPlayer.isPlaying) {
            transportPlaying = true;
            if (previewPlayer.isPlaying) startProgressLoop();
          }
        } else {
          const el =
            gridVideo || root.querySelector<HTMLVideoElement>("[data-modal-vid]");
          if (!el) {
            seeking = false;
            return false;
          }
          const resume = transportPlaying || !el.paused;
          try {
            el.currentTime = t;
          } catch {
            seeking = false;
            return false;
          }
          if (resume) {
            await el.play().catch(() => {});
            transportPlaying = true;
            startProgressLoop();
          }
        }

        updateProgressUI();
        window.setTimeout(() => {
          seeking = false;
          seekTargetSec = null;
          updateProgressUI();
        }, 120);
        return true;
      };

      const playVideoThumb = async (item: Item, v: HTMLVideoElement) => {
        previewPlayer.pause();
        v.muted = false;
        gridVideo = v;
        try {
          await v.play();
        } catch {
          v.muted = true;
          try {
            await v.play();
          } catch (e) {
            console.warn("[lb] video play fail", e);
            return;
          }
        }
        playingId = item.id;
        transportPlaying = true;
        markPlayingButtons(item.id);
        startProgressLoop();
      };

      const isAvailable = (i: Item) =>
        !i.availability || i.availability === "available";

      /** Lista ya filtrada en servidor; solo oculta off_catalog residual. */
      const filtered = () =>
        items.filter((i) => i.availability !== "off_catalog");

      const itemKey = (i: Item) => String(i.slug || i.id || "");

      const updateLoadMore = () => {
        if (!(moreWrap instanceof HTMLElement)) return;
        const show = catalogReady && hasMore;
        moreWrap.hidden = !show;
        if (moreBtn instanceof HTMLButtonElement) {
          moreBtn.disabled = listLoading;
          moreBtn.textContent = listLoading
            ? L.loading || "…"
            : L.loadMore || "Cargar más";
        }
      };

      const refreshLive = () => {
        if (!(form instanceof HTMLFormElement)) return;
        const fd = new FormData(form);
        const usage = String(fd.get("usage") || "");
        const totalEl = root.querySelector("[data-lb-live-total]");
        const linesEl = root.querySelector("[data-lb-live-lines]");
        const hintEl = root.querySelector("[data-lb-live-hint]");
        if (!isLicenseUsageCode(usage)) {
          if (totalEl) totalEl.textContent = "—";
          if (linesEl) linesEl.innerHTML = "";
          if (hintEl) hintEl.textContent = L.select;
          return;
        }
        const exclusiveStrong = fd.get("exclusiveStrong") === "1";
        const buyoutHigh = fd.get("buyoutHigh") === "1";
        const q = calculateLicenseQuote({
          usage: usage as LicenseUsageCode,
          stems: fd.get("stems") === "1",
          editShort: fd.get("editShort") === "1",
          exclusive: fd.get("exclusive") === "1" || exclusiveStrong,
          exclusiveStrong,
          buyout: fd.get("buyout") === "1" || buyoutHigh,
          buyoutHigh,
          needSpecialReview: fd.get("needSpecialReview") === "1",
          specialNotes: String(fd.get("specialNotes") || ""),
          term: String(fd.get("term") || "2y") as
            | "single"
            | "2y"
            | "1y"
            | "project"
            | "custom",
          termPlus1y: fd.get("termPlus1y") === "1",
          removeFromCatalog: fd.get("removeFromCatalog") === "1",
          territoryExpand: fd.get("territoryExpand") === "1",
          moreComposition: fd.get("moreComposition") === "1",
        });
        if (q.mode === "instant" && q.total != null) {
          if (totalEl) totalEl.textContent = formatEur(q.total);
          if (hintEl) hintEl.textContent = "Precio de catálogo";
        } else {
          if (totalEl)
            totalEl.textContent =
              q.fromAmount != null ? `${L.from} ${formatEur(q.fromAmount)}` : L.review;
          if (hintEl) hintEl.textContent = "Revisión / a medida";
        }
        if (linesEl) {
          linesEl.innerHTML = q.lineItems
            .map(
              (l) =>
                `<li><span>${escapeHtml(l.label)}</span><strong>${formatEur(l.amount)}</strong></li>`,
            )
            .join("");
        }
      };

      const lockScroll = (on: boolean) => {
        document.body.style.overflow = on ? "hidden" : "";
      };

      const closeModal = () => {
        try {
          const u = new URL(window.location.href);
          if (u.searchParams.has("p")) {
            u.searchParams.delete("p");
            history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
          }
        } catch {
          /* ignore */
        }
        stopAll();
        active = null;
        if (overlay instanceof HTMLElement) overlay.hidden = true;
        lockScroll(false);
        renderGrid();
      };

      const renderGrid = () => {
        if (!grid) return;
        if (!catalogReady) {
          if (countEl) countEl.textContent = "…";
          grid.innerHTML = `<p class="lb__empty lb__empty--loading" role="status">${escapeHtml(L.loading || "…")}</p>`;
          updateLoadMore();
          return;
        }
        if (listError && !items.length) {
          if (countEl) countEl.textContent = "0";
          grid.innerHTML = `<p class="lb__empty" role="alert">${escapeHtml(L.loadError || L.empty)}</p>`;
          updateLoadMore();
          return;
        }
        const list = filtered();
        if (countEl) countEl.textContent = String(totalCount || list.length);
        if (!list.length) {
          grid.innerHTML = `<p class="lb__empty">${escapeHtml(L.empty)}</p>`;
          updateLoadMore();
          return;
        }

        grid.innerHTML = list
          .map((item) => {
            const id = safeDomId(item.id);
            const cover = safeMediaUrl(item.cover);
            // Grid: solo cover lazy (sin N× video preload). Vídeo se inyecta al play.
            const media = cover
              ? `<img src="${escapeHtml(cover)}" alt="" width="400" height="400" loading="lazy" decoding="async" fetchpriority="low" />`
              : `<div class="lb__ph" data-frame-ph="${escapeHtml(id)}"></div>`;
            const unavail = !isAvailable(item)
              ? `<span class="lb__badge lb__badge--sold">${escapeHtml(L.unavailable)}</span>`
              : "";
            const canLic = item.licenseEnabled !== false && isAvailable(item);
            const lic = canLic
              ? `<button type="button" class="lb__card-lic" data-open-lic="${escapeHtml(id)}">${escapeHtml(L.license)}</button>`
              : "";
            const share = `<button type="button" class="lb__card-share" data-share-item="${escapeHtml(id)}" aria-label="${escapeHtml(L.share || "Share")}">${escapeHtml(L.share || "Share")}</button>`;
            const canPlay = !!(
              item.hasPreview ||
              safeMediaUrl(item.preview) ||
              item.hasVideo ||
              safeMediaUrl(item.video)
            );
            const isPlayingHere = playingId === item.id || playingId === id;
            const playBtn = canPlay
              ? `<button type="button" class="lb__play-fab" data-thumb-play="${escapeHtml(id)}" aria-label="${escapeHtml(L.play)}" aria-pressed="${isPlayingHere ? "true" : "false"}">${isPlayingHere ? L.stop : "▶"}</button>`
              : "";
            const prog = canPlay
              ? `<div class="lb__thumb-progress" data-thumb-progress="${escapeHtml(id)}" ${isPlayingHere ? "" : "hidden"} style="--p:0%" role="slider" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100"></div>`
              : "";

            return `<article class="lb__card ${active && safeDomId(active.id) === id ? "is-on" : ""}" data-card="${escapeHtml(id)}">
              <div class="lb__thumb-wrap">
                <button type="button" class="lb__thumb" data-open="${escapeHtml(id)}" aria-label="${escapeHtml(item.title)}">
                  <span class="lb__frame" data-frame="${escapeHtml(id)}">${media}</span>
                  ${unavail}
                </button>
                ${playBtn}
                ${prog}
              </div>
              <div class="lb__cap">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${(item.moods || []).slice(0, 2).map(escapeHtml).join(" · ") || (item.tags || []).slice(0, 2).map(escapeHtml).join(" · ")}</span>
                <div class="lb__card-actions">${lic}${share}</div>
              </div>
            </article>`;
          })
          .join("");

        updateLoadMore();

        const findByDomId = (id: string) =>
          items.find((x) => safeDomId(x.id) === id || x.id === id);

        grid.querySelectorAll("[data-open]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = (btn as HTMLElement).dataset.open || "";
            const item = findByDomId(id);
            if (item) void openModal(item, false);
          });
        });

        grid.querySelectorAll("[data-open-lic]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.openLic || "";
            const item = findByDomId(id);
            if (item) void openModal(item, true);
          });
        });

        grid.querySelectorAll("[data-share-item]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.shareItem || "";
            const item = findByDomId(id);
            if (item) void shareLibraryItem(item, btn as HTMLElement);
          });
        });

        grid.querySelectorAll("[data-thumb-play]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.thumbPlay || "";
            const item = findByDomId(id);
            if (!item) return;

            if (playingId === id || (playingId === "modal-" + id && transportPlaying)) {
              previewPlayer.pause();
              if (gridVideo) gridVideo.pause();
              playingId = null;
              transportPlaying = false;
              resetPlayButtons();
              stopProgressLoop();
              updateProgressUI();
              return;
            }
            if (gridVideo) {
              gridVideo.pause();
              gridVideo = null;
            }

            setPlayLoading(id, "…");
            setPlayerStatus({
              msg: `Preparando «${item.title || "audio"}»…`,
              kind: "load",
              playPct: 4,
              bufPct: 0,
              time: "…",
            });

            void (async () => {
              try {
                let full = item;
                if (!safeMediaUrl(item.preview)) {
                  setPlayerStatus({
                    msg: `Cargando ficha «${item.title || ""}»…`,
                    kind: "load",
                    playPct: 8,
                    time: "…",
                  });
                  const d = await ensureDetail(item);
                  if (d) full = d;
                }
                const canPreview = !!safeMediaUrl(full.preview);
                const canVideo = !!(full.hasVideo || safeMediaUrl(full.video));
                if (!canPreview && !canVideo) {
                  setPlayerStatus({
                    msg: "Sin preview. En admin → 🎧 Previews (o re-publica la obra).",
                    kind: "err",
                    playPct: 0,
                  });
                  resetPlayButtons();
                  return;
                }
                const frame = grid.querySelector(`[data-frame="${CSS.escape(id)}"]`);
                const vUrl = safeMediaUrl(full.video);
                if (frame && vUrl && canPreview) {
                  let v = frame.querySelector<HTMLVideoElement>("video");
                  if (!v) {
                    frame.innerHTML = `<video src="${escapeHtml(vUrl)}" muted loop playsinline preload="none" poster="${escapeHtml(safeMediaUrl(full.cover) || "")}" data-vid="${escapeHtml(id)}"></video>`;
                    v = frame.querySelector<HTMLVideoElement>("video");
                  }
                  if (v) {
                    v.muted = true;
                    v.loop = true;
                    void v.play().catch(() => {});
                    gridVideo = v;
                  }
                }
                if (canPreview) {
                  await playPreviewOrStems(full, id);
                } else if (canVideo && frame && vUrl) {
                  frame.innerHTML = `<video src="${escapeHtml(vUrl)}" muted loop playsinline preload="metadata" poster="${escapeHtml(safeMediaUrl(full.cover) || "")}" data-vid="${escapeHtml(id)}"></video>`;
                  const v = frame.querySelector<HTMLVideoElement>("video");
                  if (v) void playVideoThumb(full, v);
                }
              } catch (err) {
                if ((err as Error)?.name === "AbortError") return;
                console.warn("[lb] thumb play", err);
                showStemError(
                  err instanceof Error ? err.message : "Error al reproducir",
                );
                resetPlayButtons();
              }
            })();
          });
        });

        // Barra gorda en miniatura: clic / arrastre = seek
        grid.querySelectorAll("[data-thumb-progress]").forEach((bar) => {
          if (!(bar instanceof HTMLElement)) return;
          const seekFromEvent = (clientX: number) => {
            const id = bar.dataset.thumbProgress || "";
            const activeHere =
              playingId === id ||
              playingId === "modal-" + id ||
              (gridVideo && playingId === id);
            if (!activeHere) return;
            const rect = bar.getBoundingClientRect();
            if (rect.width <= 0) return;
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            void seekToRatio(ratio);
          };
          bar.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            bar.setPointerCapture(e.pointerId);
            seeking = true;
            seekFromEvent(e.clientX);
          });
          bar.addEventListener("pointermove", (e) => {
            if (!bar.hasPointerCapture(e.pointerId)) return;
            e.preventDefault();
            seekFromEvent(e.clientX);
          });
          bar.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            if (bar.hasPointerCapture(e.pointerId)) {
              bar.releasePointerCapture(e.pointerId);
            }
            seeking = false;
            seekTargetSec = null;
            updateProgressUI();
          });
          bar.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
          });
        });
      };

      const shareTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

      const shareLibraryItem = async (item: Item, btn?: HTMLElement | null) => {
        const path = libraryItemSharePath(item.slug || item.id, lang);
        const url = absoluteShareUrl(path);
        const result = await shareUrl({
          url,
          title: item.title || "",
          text: item.description || item.title || "",
        });
        if (!btn || result === "cancelled") return;

        const base = L.share || "Share";
        const next =
          result === "shared" || result === "copied"
            ? L.shareCopied || base
            : L.shareFailed || base;
        btn.textContent = next;
        btn.setAttribute("aria-label", next);
        btn.classList.toggle("is-ok", result === "shared" || result === "copied");

        const prev = shareTimers.get(btn);
        if (prev) clearTimeout(prev);
        shareTimers.set(
          btn,
          setTimeout(() => {
            btn.textContent = base;
            btn.setAttribute("aria-label", base);
            btn.classList.remove("is-ok");
          }, 2200),
        );
      };

      const openModal = async (item: Item, focusLicense: boolean) => {
        stopAll();
        const full = (await ensureDetail(item)) || item;
        active = full;
        if (!(overlay instanceof HTMLElement)) return;
        overlay.hidden = false;
        lockScroll(true);

        // Use full for rest of modal
        item = full;

        // Deep-link en la barra de URL (compartible)
        try {
          const path = libraryItemSharePath(item.slug || item.id, lang);
          const next = new URL(path, window.location.origin);
          if (window.location.search !== next.search || !window.location.pathname.endsWith("/biblioteca/")) {
            history.replaceState(null, "", next.pathname + next.search);
          }
        } catch {
          /* ignore */
        }

        const set = (sel: string, v: string) => {
          const el = root.querySelector(sel);
          if (el) el.textContent = v;
        };
        const aspect = safeAspectLabel(item.aspect);
        // No mostrar tipo/aspecto ni badge provisional al visitante
        set("[data-lb-kicker]", "");
        set("[data-lb-title]", item.title || "");
        set("[data-lb-desc]", item.description || "—");
        set("[data-lb-notes]", item.notes || "—");

        const shareBtn = root.querySelector("[data-lb-share]");
        if (shareBtn instanceof HTMLElement) {
          shareBtn.hidden = false;
          shareBtn.textContent = L.share || "Share";
          shareBtn.setAttribute("aria-label", L.share || "Share");
          shareBtn.classList.remove("is-ok");
        }

        const prov = root.querySelector("[data-lb-prov]");
        if (prov instanceof HTMLElement) {
          prov.hidden = true;
          prov.textContent = "";
        }

        const media = root.querySelector("[data-lb-media]");
        if (media) {
          const frameClass =
            aspect === "9:16"
              ? "lb__panel-frame lb__panel-frame--916"
              : aspect === "1:1"
                ? "lb__panel-frame lb__panel-frame--11"
                : "lb__panel-frame lb__panel-frame--169";
          const v = safeMediaUrl(item.video);
          const c = safeMediaUrl(item.cover);
          if (v) {
            media.innerHTML = `<div class="${frameClass}"><video src="${escapeHtml(v)}" playsinline poster="${escapeHtml(c)}" data-modal-vid></video></div>`;
          } else if (c) {
            media.innerHTML = `<div class="${frameClass}"><img src="${escapeHtml(c)}" alt="" /></div>`;
          } else {
            media.innerHTML = `<div class="${frameClass}"><div class="lb__ph"></div></div>`;
          }
        }

        const fill = (sel: string, arr: string[]) => {
          const ul = root.querySelector(sel);
          if (!ul) return;
          ul.innerHTML = arr.length ? arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("") : "<li>—</li>";
        };
        // Unificado: moods + tags legacy del ítem (sin sección Tags aparte)
        const moodBag = [
          ...new Set([...(item.moods || []), ...(item.tags || [])].map(String).filter(Boolean)),
        ];
        fill("[data-lb-mood-pills]", moodBag);

        // Valoraciones mock dentro del modal (junto al player)
        paintItemReviews(item);

        // Stems HQ no se escuchan en biblioteca (solo flag de licencia + preview mix)
        const stemsWrap = root.querySelector("[data-lb-stems-wrap]");
        const mixer = root.querySelector("[data-lb-mixer]");
        const hasStems = Boolean(item.hasStems);
        const stemCount = Number(item.stemCount || 0);
        if (stemsWrap instanceof HTMLElement) stemsWrap.hidden = !hasStems;
        if (mixer instanceof HTMLElement) {
          mixer.innerHTML = hasStems
            ? `<p class="lb__mix-hint">Esta obra incluye <strong>stems de entrega</strong>${
                stemCount > 0 ? ` (${stemCount})` : ""
              } con la licencia. En la web solo se reproduce el <strong>preview</strong> (mix ligero).</p>`
            : "";
        }

        const licWrap = root.querySelector("[data-lb-lic-wrap]");
        const noLic = root.querySelector("[data-lb-no-lic]");
        const ok = item.licenseEnabled !== false && isAvailable(item);
        if (licWrap instanceof HTMLElement) licWrap.hidden = !ok;
        if (noLic instanceof HTMLElement) {
          noLic.hidden = ok;
          if (!ok) noLic.textContent = isAvailable(item) ? L.noLicense || "" : L.unavailable;
        }

        // Checkout música (Stripe) — listo solo con master + price_…
        const buyBox = root.querySelector("[data-lb-buy]");
        const buySoon = root.querySelector("[data-lb-buy-soon]");
        const buyPrice = root.querySelector("[data-lb-buy-price]");
        const canPay = Boolean(ok && item.checkoutReady && item.hasMaster);
        if (buyBox instanceof HTMLElement) buyBox.hidden = !canPay;
        if (buySoon instanceof HTMLElement) {
          buySoon.hidden = !ok || canPay || !item.hasMaster;
        }
        if (buyPrice && canPay) {
          const eur =
            item.priceEur != null && Number(item.priceEur) > 0
              ? `${Math.round(Number(item.priceEur))} €`
              : "";
          buyPrice.textContent = eur
            ? `Licencia master${item.hasStems ? " (+ stems)" : ""} · desde ${eur}`
            : `Licencia master${item.hasStems ? " + stems" : ""} · pago seguro Stripe`;
        }
        const buyMsg = root.querySelector("[data-lb-buy-msg]");
        if (buyMsg instanceof HTMLElement) {
          buyMsg.hidden = true;
          buyMsg.textContent = "";
        }

        if (form instanceof HTMLFormElement) {
          (form.elements.namedItem("workSlug") as HTMLInputElement).value = item.slug;
          (form.elements.namedItem("workName") as HTMLInputElement).value = item.title;
          const stemsCb = form.elements.namedItem("stems") as HTMLInputElement | null;
          if (stemsCb) stemsCb.checked = hasStems;
          const usageSel = form.elements.namedItem("usage") as HTMLSelectElement | null;
          if (usageSel) usageSel.value = "brand_video";
          const termSel = form.elements.namedItem("term") as HTMLSelectElement | null;
          if (termSel && !termSel.value) termSel.value = "2y";
          (
            root as HTMLElement & { __syncUsage?: () => void }
          ).__syncUsage?.();
          const msg = root.querySelector("[data-lb-msg]");
          if (msg instanceof HTMLElement) msg.hidden = true;
          refreshLive();
        }

        renderGrid();

        if (focusLicense) {
          requestAnimationFrame(() => {
            (form?.querySelector("[name=name]") as HTMLInputElement | null)?.focus();
          });
        }
      };

      root.querySelector("[data-lb-close]")?.addEventListener("click", closeModal);
      root.querySelector("[data-lb-share]")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!active) return;
        void shareLibraryItem(active, e.currentTarget as HTMLElement);
      });
      overlay?.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay instanceof HTMLElement && !overlay.hidden) {
          closeModal();
        }
      });

      root.querySelector("[data-lb-preview-play]")?.addEventListener("click", () => {
        if (!active) return;
        const modalPlayId = "modal-" + active.id;
        if (playingId === modalPlayId || playingId === active.id || transportPlaying) {
          previewPlayer.pause();
          const mv = root.querySelector<HTMLVideoElement>("[data-modal-vid]");
          if (mv) mv.pause();
          if (gridVideo) gridVideo.pause();
          playingId = null;
          transportPlaying = false;
          resetPlayButtons();
          stopProgressLoop();
          updateProgressUI();
          return;
        }
        void (async () => {
          let full = active!;
          if (!safeMediaUrl(full.preview)) {
            const d = await ensureDetail(full);
            if (d) {
              full = d;
              active = d;
            }
          }
          await playPreviewOrStems(full, modalPlayId);
          if (!safeMediaUrl(full.preview)) {
            const v = root.querySelector<HTMLVideoElement>("[data-modal-vid]");
            if (v) {
              v.play()
                .then(() => {
                  playingId = modalPlayId;
                  transportPlaying = true;
                  markPlayingButtons(active!.id);
                  startProgressLoop();
                })
                .catch(() => {});
            }
          }
        })();
      });

      const seekInput = root.querySelector<HTMLInputElement>("[data-lb-seek]");
      let seekDragging = false;

      const previewSeekUi = (ratio: number) => {
        const dur = mediaDuration();
        if (!(dur > 0) || !seekInput) return;
        seeking = true;
        seekTargetSec = Math.max(0, Math.min(1, ratio)) * dur;
        seekInput.value = String(Math.round(Math.max(0, Math.min(1, ratio)) * 1000));
        const timeEl = root.querySelector("[data-lb-time]");
        if (timeEl) {
          timeEl.textContent = `${fmtTime(seekTargetSec)} / ${fmtTime(dur)}`;
        }
      };

      const commitSeekFromInput = async () => {
        if (!seekInput) return;
        const ratio = Number(seekInput.value) / 1000;
        seekDragging = false;
        await seekToRatio(ratio);
      };

      // Durante el arrastre: solo UI (no martillar 6× WAV con seek cada frame)
      seekInput?.addEventListener("pointerdown", () => {
        seekDragging = true;
        seeking = true;
      });
      seekInput?.addEventListener("mousedown", () => {
        seekDragging = true;
        seeking = true;
      });
      seekInput?.addEventListener(
        "touchstart",
        () => {
          seekDragging = true;
          seeking = true;
        },
        { passive: true },
      );
      seekInput?.addEventListener("input", () => {
        if (!seekInput) return;
        seeking = true;
        seekDragging = true;
        previewSeekUi(Number(seekInput.value) / 1000);
      });
      // Al soltar / change: seek real pause→set→play
      seekInput?.addEventListener("change", () => {
        void commitSeekFromInput();
      });
      seekInput?.addEventListener("pointerup", () => {
        if (seekDragging) void commitSeekFromInput();
      });
      seekInput?.addEventListener("mouseup", () => {
        if (seekDragging) void commitSeekFromInput();
      });
      seekInput?.addEventListener("touchend", () => {
        if (seekDragging) void commitSeekFromInput();
      });
      document.addEventListener("pointerup", () => {
        if (seekDragging) void commitSeekFromInput();
      });

      root.querySelectorAll("[data-type]").forEach((btn) => {
        btn.addEventListener("click", () => {
          typeFilter = (btn as HTMLElement).dataset.type || "all";
          root.querySelectorAll("[data-type]").forEach((b) => b.classList.remove("is-on"));
          btn.classList.add("is-on");
          void fetchList({ reset: true });
        });
      });

      // moods/tags: se re-pintan en paintFilters()

      // Desplegables uso + plazo (móvil): cerrados por defecto, lista densa al abrir
      type Dd = {
        sel: HTMLSelectElement | null;
        wrap: HTMLElement | null;
        trigger: HTMLButtonElement | null;
        panel: HTMLElement | null;
        valueEl: HTMLElement | null;
        priceEl: HTMLElement | null;
        optionSel: string;
        placeholder: string;
      };

      const wireDropdown = (dd: Dd, onPick?: () => void) => {
        const setOpen = (open: boolean) => {
          dd.wrap?.classList.toggle("is-open", open);
          dd.trigger?.setAttribute("aria-expanded", open ? "true" : "false");
          if (dd.panel) {
            if (open) dd.panel.removeAttribute("hidden");
            else dd.panel.setAttribute("hidden", "");
          }
        };

        const sync = () => {
          const val = dd.sel?.value || "";
          root.querySelectorAll<HTMLElement>(dd.optionSel).forEach((btn) => {
            const on = btn.dataset.value === val && val !== "";
            btn.classList.toggle("is-on", on);
            btn.setAttribute("aria-selected", on ? "true" : "false");
          });
          const onBtn =
            val &&
            root.querySelector<HTMLElement>(
              `${dd.optionSel}[data-value="${CSS.escape(val)}"]`,
            );
          if (dd.valueEl) {
            if (onBtn) {
              dd.valueEl.textContent = onBtn.dataset.title || "";
              const price = onBtn.dataset.price || "";
              if (dd.priceEl) {
                if (price) {
                  dd.priceEl.textContent = price;
                  dd.priceEl.hidden = false;
                  dd.priceEl.removeAttribute("hidden");
                } else {
                  dd.priceEl.textContent = "";
                  dd.priceEl.hidden = true;
                  dd.priceEl.setAttribute("hidden", "");
                }
              }
            } else {
              dd.valueEl.textContent = dd.placeholder;
              if (dd.priceEl) {
                dd.priceEl.textContent = "";
                dd.priceEl.hidden = true;
                dd.priceEl.setAttribute("hidden", "");
              }
            }
          }
        };

        dd.trigger?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Cerrar el otro desplegable si estaba abierto
          root.querySelectorAll<HTMLElement>(".lb__usage.is-open, .lb__term.is-open").forEach((el) => {
            if (el !== dd.wrap) {
              el.classList.remove("is-open");
              const p = el.querySelector<HTMLElement>("[data-lb-usage-list], [data-lb-term-list]");
              if (p) p.setAttribute("hidden", "");
              el.querySelector("[data-lb-usage-trigger], [data-lb-term-trigger]")?.setAttribute(
                "aria-expanded",
                "false",
              );
            }
          });
          setOpen(!dd.wrap?.classList.contains("is-open"));
        });

        root.querySelectorAll<HTMLButtonElement>(dd.optionSel).forEach((btn) => {
          btn.addEventListener("click", () => {
            if (!dd.sel) return;
            dd.sel.value = btn.dataset.value || "";
            dd.sel.dispatchEvent(new Event("change", { bubbles: true }));
            sync();
            setOpen(false);
            onPick?.();
          });
        });

        dd.sel?.addEventListener("change", sync);

        document.addEventListener("click", (e) => {
          if (!dd.wrap || !dd.wrap.classList.contains("is-open")) return;
          const t = e.target;
          if (t instanceof Node && dd.wrap.contains(t)) return;
          setOpen(false);
        });

        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") setOpen(false);
        });

        sync();
        return { setOpen, sync };
      };

      const usageDdApi = wireDropdown({
        sel: form?.elements.namedItem("usage") as HTMLSelectElement | null,
        wrap: root.querySelector<HTMLElement>("[data-lb-usage-dd]"),
        trigger: root.querySelector<HTMLButtonElement>("[data-lb-usage-trigger]"),
        panel: root.querySelector<HTMLElement>("[data-lb-usage-list]"),
        valueEl: root.querySelector<HTMLElement>("[data-lb-usage-value]"),
        priceEl: root.querySelector<HTMLElement>("[data-lb-usage-price]"),
        optionSel: "[data-lb-usage-option]",
        placeholder:
          root.querySelector<HTMLElement>("[data-lb-usage-value]")?.textContent?.trim() || "…",
      });

      const termDdApi = wireDropdown({
        sel: form?.elements.namedItem("term") as HTMLSelectElement | null,
        wrap: root.querySelector<HTMLElement>("[data-lb-term-dd]"),
        trigger: root.querySelector<HTMLButtonElement>("[data-lb-term-trigger]"),
        panel: root.querySelector<HTMLElement>("[data-lb-term-list]"),
        valueEl: root.querySelector<HTMLElement>("[data-lb-term-value]"),
        priceEl: root.querySelector<HTMLElement>("[data-lb-term-price]"),
        optionSel: "[data-lb-term-option]",
        placeholder:
          root.querySelector<HTMLElement>("[data-lb-term-value]")?.textContent?.trim() || "…",
      });

      // Exponer sync para openModal
      (root as HTMLElement & { __syncUsage?: () => void; __closeUsage?: () => void }).__syncUsage =
        () => {
          usageDdApi.sync();
          usageDdApi.setOpen(false);
          termDdApi.sync();
          termDdApi.setOpen(false);
        };

      form?.addEventListener("change", refreshLive);
      form?.addEventListener("input", refreshLive);

      root.querySelector("[data-lb-checkout]")?.addEventListener("click", () => {
        void (async () => {
          if (!active) return;
          const btn = root.querySelector("[data-lb-checkout]");
          const msg = root.querySelector("[data-lb-buy-msg]");
          const emailEl = root.querySelector("[data-lb-buy-email]") as HTMLInputElement | null;
          const email = String(emailEl?.value || "").trim().toLowerCase();
          if (btn instanceof HTMLButtonElement) btn.disabled = true;
          if (msg instanceof HTMLElement) {
            msg.hidden = false;
            msg.textContent = "Abriendo Stripe…";
          }
          try {
            const res = await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: "music",
                workSlug: active.slug,
                package: active.hasStems ? "master_stems" : "master",
                email: email || undefined,
              }),
            });
            const data = (await res.json()) as {
              ok?: boolean;
              url?: string;
              error?: string;
              message?: string;
            };
            if (!res.ok || !data.ok || !data.url) {
              throw new Error(
                data.message ||
                  data.error ||
                  (data.error === "no_stripe_price"
                    ? "Falta price_… en la ficha (admin)."
                    : `Error ${res.status}`),
              );
            }
            window.location.href = data.url;
          } catch (err) {
            if (msg instanceof HTMLElement) {
              msg.hidden = false;
              msg.textContent =
                err instanceof Error ? err.message : "No se pudo abrir el pago";
            }
          } finally {
            if (btn instanceof HTMLButtonElement) btn.disabled = false;
          }
        })();
      });

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!(form instanceof HTMLFormElement) || !active) return;
        const fd = new FormData(form);
        const msg = root.querySelector("[data-lb-msg]");
        const usage = String(fd.get("usage") || "");
        if (!isLicenseUsageCode(usage)) return;

        const turnstileToken =
          String(fd.get("cf-turnstile-response") || "") ||
          (typeof (window as unknown as { turnstile?: { getResponse?: (el?: Element) => string } })
            .turnstile?.getResponse === "function"
            ? (window as unknown as { turnstile: { getResponse: (el?: Element) => string } }).turnstile.getResponse(
                root.querySelector(".cf-turnstile") || undefined,
              )
            : "") ||
          "";

        try {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: String(fd.get("name") || ""),
              email: String(fd.get("email") || ""),
              company: String(fd.get("company") || "").trim(),
              workName: String(fd.get("workName") || active.title),
              workSlug: String(fd.get("workSlug") || active.slug),
              lang,
              usage,
              territory: String(fd.get("territory") || ""),
              term: String(fd.get("term") || "2y"),
              project: String(fd.get("project") || ""),
              stems: fd.get("stems") === "1",
              editShort: fd.get("editShort") === "1",
              exclusive: fd.get("exclusive") === "1" || fd.get("exclusiveStrong") === "1",
              exclusiveStrong: fd.get("exclusiveStrong") === "1",
              buyout: fd.get("buyout") === "1" || fd.get("buyoutHigh") === "1",
              buyoutHigh: fd.get("buyoutHigh") === "1",
              needSpecialReview: fd.get("needSpecialReview") === "1",
              specialNotes: String(fd.get("specialNotes") || ""),
              termPlus1y: fd.get("termPlus1y") === "1",
              removeFromCatalog: fd.get("removeFromCatalog") === "1",
              territoryExpand: fd.get("territoryExpand") === "1",
              moreComposition: fd.get("moreComposition") === "1",
              turnstileToken: turnstileToken || undefined,
            }),
          });
          const json = await res.json();
          if (msg instanceof HTMLElement) {
            msg.hidden = false;
            if (!json.ok) {
              msg.textContent =
                json.error === "turnstile_required" || json.error === "turnstile_failed"
                  ? "Completa la verificación anti-bots"
                  : json.error === "rate_limited"
                    ? "Demasiadas solicitudes. Prueba más tarde."
                    : "Error al enviar";
            } else {
              msg.textContent =
                json.quote?.total != null
                  ? `Presupuesto: ${json.quote.total} € · Enviado al estudio`
                  : "Solicitud enviada al estudio";
            }
          }
          if (json.ok) {
            setTimeout(() => closeModal(), 1600);
          }
        } catch {
          if (msg instanceof HTMLElement) {
            msg.hidden = false;
            msg.textContent = "Error de red";
          }
        }
      });

      const ensureDetail = async (card: Item): Promise<Item | null> => {
        const full = await fetchLibraryDetail(card, detailCache);
        if (!full) return null;
        const idx = items.findIndex(
          (x) =>
            x.slug === full.slug ||
            x.id === full.id ||
            safeDomId(x.id) === safeDomId(full.id),
        );
        if (idx >= 0) {
          items[idx] = {
            ...items[idx],
            ...full,
            hasStems: full.hasStems,
            hasVideo: full.hasVideo,
            hasPreview: full.hasPreview,
            hasMaster: full.hasMaster,
            checkoutReady: full.checkoutReady,
            priceEur: full.priceEur,
            stripePriceId: full.stripePriceId,
            preview: full.preview,
          };
        }
        return full;
      };

      const fetchList = async (opts: { reset: boolean }) => {
        const gen = ++listFetchGen;
        if (opts.reset) {
          nextCursor = null;
          hasMore = false;
          totalCount = 0;
          items = [];
          listError = false;
          catalogReady = false;
          previewPlayer.dispose();
          stopAll();
          renderGrid();
        }
        if (listLoading && !opts.reset) return;
        listLoading = true;
        updateLoadMore();

        try {
          const live = await fetchLibraryList({
            limit: 24,
            cursor: opts.reset ? null : nextCursor,
            mood: moodFilter,
            type: typeFilter,
          });
          if (gen !== listFetchGen) return;
          listError = false;
          if (live.moods.length) serverMoods = live.moods;
          if (opts.reset) {
            items = live.items;
          } else {
            const seen = new Set(items.map((i) => itemKey(i) || i.id));
            for (const m of live.items) {
              const k = itemKey(m) || m.id;
              if (k && seen.has(k)) continue;
              if (k) seen.add(k);
              items.push(m);
            }
          }
          nextCursor = live.nextCursor;
          hasMore = live.hasMore;
          totalCount = live.count;
        } catch {
          if (gen !== listFetchGen) return;
          if (opts.reset || !items.length) listError = true;
        }

        if (gen !== listFetchGen) return;
        listLoading = false;
        catalogReady = true;
        collectFilters(items);
        filtersPaintGen += 1;
        await paintFilters();
        renderGrid();
        updateLoadMore();
      };

      // Load more
      if (moreBtn instanceof HTMLElement && moreBtn.dataset.bound !== "1") {
        moreBtn.dataset.bound = "1";
        moreBtn.addEventListener("click", () => {
          if (!hasMore || listLoading) return;
          void fetchList({ reset: false });
        });
      }

      // Loading hasta primera página de /api/library
      renderGrid();
      void (async () => {
        await fetchList({ reset: true });

        // Deep-link: /biblioteca/?p=slug → detail-first (sin dump)
        try {
          const p = new URL(window.location.href).searchParams.get("p")?.trim();
          if (!p) return;
          const match = items.find(
            (x) => x.slug === p || x.id === p || safeDomId(x.id) === safeDomId(p),
          );
          if (match) {
            void openModal(match, false);
            return;
          }
          // No está en la primera página: abrir solo con detail
          const stub: Item = {
            id: safeDomId(p),
            slug: p,
            title: p,
            kind: "stems",
            aspect: "1:1",
            tags: [],
            moods: [],
          };
          void openModal(stub, false);
        } catch {
          /* ignore */
        }
      })();
    });
  }

  document.addEventListener("DOMContentLoaded", bindLibraryBrowser);
  document.addEventListener("astro:page-load", bindLibraryBrowser);


