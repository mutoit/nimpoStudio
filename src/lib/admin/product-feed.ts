/**
 * Admin feed de productos (CRUD posts con cabecera = producto publicado).
 */

import { compressImageForUpload } from "../admin-image-compress";

export type ProductFeedItem = {
  id: string;
  date: string;
  productSlug: string;
  productName: string;
  summary: string;
  tag?: string;
  image?: string;
  video?: string;
  link?: string;
};

export type ProductOption = { slug: string; name: string; status?: string };

export function bindProductFeed(opts: {
  getProducts: () => ProductOption[];
}) {
  const form = document.querySelector("[data-pfeed-form]") as HTMLFormElement | null;
  if (!form) return;

  const dateInput = form.querySelector<HTMLInputElement>("[data-pfeed-date]");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  let feedItems: ProductFeedItem[] = [];
  let editingId: string | null = null;

  const setStatus = (msg: string, ok = true) => {
    const el = document.querySelector("[data-pfeed-status]");
    if (!(el instanceof HTMLElement)) return;
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("is-err", !ok);
  };

  const fillProductSelect = () => {
    const sel = form.querySelector("[data-pfeed-product]") as HTMLSelectElement | null;
    if (!sel) return;
    const prev = sel.value;
    const products = opts
      .getProducts()
      .filter((p) => p.slug && p.status !== "draft")
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const optsHtml = products.length
      ? products
          .map(
            (p) =>
              `<option value="${String(p.slug).replace(/"/g, "")}">${String(p.name || p.slug)
                .replace(/</g, "&lt;")
                .replace(/"/g, "")}</option>`,
          )
          .join("")
      : `<option value="">— sin productos publicados —</option>`;
    sel.innerHTML = `<option value="">Elegir producto…</option>${optsHtml}`;
    if (prev && products.some((p) => p.slug === prev)) sel.value = prev;
  };

  const clearMediaPreview = () => {
    for (const sel of ["[data-pfeed-image-preview]", "[data-pfeed-video-preview]"]) {
      const el = document.querySelector(sel);
      if (el instanceof HTMLElement) {
        el.hidden = true;
        el.innerHTML = "";
      }
    }
    const imgIn = form.querySelector("[data-pfeed-image]") as HTMLInputElement | null;
    const vidIn = form.querySelector("[data-pfeed-video]") as HTMLInputElement | null;
    if (imgIn) imgIn.value = "";
    if (vidIn) vidIn.value = "";
  };

  const resetForm = () => {
    editingId = null;
    form.reset();
    clearMediaPreview();
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    const idEl = form.querySelector("[data-pfeed-id]") as HTMLInputElement | null;
    if (idEl) idEl.value = "";
    const keep = form.querySelector("[data-pfeed-keep-media]") as HTMLInputElement | null;
    if (keep) keep.value = "0";
    const btn = form.querySelector("[data-pfeed-publish]");
    if (btn instanceof HTMLElement) btn.textContent = "Publicar en feed productos";
    const bar = document.querySelector("[data-pfeed-edit-bar]");
    if (bar instanceof HTMLElement) bar.hidden = true;
    fillProductSelect();
  };

  const showCurrentMedia = (item: ProductFeedItem) => {
    const imgBox = document.querySelector("[data-pfeed-image-preview]");
    const vidBox = document.querySelector("[data-pfeed-video-preview]");
    if (item.video && vidBox instanceof HTMLElement) {
      vidBox.hidden = false;
      vidBox.innerHTML = `<p class="fname">Vídeo actual (se mantiene si no subes otro)</p><video src="${String(item.video).replace(/"/g, "")}" controls playsinline></video>`;
    }
    if (item.image && !item.video && imgBox instanceof HTMLElement) {
      imgBox.hidden = false;
      imgBox.innerHTML = `<p class="fname">Imagen actual (se mantiene si no subes otra)</p><img src="${String(item.image).replace(/"/g, "")}" alt="" />`;
    }
  };

  const renderGrid = () => {
    const grid = document.querySelector("[data-pfeed-grid]");
    if (!(grid instanceof HTMLElement)) return;
    if (!feedItems.length) {
      grid.innerHTML = `<p class="pub-empty">Sin entradas en el feed de productos.</p>`;
      return;
    }
    grid.innerHTML = feedItems
      .map((item, idx) => {
        const name = String(item.productName || item.productSlug || "—");
        const date = String(item.date || "").slice(0, 10);
        const safe = name.replace(/"/g, "");
        const imgRaw = String(item.image || "").trim();
        const vidRaw = String(item.video || "").trim();
        const media =
          vidRaw && vidRaw.startsWith("/")
            ? `<video class="tile__img" src="${vidRaw.replace(/"/g, "")}" muted playsinline></video>`
            : imgRaw && imgRaw.startsWith("/")
              ? `<img class="tile__img" src="${imgRaw.replace(/"/g, "")}" alt="" loading="lazy" />`
              : `<img class="tile__img" src="/images/admin-thumb.svg" alt="" loading="lazy" />`;
        const short = name.length > 22 ? `${name.slice(0, 20)}…` : name;
        return `<article class="tile" title="${safe} · ${date}">
          <button type="button" class="tile__hit" data-pfeed-edit="${idx}" aria-label="Editar ${safe}">
            ${media}
          </button>
          <div class="tile__actions">
            <button type="button" class="tile__btn" data-pfeed-edit="${idx}">Editar</button>
            <button type="button" class="tile__btn tile__btn--danger" data-pfeed-del="${idx}">Borrar</button>
          </div>
          <p class="tile__title">${short.replace(/</g, "&lt;")}</p>
          <p class="tile__meta">${date}${item.video ? " · vídeo" : item.image ? " · img" : ""}</p>
        </article>`;
      })
      .join("");

    grid.querySelectorAll("[data-pfeed-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number((btn as HTMLElement).dataset.pfeedEdit);
        const item = feedItems[i];
        if (!item) return;
        editingId = item.id;
        const set = (sel: string, v: string) => {
          const el = form.querySelector(sel) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | null;
          if (el) el.value = v;
        };
        fillProductSelect();
        set("[data-pfeed-id]", item.id);
        set("[data-pfeed-product]", item.productSlug);
        set("[data-pfeed-summary]", item.summary || "");
        set("[data-pfeed-tag]", item.tag || "update");
        set("[data-pfeed-date]", String(item.date || "").slice(0, 10));
        const keep = form.querySelector("[data-pfeed-keep-media]") as HTMLInputElement | null;
        if (keep) keep.value = "1";
        clearMediaPreview();
        showCurrentMedia(item);
        const pub = form.querySelector("[data-pfeed-publish]");
        if (pub instanceof HTMLElement) pub.textContent = "Guardar post";
        const bar = document.querySelector("[data-pfeed-edit-bar]");
        if (bar instanceof HTMLElement) {
          bar.hidden = false;
          const lab = bar.querySelector("[data-pfeed-edit-label]");
          if (lab) lab.textContent = `Editando post · ${item.productName}`;
        }
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    grid.querySelectorAll("[data-pfeed-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number((btn as HTMLElement).dataset.pfeedDel);
        const item = feedItems[i];
        if (!item?.id) return;
        if (!confirm(`¿Borrar post de «${item.productName}» (${item.date})?`)) return;
        try {
          const res = await fetch(`/admin/product-feed?id=${encodeURIComponent(item.id)}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.message || data.error || "Error");
          if (editingId === item.id) resetForm();
          await loadFeed();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Error al borrar");
        }
      });
    });
  };

  const loadFeed = async () => {
    const grid = document.querySelector("[data-pfeed-grid]");
    try {
      const res = await fetch("/admin/product-feed", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || res.status);
      feedItems = Array.isArray(data.items) ? data.items : [];
      renderGrid();
    } catch (e) {
      if (grid instanceof HTMLElement) {
        grid.innerHTML = `<p class="pub-empty is-err">${e instanceof Error ? e.message : "Error"}</p>`;
      }
    }
  };

  const bindPreview = (inputSel: string, boxSel: string, kind: "img" | "video") => {
    const input = form.querySelector(inputSel);
    const box = document.querySelector(boxSel);
    if (!(input instanceof HTMLInputElement) || !(box instanceof HTMLElement)) return;
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (!f) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      // imagen XOR vídeo en UI
      if (kind === "img") {
        const vidIn = form.querySelector("[data-pfeed-video]") as HTMLInputElement | null;
        if (vidIn) vidIn.value = "";
        const vidBox = document.querySelector("[data-pfeed-video-preview]");
        if (vidBox instanceof HTMLElement) {
          vidBox.hidden = true;
          vidBox.innerHTML = "";
        }
      } else {
        const imgIn = form.querySelector("[data-pfeed-image]") as HTMLInputElement | null;
        if (imgIn) imgIn.value = "";
        const imgBox = document.querySelector("[data-pfeed-image-preview]");
        if (imgBox instanceof HTMLElement) {
          imgBox.hidden = true;
          imgBox.innerHTML = "";
        }
      }
      const url = URL.createObjectURL(f);
      box.hidden = false;
      box.innerHTML =
        kind === "video"
          ? `<video src="${url}" controls playsinline></video><p class="fname">${f.name}</p>`
          : `<img src="${url}" alt="" /><p class="fname">${f.name}</p>`;
      const keep = form.querySelector("[data-pfeed-keep-media]") as HTMLInputElement | null;
      if (keep) keep.value = "0";
    });
  };
  bindPreview("[data-pfeed-image]", "[data-pfeed-image-preview]", "img");
  bindPreview("[data-pfeed-video]", "[data-pfeed-video-preview]", "video");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("[data-pfeed-publish]");
    if (btn instanceof HTMLButtonElement) btn.disabled = true;
    setStatus(editingId ? "Guardando post…" : "Publicando post…");
    try {
      const productSlug = String(
        (form.querySelector("[data-pfeed-product]") as HTMLSelectElement)?.value || "",
      ).trim();
      if (!productSlug) throw new Error("Elige un producto de la lista");
      const summary = String(
        (form.querySelector("[data-pfeed-summary]") as HTMLTextAreaElement)?.value || "",
      ).trim();
      if (!summary) throw new Error("Escribe el texto del post");
      const tag = String(
        (form.querySelector("[data-pfeed-tag]") as HTMLSelectElement)?.value || "update",
      );
      const date = String(
        (form.querySelector("[data-pfeed-date]") as HTMLInputElement)?.value || "",
      );
      const id = String(
        (form.querySelector("[data-pfeed-id]") as HTMLInputElement)?.value || "",
      ).trim();
      const keepMedia = String(
        (form.querySelector("[data-pfeed-keep-media]") as HTMLInputElement)?.value || "0",
      );

      const imageInput = form.querySelector("[data-pfeed-image]") as HTMLInputElement | null;
      const videoInput = form.querySelector("[data-pfeed-video]") as HTMLInputElement | null;
      const imageRaw = imageInput?.files?.[0] || null;
      const videoRaw = videoInput?.files?.[0] || null;

      const body = new FormData();
      if (id) body.set("id", id);
      body.set("productSlug", productSlug);
      body.set("summary", summary);
      body.set("tag", tag);
      body.set("date", date);
      if (keepMedia === "1") body.set("keepMedia", "1");

      if (videoRaw) {
        body.set("video", videoRaw, videoRaw.name);
      } else if (imageRaw) {
        const imageFile = await compressImageForUpload(imageRaw, {
          maxEdge: 720,
          quality: 0.78,
          preserveGif: true,
        });
        body.set("image", imageFile, imageFile.name);
      }

      const res = await fetch("/admin/product-feed", {
        method: "POST",
        credentials: "same-origin",
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || `Error ${res.status}`);
      }
      setStatus(`✅ ${data.message || "OK"}`);
      resetForm();
      await loadFeed();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error feed", false);
    } finally {
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
    }
  });

  document.querySelector("[data-pfeed-edit-cancel]")?.addEventListener("click", () => {
    resetForm();
  });

  document.querySelector("[data-pfeed-refresh]")?.addEventListener("click", () => {
    fillProductSelect();
    void loadFeed();
  });

  fillProductSelect();
  void loadFeed();

  return {
    refreshProducts: () => fillProductSelect(),
    reload: () => loadFeed(),
  };
}
