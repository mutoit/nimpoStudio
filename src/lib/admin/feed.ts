/**
 * Admin feed · Novedades (home).
 */

import { compressImageForUpload } from "../admin-image-compress";

export type FeedItem = {
  title?: string;
  summary?: string;
  tag?: string;
  date?: string;
  image?: string;
};

export function bindAdminFeed() {
  const feedDate = document.querySelector<HTMLInputElement>("[data-feed-date]");
  if (feedDate && !feedDate.value) {
    feedDate.value = new Date().toISOString().slice(0, 10);
  }

  let feedItems: FeedItem[] = [];

  const renderFeedGrid = () => {
    const grid = document.querySelector("[data-feed-grid]");
    if (!(grid instanceof HTMLElement)) return;
    if (!feedItems.length) {
      grid.innerHTML = `<p class="pub-empty">Sin entradas en el feed.</p>`;
      return;
    }
    grid.innerHTML = feedItems
      .map((item, idx) => {
        const title = String(item.title || "—");
        const date = String(item.date || "").slice(0, 10);
        const safeT = title.replace(/"/g, "");
        const imgRaw = String(item.image || "").trim();
        const img =
          imgRaw.startsWith("/") && !imgRaw.startsWith("//")
            ? imgRaw.replace(/"/g, "")
            : "";
        const thumb = img
          ? `<img src="${img}" alt="" width="64" height="64" loading="lazy" onerror="this.onerror=null;this.src='/images/admin-thumb.svg'" />`
          : `<img src="/images/admin-thumb.svg" alt="" width="64" height="64" loading="lazy" />`;
        const shortT = title.length > 18 ? `${title.slice(0, 16)}…` : title;
        return `<article class="tile" title="${safeT} · ${date}">
          <div class="tile__media" data-feed-edit="${idx}" role="button" tabindex="0" aria-label="Editar ${safeT}">
            ${thumb}
          </div>
          <p class="tile__title">${shortT.replace(/</g, "&lt;")}</p>
          <div class="tile__actions">
            <button type="button" class="tile__btn" data-feed-edit="${idx}" title="Editar">✎</button>
            <button type="button" class="tile__btn tile__btn--danger" data-feed-del="${idx}" title="Borrar">🗑</button>
          </div>
        </article>`;
      })
      .join("");

    grid.querySelectorAll("[data-feed-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number((btn as HTMLElement).dataset.feedEdit);
        const item = feedItems[i];
        if (!item) return;
        const form = document.querySelector("[data-feed-form]") as HTMLFormElement | null;
        const set = (sel: string, v: string) => {
          const el = form?.querySelector(sel) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | null;
          if (el) el.value = v;
        };
        set("[data-feed-title]", String(item.title || ""));
        set("[data-feed-summary]", String(item.summary || ""));
        set("[data-feed-tag]", String(item.tag || "proximo"));
        set("[data-feed-date]", String(item.date || "").slice(0, 10));
        set("[data-feed-link]", String((item as { link?: string }).link || ""));
        const notifyCb = form?.querySelector("[data-feed-notify]") as HTMLInputElement | null;
        if (notifyCb) notifyCb.checked = false;
        form?.scrollIntoView({ behavior: "smooth" });
      });
    });

    grid.querySelectorAll("[data-feed-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number((btn as HTMLElement).dataset.feedDel);
        const item = feedItems[i];
        if (!item?.title || !item?.date) return;
        if (!confirm(`¿Borrar del feed «${item.title}»?`)) return;
        try {
          const q = new URLSearchParams({
            title: String(item.title),
            date: String(item.date).slice(0, 10),
          });
          const res = await fetch(`/admin/feed?${q}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.message || data.error || "Error");
          await loadFeed();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Error al borrar feed");
        }
      });
    });
  };

  const loadFeed = async () => {
    const grid = document.querySelector("[data-feed-grid]");
    try {
      const res = await fetch("/admin/feed", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || res.status);
      feedItems = Array.isArray(data.items) ? data.items : [];
      const nl = document.querySelector("[data-newsletter-count]");
      if (nl instanceof HTMLElement) {
        const n = Number(data.newsletterActive || 0);
        const tot = Number(data.newsletterTotal || 0);
        nl.hidden = false;
        nl.textContent =
          n > 0 || tot > 0
            ? `Abonados novedades: ${n} activos${tot > n ? ` · ${tot} en lista (incl. pendientes/bajas)` : ""}.`
            : "Abonados novedades: 0 (form en panel Novedades de la home).";
      }
      renderFeedGrid();
    } catch (e) {
      if (grid instanceof HTMLElement) {
        grid.innerHTML = `<p class="pub-empty is-err">${e instanceof Error ? e.message : "Error"}</p>`;
      }
    }
  };

  document.querySelector("[data-feed-form]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const btn = form.querySelector("[data-feed-publish]");
    const status = document.querySelector("[data-feed-status]");
    if (btn instanceof HTMLButtonElement) btn.disabled = true;
    if (status instanceof HTMLElement) {
      status.hidden = false;
      status.textContent = "Publicando feed…";
      status.classList.remove("is-err");
    }
    try {
      const title = String(
        (form.querySelector("[data-feed-title]") as HTMLInputElement)?.value || "",
      ).trim();
      const summary = String(
        (form.querySelector("[data-feed-summary]") as HTMLTextAreaElement)?.value || "",
      ).trim();
      const tag = String(
        (form.querySelector("[data-feed-tag]") as HTMLSelectElement)?.value || "proximo",
      );
      const date = String(
        (form.querySelector("[data-feed-date]") as HTMLInputElement)?.value || "",
      );
      const link = String(
        (form.querySelector("[data-feed-link]") as HTMLInputElement)?.value || "",
      ).trim();
      const notify = Boolean(
        (form.querySelector("[data-feed-notify]") as HTMLInputElement | null)?.checked,
      );
      const imageInput = form.querySelector("[data-feed-image]") as HTMLInputElement | null;
      const imageRaw = imageInput?.files?.[0] || null;
      const imageFile = imageRaw
        ? await compressImageForUpload(imageRaw, { maxEdge: 480, quality: 0.78 })
        : null;

      const body = new FormData();
      body.set("title", title);
      body.set("summary", summary);
      body.set("tag", tag);
      body.set("date", date);
      if (link) body.set("link", link);
      if (notify) body.set("notify", "1");
      if (imageFile) body.set("image", imageFile, imageFile.name);

      if (notify && status instanceof HTMLElement) {
        status.textContent = "Publicando feed y enviando emails…";
      }

      const res = await fetch("/admin/feed", {
        method: "POST",
        credentials: "same-origin",
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || `Error ${res.status}`);
      }
      if (status instanceof HTMLElement) {
        status.textContent = `✅ ${data.message || "Feed actualizado"}`;
      }
      form.reset();
      const prev = document.querySelector("[data-feed-image-preview]");
      if (prev instanceof HTMLElement) {
        prev.hidden = true;
        prev.innerHTML = "";
      }
      if (feedDate) feedDate.value = new Date().toISOString().slice(0, 10);
      await loadFeed();
    } catch (err) {
      if (status instanceof HTMLElement) {
        status.textContent = err instanceof Error ? err.message : "Error feed";
        status.classList.add("is-err");
      }
    } finally {
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
    }
  });

  void loadFeed();
}
