/**
 * 🎧 Previews: genera mix preview MP3 para obras sin preview.
 * Baja stems HQ vía /admin/media?key= (privados).
 */

import { bakeLibraryPreviewFromUrls } from "../preview-noise-bake";
import { setStatus } from "./status";

export type PubItem = {
  slug?: string;
  title?: string;
  kind?: string;
  aspect?: string;
  moods?: string[];
  tags?: string[];
  filterMoods?: string[];
  filterTags?: string[];
  description?: string;
  notes?: string;
  year?: number;
  licenseEnabled?: boolean;
  preview?: string;
  stems?: { key?: string; src?: string; cleanSrc?: string }[];
};

export function setPreviewJob(opts: {
  show?: boolean;
  msg: string;
  detail?: string;
  pct?: number;
  kind?: "load" | "ok" | "err";
}) {
  const box = document.querySelector("[data-preview-job]");
  const msgEl = document.querySelector("[data-preview-job-msg]");
  const pctEl = document.querySelector("[data-preview-job-pct]");
  const fill = document.querySelector("[data-preview-job-fill]");
  const detail = document.querySelector("[data-preview-job-detail]");
  if (!(box instanceof HTMLElement)) return;
  box.hidden = opts.show === false;
  box.classList.remove("is-ok", "is-err", "is-load");
  if (opts.kind === "ok") box.classList.add("is-ok");
  if (opts.kind === "err") box.classList.add("is-err");
  if (opts.kind === "load") box.classList.add("is-load");
  if (msgEl) msgEl.textContent = opts.msg;
  const p = Math.max(0, Math.min(100, opts.pct ?? 0));
  if (pctEl) pctEl.textContent = opts.pct != null ? `${Math.round(p)}%` : "";
  if (fill instanceof HTMLElement) fill.style.setProperty("--p", `${p}%`);
  if (detail) detail.textContent = opts.detail || "";
}

function stemFetchUrls(stems: PubItem["stems"]): string[] {
  if (!Array.isArray(stems)) return [];
  const urls: string[] = [];
  for (const s of stems) {
    const key = String(s?.key || "").trim();
    if (key.startsWith("library/")) {
      urls.push(`/admin/media?key=${encodeURIComponent(key)}`);
      continue;
    }
    // Legacy público (antes del modelo full/stems)
    const legacy = String(s?.cleanSrc || s?.src || "").trim();
    if (legacy) urls.push(legacy);
  }
  return urls;
}

export async function runPreviewRebuild(opts: {
  loadPubs: () => Promise<void>;
  getPublications: () => PubItem[];
}): Promise<void> {
  const btn = document.querySelector("[data-rebuild-previews]");
  if (btn instanceof HTMLButtonElement) btn.disabled = true;
  try {
    setPreviewJob({
      show: true,
      msg: "Leyendo catálogo…",
      detail: "",
      pct: 2,
      kind: "load",
    });
    await opts.loadPubs();
    const publications = opts.getPublications();
    const need = publications.filter((p) => {
      const urls = stemFetchUrls(p.stems);
      return urls.length > 0 && !p.preview;
    });
    if (!need.length) {
      setPreviewJob({
        show: true,
        msg: "✅ Nada pendiente",
        detail: "Todas las obras con stems ya tienen mix preview (o no hay stems).",
        pct: 100,
        kind: "ok",
      });
      setStatus("✅ Todas las obras con stems ya tienen preview (o no hay stems).");
      return;
    }
    setPreviewJob({
      show: true,
      msg: `Generando 0/${need.length}`,
      detail: "Stems HQ → mix MP3 → subiendo…",
      pct: 0,
      kind: "load",
    });
    setStatus(`Generando previews 0/${need.length}…`);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < need.length; i++) {
      const p = need[i]!;
      const slug = String(p.slug || "");
      const title = String(p.title || slug);
      const urls = stemFetchUrls(p.stems);
      setPreviewJob({
        show: true,
        msg: `${i + 1}/${need.length} · «${title}»`,
        detail: `Mezclando ${urls.length} capa(s) → MP3…`,
        pct: ((i + 0.15) / need.length) * 100,
        kind: "load",
      });
      setStatus(`Preview ${i + 1}/${need.length}: «${title}»…`);
      try {
        const mix = await bakeLibraryPreviewFromUrls(urls, {
          noise01: 0.12,
          music01: 1,
          fetchInit: { credentials: "same-origin", cache: "reload" },
        });
        setPreviewJob({
          show: true,
          msg: `${i + 1}/${need.length} · «${title}»`,
          detail: "Subiendo mix a R2…",
          pct: ((i + 0.7) / need.length) * 100,
          kind: "load",
        });
        const body = new FormData();
        body.set("title", title);
        body.set("slug", slug);
        body.set("kind", String(p.kind || "stems"));
        body.set("aspect", String(p.aspect || "1:1"));
        body.set("moods", JSON.stringify(p.moods || []));
        body.set("tags", JSON.stringify(p.tags || []));
        body.set("filterMoods", JSON.stringify(p.filterMoods || []));
        body.set("filterTags", JSON.stringify(p.filterTags || []));
        body.set("description", String(p.description || ""));
        body.set("notes", String(p.notes || ""));
        body.set("year", String(p.year || new Date().getFullYear()));
        body.set("provisional", "0");
        body.set("licenseEnabled", p.licenseEnabled === false ? "0" : "1");
        const ext = mix.type.includes("mpeg") || mix.name.endsWith(".mp3") ? "mp3" : "wav";
        body.set("preview", mix, `${slug}-preview.${ext}`);
        const res = await fetch("/admin/publish", {
          method: "POST",
          body,
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || res.status);
        ok++;
        setPreviewJob({
          show: true,
          msg: `${i + 1}/${need.length} · ok «${title}»`,
          detail: `Listos ${ok} · fallos ${fail} · ${ext.toUpperCase()}`,
          pct: ((i + 1) / need.length) * 100,
          kind: "load",
        });
      } catch (e) {
        fail++;
        console.warn("[preview-rebuild]", title, e);
        setPreviewJob({
          show: true,
          msg: `${i + 1}/${need.length} · fallo «${title}»`,
          detail: e instanceof Error ? e.message : String(e),
          pct: ((i + 1) / need.length) * 100,
          kind: "err",
        });
      }
    }
    setPreviewJob({
      show: true,
      msg: fail ? `Hecho con fallos · ${ok} ok · ${fail} fail` : `✅ ${ok} preview(s)`,
      detail: fail
        ? "Revisa obras fallidas (¿keys privadas accesibles?)."
        : "Biblioteca usará el mix único.",
      pct: 100,
      kind: fail ? "err" : "ok",
    });
    setStatus(
      fail
        ? `Previews: ${ok} ok, ${fail} fallos.`
        : `✅ ${ok} preview(s) generados.`,
      !fail,
    );
    await opts.loadPubs();
  } finally {
    if (btn instanceof HTMLButtonElement) btn.disabled = false;
  }
}
