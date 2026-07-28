/**
 * Rail de publicaciones admin: grid paginado + load + delete.
 */

export type PubsRailApi = {
  getPublications: () => Record<string, unknown>[];
  setPublications: (list: Record<string, unknown>[]) => void;
  loadPubs: () => Promise<void>;
  renderPubs: () => void;
  bindPager: () => void;
};

export function createPubsRail(opts: {
  pageSize?: number;
  onEdit: (item: Record<string, unknown>) => void;
  onClearEditIf: (slug: string) => void;
  onMoodsFromServer: (moods: string[]) => void;
  rebuildMoodPick: (opts?: { selected?: string[]; filters?: string[] }) => void;
  readSelectedMoods: () => string[];
  setStatus: (msg: string, ok?: boolean) => void;
  showToast: (msg: string, ms?: number) => void;
}): PubsRailApi {
  const PAGE = opts.pageSize ?? 12;
  let publications: Record<string, unknown>[] = [];
  let pubPage = 0;

  const renderPubs = () => {
    const grid = document.querySelector("[data-pub-grid]");
    const pager = document.querySelector("[data-pub-pager]");
    const pageLabel = document.querySelector("[data-pub-page]");
    if (!(grid instanceof HTMLElement)) return;

    if (!publications.length) {
      grid.innerHTML = `<p class="pub-empty">No hay publicaciones.</p>`;
      if (pager instanceof HTMLElement) pager.hidden = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(publications.length / PAGE));
    if (pubPage >= totalPages) pubPage = totalPages - 1;
    if (pubPage < 0) pubPage = 0;
    const start = pubPage * PAGE;
    const slice = publications.slice(start, start + PAGE);

    if (pager instanceof HTMLElement) {
      pager.hidden = totalPages <= 1;
    }
    if (pageLabel) pageLabel.textContent = `${pubPage + 1} / ${totalPages}`;
    const prev = document.querySelector("[data-pub-prev]");
    const next = document.querySelector("[data-pub-next]");
    if (prev instanceof HTMLButtonElement) prev.disabled = pubPage <= 0;
    if (next instanceof HTMLButtonElement) next.disabled = pubPage >= totalPages - 1;

    grid.innerHTML = slice
      .map((item) => {
        const slug = String(item.slug || "");
        const title = String(item.title || slug);
        const safeSlug = slug.replace(/"/g, "");
        const safeTitle = title.replace(/"/g, "&quot;").replace(/</g, "&lt;");
        const coverRaw = String(item.thumb || item.cover || "").trim();
        const cover =
          coverRaw.startsWith("/") && !coverRaw.startsWith("//")
            ? coverRaw.replace(/"/g, "")
            : "";
        const thumb = cover
          ? `<img src="${cover}" alt="" width="64" height="64" loading="lazy" onerror="this.onerror=null;this.src='/images/admin-thumb.svg'" />`
          : `<img src="/images/admin-thumb.svg" alt="" width="64" height="64" loading="lazy" />`;
        const shortTitle = title.length > 22 ? `${title.slice(0, 20)}…` : title;
        const safeShort = shortTitle.replace(/</g, "&lt;").replace(/"/g, "&quot;");
        return `<article class="tile" data-pub-slug="${safeSlug}" title="${safeTitle}">
          <div class="tile__media" data-pub-edit="${safeSlug}" role="button" tabindex="0" aria-label="Editar ${safeTitle}">
            ${thumb}
          </div>
          <p class="tile__title">${safeShort}</p>
          <div class="tile__actions">
            <button type="button" class="tile__btn" data-pub-edit="${safeSlug}" title="Editar">✎</button>
            <button type="button" class="tile__btn tile__btn--danger" data-pub-del="${safeSlug}" title="Borrar">🗑</button>
          </div>
        </article>`;
      })
      .join("");

    grid.querySelectorAll("[data-pub-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slug = (btn as HTMLElement).dataset.pubEdit || "";
        const item = publications.find((p) => p.slug === slug);
        if (item) {
          opts.onEdit(item);
          document.querySelector("[data-admin-form]")?.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
    grid.querySelectorAll("[data-pub-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const slug = (btn as HTMLElement).dataset.pubDel || "";
        if (!slug) return;
        if (!confirm(`¿Borrar «${slug}» del catálogo y sus archivos en R2? No se puede deshacer.`)) {
          return;
        }
        try {
          const res = await fetch(`/admin/items?slug=${encodeURIComponent(slug)}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.error || data.message || "Error");
          opts.setStatus(
            `✅ ${data.message || "Borrado"} · media R2: ${data.mediaDeleted ?? "?"} archivo(s). Si la biblioteca aún lo muestra: Ctrl+F5.`,
          );
          opts.showToast(`Borrado «${slug}» del catálogo`, 12000);
          opts.onClearEditIf(slug);
          await loadPubs();
        } catch (e) {
          opts.setStatus(e instanceof Error ? e.message : "Error al borrar", false);
        }
      });
    });
  };

  const loadPubs = async () => {
    const grid = document.querySelector("[data-pub-grid]");
    if (grid instanceof HTMLElement) {
      grid.innerHTML = `<p class="pub-empty">Cargando…</p>`;
    }
    try {
      const res = await fetch("/admin/items", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const ct = (res.headers.get("Content-Type") || "").toLowerCase();
      if (!ct.includes("application/json")) {
        throw new Error(
          res.status === 401
            ? "Sesión caducada — recarga e inicia sesión"
            : `Respuesta no JSON (${res.status})`,
        );
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const err = String(data.error || data.message || "No se pudo cargar");
        if (err === "unauthorized" || res.status === 401) {
          throw new Error("Sesión caducada — recarga e inicia sesión");
        }
        throw new Error(err);
      }
      publications = Array.isArray(data.items) ? data.items : [];
      if (Array.isArray(data.moods) && data.moods.length) {
        opts.onMoodsFromServer(data.moods.map(String));
      }
      pubPage = 0;
      renderPubs();
      const keep = opts.readSelectedMoods();
      opts.rebuildMoodPick(keep.length ? { selected: keep } : { selected: [] });
      if (!publications.length) {
        opts.setStatus("Catálogo vacío en R2 (ninguna publicación).", false);
      } else {
        opts.setStatus(`${publications.length} publicación(es) en catálogo.`);
      }
    } catch (e) {
      publications = [];
      if (grid instanceof HTMLElement) {
        grid.innerHTML = `<p class="pub-empty is-err">${e instanceof Error ? e.message : "Error"}</p>`;
      }
      opts.rebuildMoodPick();
    }
  };

  const bindPager = () => {
    document.querySelector("[data-pub-prev]")?.addEventListener("click", () => {
      pubPage -= 1;
      renderPubs();
    });
    document.querySelector("[data-pub-next]")?.addEventListener("click", () => {
      pubPage += 1;
      renderPubs();
    });
    document.querySelector("[data-pub-refresh]")?.addEventListener("click", () => {
      void loadPubs();
    });
  };

  return {
    getPublications: () => publications,
    setPublications: (list) => {
      publications = list;
    },
    loadPubs,
    renderPubs,
    bindPager,
  };
}
