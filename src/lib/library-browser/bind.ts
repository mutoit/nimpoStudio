import {
    calculateLicenseQuote,
    formatEur,
    isLicenseUsageCode,
    type LicenseUsageCode,
  } from "../license-quote";
import { StemTransport } from "../stem-transport";
import { escapeHtml, safeMediaUrl } from "../dom-escape";

type Stem = { id: string; label: string; src: string };
type Item = {
    id: string;
    slug: string;
    title: string;
    kind: string;
    aspect: string;
    cover?: string | null;
    video?: string | null;
    stems?: Stem[];
    tags: string[];
    moods: string[];
    description?: string;
    notes?: string;
    provisional?: boolean;
    licenseEnabled?: boolean;
    availability?: string;
  };

export function bindLibraryBrowser() {
    document.querySelectorAll("[data-library-root]").forEach((root) => {
      if (!(root instanceof HTMLElement) || root.dataset.bound === "1") return;
      root.dataset.bound = "1";

      const data = JSON.parse(root.dataset.payload || "{}") as {
        items: Item[];
        lang: string;
        moods: string[];
        labels: Record<string, string>;
      };
      const { items, lang, moods, labels: L } = data;

      const grid = root.querySelector("[data-lb-grid]");
      const overlay = root.querySelector("[data-lb-overlay]");
      const form = root.querySelector("[data-lb-form]");
      const countEl = root.querySelector("[data-lb-count]");
      const moodsBar = root.querySelector("[data-lb-moods]");

      if (moodsBar) {
        moodsBar.innerHTML = moods
          .map((m) => `<button type="button" class="lb__chip" data-mood="${m}">${m}</button>`)
          .join("");
      }

      let typeFilter = "all";
      let moodFilter: string | null = null;
      let active: Item | null = null;
      /** Web Audio multi-stem (seek real; CF no soporta Range en static) */
      const stemsTx = new StemTransport();
      let gridVideo: HTMLVideoElement | null = null;
      let playingId: string | null = null;
      let transportPlaying = false;
      let progressRaf = 0;
      let seeking = false;
      let seekTargetSec: number | null = null;
      let loadingStems = false;

      const fmtTime = (sec: number) => {
        if (!Number.isFinite(sec) || sec < 0) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
      };

      const mediaDuration = (): number => {
        if (stemsTx.duration > 0) return stemsTx.duration;
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
        if (stemsTx.loadedItemId) return stemsTx.currentTime;
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
          const match =
            id === playingId ||
            (playingId?.startsWith("modal-") && playingId === "modal-" + id);
          if (match && transportPlaying && dur > 0) {
            bar.hidden = false;
            bar.style.setProperty("--p", `${Math.min(100, (cur / dur) * 100)}%`);
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
          if (transportPlaying || stemsTx.isPlaying || (gridVideo && !gridVideo.paused)) {
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
        stopProgressLoop();
        seeking = false;
        seekTargetSec = null;
        transportPlaying = false;
        stemsTx.stop();
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

      const normSrc = (s: string) => {
        try {
          return decodeURIComponent(s).replace(/\\/g, "/");
        } catch {
          return s.replace(/\\/g, "/");
        }
      };

      const applyStemMixFromUi = () => {
        const modalOpen =
          overlay instanceof HTMLElement &&
          !overlay.hidden &&
          !!active &&
          stemsTx.loadedItemId === active.id;
        if (!modalOpen) {
          stemsTx.applyMix(null);
          return;
        }
        const checks = root.querySelectorAll<HTMLInputElement>("[data-stem-src]");
        const on = new Set(
          [...checks]
            .filter((c) => c.checked)
            .map((c) => normSrc(c.dataset.stemSrc || ""))
            .filter(Boolean),
        );
        stemsTx.applyMix(on.size ? on : null);
      };

      const playStems = async (item: Item, playId: string) => {
        if (!item.stems?.length || loadingStems) return;
        loadingStems = true;
        try {
          await stemsTx.resumeCtx();
          if (gridVideo) {
            gridVideo.pause();
            gridVideo = null;
          }
          await stemsTx.load(item.id, item.stems);
          applyStemMixFromUi();
          stemsTx.play();
          playingId = playId;
          transportPlaying = true;
          markPlayingButtons(playId);
          startProgressLoop();
          updateProgressUI();
        } catch (e) {
          console.warn("[lb] stems load/play fail", e);
        } finally {
          loadingStems = false;
        }
      };

      const onStemMixChange = () => {
        applyStemMixFromUi();
      };

      const seekToRatio = async (ratio: number): Promise<boolean> => {
        const dur = mediaDuration();
        if (!(dur > 0)) return false;
        const t = Math.max(0, Math.min(ratio, 1)) * dur;
        seekTargetSec = t;
        seeking = true;

        if (stemsTx.loadedItemId) {
          stemsTx.seek(t);
          if (transportPlaying || stemsTx.isPlaying) {
            transportPlaying = true;
            startProgressLoop();
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
        stemsTx.pause();
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

      const isProv = (i: Item) => i.provisional !== false && i.slug !== "deep-in-the-forest";
      const isAvailable = (i: Item) =>
        !i.availability || i.availability === "available";

      const filtered = () =>
        items.filter((i) => {
          if (i.availability === "off_catalog") return false;
          if (typeFilter === "stems") {
            if (!(i.kind === "stems" || (i.stems && i.stems.length))) return false;
          } else if (typeFilter === "1:1" || typeFilter === "9:16") {
            if (i.aspect !== typeFilter) return false;
          }
          if (moodFilter && !i.moods.includes(moodFilter)) return false;
          return true;
        });

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
        const q = calculateLicenseQuote({
          usage: usage as LicenseUsageCode,
          stems: fd.get("stems") === "1",
          editShort: fd.get("editShort") === "1",
          exclusive: fd.get("exclusive") === "1",
          buyout: fd.get("buyout") === "1",
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
            .map((l) => `<li>${escapeHtml(l.label)}: <strong>${formatEur(l.amount)}</strong></li>`)
            .join("");
        }
      };

      const lockScroll = (on: boolean) => {
        document.body.style.overflow = on ? "hidden" : "";
      };

      const closeModal = () => {
        stopAll();
        active = null;
        if (overlay instanceof HTMLElement) overlay.hidden = true;
        lockScroll(false);
        renderGrid();
      };

      const renderGrid = () => {
        if (!grid) return;
        const list = filtered();
        if (countEl) countEl.textContent = String(list.length);
        if (!list.length) {
          grid.innerHTML = `<p class="lb__empty">${escapeHtml(L.empty)}</p>`;
          return;
        }

        grid.innerHTML = list
          .map((item) => {
            const media = safeMediaUrl(item.video)
              ? `<video src="${safeMediaUrl(item.video)}" muted loop playsinline preload="metadata" poster="${safeMediaUrl(item.cover) || ""}" data-vid="${item.id}"></video>`
              : item.cover
                ? `<img src="${safeMediaUrl(item.cover)}" alt="" loading="lazy" />`
                : `<div class="lb__ph"></div>`;
            const prov = isProv(item) ? `<span class="lb__badge">${escapeHtml(L.provisional)}</span>` : "";
            const stemBadge =
              item.stems && item.stems.length
                ? `<span class="lb__badge lb__badge--stem">STEMS</span>`
                : "";
            const unavail = !isAvailable(item)
              ? `<span class="lb__badge lb__badge--sold">${escapeHtml(L.unavailable)}</span>`
              : "";
            const canLic = item.licenseEnabled !== false && isAvailable(item);
            const lic = canLic
              ? `<button type="button" class="lb__card-lic" data-open-lic="${item.id}">${escapeHtml(L.license)}</button>`
              : "";
            const canPlay = !!(item.stems?.length || safeMediaUrl(item.video));
            const isPlayingHere = playingId === item.id;
            const playBtn = canPlay
              ? `<button type="button" class="lb__play-fab" data-thumb-play="${item.id}" aria-label="${escapeHtml(L.play)}" aria-pressed="${isPlayingHere ? "true" : "false"}">${isPlayingHere ? L.stop : "▶"}</button>`
              : "";
            const prog = canPlay
              ? `<div class="lb__thumb-progress" data-thumb-progress="${item.id}" ${isPlayingHere ? "" : "hidden"} style="--p:0%" role="slider" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100"></div>`
              : "";

            return `<article class="lb__card ${active?.id === item.id ? "is-on" : ""}" data-card="${item.id}">
              <div class="lb__thumb-wrap">
                <button type="button" class="lb__thumb" data-open="${item.id}" aria-label="${escapeHtml(item.title)}">
                  <span class="lb__frame">${media}</span>
                  ${prov}${stemBadge}${unavail}
                  <span class="lb__ratio">${item.aspect}</span>
                </button>
                ${playBtn}
                ${prog}
              </div>
              <div class="lb__cap">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${item.moods.slice(0, 2).map(escapeHtml).join(" · ") || item.tags.slice(0, 2).map(escapeHtml).join(" · ")}</span>
                ${lic}
              </div>
            </article>`;
          })
          .join("");

        grid.querySelectorAll("[data-open]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = (btn as HTMLElement).dataset.open || "";
            const item = items.find((x) => x.id === id);
            if (item) openModal(item, false);
          });
        });

        grid.querySelectorAll("[data-open-lic]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.openLic || "";
            const item = items.find((x) => x.id === id);
            if (item) openModal(item, true);
          });
        });

        grid.querySelectorAll("[data-thumb-play]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.thumbPlay || "";
            const item = items.find((x) => x.id === id);
            if (!item) return;

            if (playingId === id || (playingId === "modal-" + id && transportPlaying)) {
              // soft stop: deja posición en stemsTx
              stemsTx.pause();
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
            // Preferir stems (audio real); vídeo solo si no hay stems
            if (item.stems?.length) {
              void playStems(item, id);
            } else if (safeMediaUrl(item.video)) {
              const v = grid.querySelector<HTMLVideoElement>(`[data-vid="${CSS.escape(id)}"]`);
              if (v) void playVideoThumb(item, v);
            }
          });
        });

        // Barra gorda en miniatura: clic / arrastre = seek
        grid.querySelectorAll("[data-thumb-progress]").forEach((bar) => {
          if (!(bar instanceof HTMLElement)) return;
          const seekFromEvent = (clientX: number) => {
            const id = bar.dataset.thumbProgress || "";
            const activeHere =
              stemsTx.loadedItemId === id ||
              playingId === id ||
              playingId === "modal-" + id ||
              (gridVideo && playingId === id);
            if (!activeHere) return;
            const rect = bar.getBoundingClientRect();
            if (rect.width <= 0) return;
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            // Si estaba en play, seek reanuda; si no, deja posición
            if (!transportPlaying && stemsTx.loadedItemId === id) {
              stemsTx.seek(ratio * (mediaDuration() || 0));
              updateProgressUI();
              return;
            }
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

      const openModal = (item: Item, focusLicense: boolean) => {
        stopAll();
        active = item;
        if (!(overlay instanceof HTMLElement)) return;
        overlay.hidden = false;
        lockScroll(true);

        const set = (sel: string, v: string) => {
          const el = root.querySelector(sel);
          if (el) el.textContent = v;
        };
        set("[data-lb-kicker]", `${item.kind} · ${item.aspect}`);
        set("[data-lb-title]", item.title);
        set("[data-lb-desc]", item.description || "—");
        set("[data-lb-notes]", item.notes || "—");

        const prov = root.querySelector("[data-lb-prov]");
        if (prov instanceof HTMLElement) {
          prov.hidden = !isProv(item);
          prov.textContent = L.provisional;
        }

        const media = root.querySelector("[data-lb-media]");
        if (media) {
          const frameClass =
            item.aspect === "9:16"
              ? "lb__panel-frame lb__panel-frame--916"
              : item.aspect === "1:1"
                ? "lb__panel-frame lb__panel-frame--11"
                : "lb__panel-frame lb__panel-frame--169";
          if (safeMediaUrl(item.video)) {
            media.innerHTML = `<div class="${frameClass}"><video src="${safeMediaUrl(item.video)}" playsinline poster="${safeMediaUrl(item.cover) || ""}" data-modal-vid></video></div>`;
          } else if (item.cover) {
            media.innerHTML = `<div class="${frameClass}"><img src="${safeMediaUrl(item.cover)}" alt="" /></div>`;
          } else {
            media.innerHTML = `<div class="${frameClass}"><div class="lb__ph"></div></div>`;
          }
        }

        const fill = (sel: string, arr: string[]) => {
          const ul = root.querySelector(sel);
          if (!ul) return;
          ul.innerHTML = arr.length ? arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("") : "<li>—</li>";
        };
        fill("[data-lb-mood-pills]", item.moods || []);
        fill("[data-lb-tag-pills]", item.tags || []);

        const stemsWrap = root.querySelector("[data-lb-stems-wrap]");
        const mixer = root.querySelector("[data-lb-mixer]");
        const hasStems = !!(item.stems && item.stems.length);
        if (stemsWrap instanceof HTMLElement) stemsWrap.hidden = !hasStems;
        if (mixer && hasStems && item.stems) {
          mixer.innerHTML = item.stems
            .map(
              (s) =>
                `<label class="lb__mix-row"><input type="checkbox" checked data-stem-src="${safeMediaUrl(s.src)}" /> ${escapeHtml(s.label)}</label>`,
            )
            .join("");
        }

        const licWrap = root.querySelector("[data-lb-lic-wrap]");
        const noLic = root.querySelector("[data-lb-no-lic]");
        const ok = item.licenseEnabled !== false && isAvailable(item);
        if (licWrap instanceof HTMLElement) licWrap.hidden = !ok;
        if (noLic instanceof HTMLElement) {
          noLic.hidden = ok;
          if (!ok) noLic.textContent = isAvailable(item) ? L.noLicense || "" : L.unavailable;
        }

        if (form instanceof HTMLFormElement) {
          (form.elements.namedItem("workSlug") as HTMLInputElement).value = item.slug;
          (form.elements.namedItem("workName") as HTMLInputElement).value = item.title;
          const stemsCb = form.elements.namedItem("stems") as HTMLInputElement | null;
          if (stemsCb) stemsCb.checked = hasStems;
          const usageSel = form.elements.namedItem("usage") as HTMLSelectElement | null;
          if (usageSel) usageSel.value = "brand_video";
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
          stemsTx.pause();
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
        if (active.stems?.length) {
          if (gridVideo) {
            gridVideo.pause();
            gridVideo = null;
          }
          void playStems(active, modalPlayId);
        } else {
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
      });

      // Checkboxes del mixer: mute sin reiniciar
      root.addEventListener("change", (e) => {
        const t = e.target;
        if (t instanceof HTMLInputElement && t.hasAttribute("data-stem-src")) {
          onStemMixChange();
        }
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
          renderGrid();
        });
      });

      root.querySelectorAll("[data-mood]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const m = (btn as HTMLElement).dataset.mood || null;
          moodFilter = moodFilter === m ? null : m;
          root.querySelectorAll("[data-mood]").forEach((b) => {
            b.classList.toggle("is-on", (b as HTMLElement).dataset.mood === moodFilter);
          });
          renderGrid();
        });
      });

      form?.addEventListener("change", refreshLive);
      form?.addEventListener("input", refreshLive);

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!(form instanceof HTMLFormElement) || !active) return;
        const fd = new FormData(form);
        const msg = root.querySelector("[data-lb-msg]");
        const usage = String(fd.get("usage") || "");
        if (!isLicenseUsageCode(usage)) return;

        try {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: String(fd.get("name") || ""),
              email: String(fd.get("email") || ""),
              workName: String(fd.get("workName") || active.title),
              workSlug: String(fd.get("workSlug") || active.slug),
              lang,
              usage,
              territory: String(fd.get("territory") || ""),
              term: String(fd.get("term") || "2y"),
              project: String(fd.get("project") || ""),
              stems: fd.get("stems") === "1",
              editShort: fd.get("editShort") === "1",
              exclusive: fd.get("exclusive") === "1",
              buyout: fd.get("buyout") === "1",
              needSpecialReview: fd.get("needSpecialReview") === "1",
              specialNotes: String(fd.get("specialNotes") || ""),
              termPlus1y: fd.get("termPlus1y") === "1",
              removeFromCatalog: fd.get("removeFromCatalog") === "1",
              territoryExpand: fd.get("territoryExpand") === "1",
              moreComposition: fd.get("moreComposition") === "1",
            }),
          });
          const json = await res.json();
          if (msg instanceof HTMLElement) {
            msg.hidden = false;
            msg.textContent = json.ok
              ? json.quote?.total != null
                ? `Presupuesto: ${json.quote.total} € · Enviado`
                : "Solicitud enviada"
              : "Error al enviar";
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

      renderGrid();
    });
  }

  document.addEventListener("DOMContentLoaded", bindLibraryBrowser);
  document.addEventListener("astro:page-load", bindLibraryBrowser);


