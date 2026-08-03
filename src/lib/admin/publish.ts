/**
 * Submit admin biblioteca: meta-only o publish.
 * Una obra unificada: vídeo + stems + master (todo opcional salvo validación de contenido).
 * Stems HQ intactos → R2 full/stems. Preview = 1 mix generado (copia de trabajo).
 */

import { bakeLibraryPreview, bakeLibraryPreviewFromUrls } from "../preview-noise-bake";
import { compressImageForUpload } from "../admin-image-compress";
import type { AdminMixPreview } from "../admin-mix-preview";
import { normalizeMood } from "./moods";

export type StemRow = { label: string; file: File | null };

export type PublishDeps = {
  /** Inferido: stems si hay capas, si no video */
  getChannel: () => "video" | "stems";
  getEditingSlug: () => string | null;
  getEditingItem: () => Record<string, unknown> | null;
  getStemRows: () => StemRow[];
  getMixDirty: () => boolean;
  setMixDirty: (v: boolean) => void;
  readMixGains: () => { music01: number; noise01: number };
  mixPreview: AdminMixPreview;
  rememberMood: (v: string) => void;
  loadPubs: () => Promise<void>;
  getPublications: () => Record<string, unknown>[];
  setEditMode: (item: Record<string, unknown> | null) => void;
  clearStemsUi: () => void;
  syncStemRows: () => void;
  setStatus: (msg: string, ok?: boolean) => void;
  showToast: (msg: string, ms?: number) => void;
  setLight: (key: string, state: "idle" | "ok" | "loading" | "err" | "pending", text: string) => void;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type DeliveryStem = { id?: string; label?: string; key?: string };

function adminMediaUrl(key: string): string {
  return `/admin/media?key=${encodeURIComponent(key)}`;
}

export function bindAdminPublish(deps: PublishDeps) {
  document.querySelector("[data-admin-form]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const btn = form.querySelector("[data-publish]");
    if (btn instanceof HTMLButtonElement) btn.disabled = true;

    const editingSlug = deps.getEditingSlug();
    const editingItem = deps.getEditingItem();
    const stemRows = deps.getStemRows();
    const mixDirty = deps.getMixDirty();

    try {
      const titleInput = form.querySelector("[data-title]") as HTMLInputElement | null;
      const title = String(
        titleInput?.value ||
          form.querySelector<HTMLInputElement>("[name=title]")?.value ||
          "",
      ).trim();
      if (!title) {
        deps.setStatus("El título es obligatorio.", false);
        titleInput?.focus();
        return;
      }

      const fd = new FormData(form);
      const slug =
        (editingSlug && String(editingSlug).trim()) ||
        String(fd.get("slug") || "").trim() ||
        slugify(title);
      if (!slug) {
        deps.setStatus("Falta slug (o un título para generarlo).", false);
        return;
      }

      const moods = [
        ...new Set(
          fd.getAll("moodPick").map((x) => normalizeMood(String(x))).filter(Boolean),
        ),
      ];
      const filterMoods = [
        ...new Set(
          fd
            .getAll("moodFilter")
            .map((x) => normalizeMood(String(x)))
            .filter((m) => moods.includes(m)),
        ),
      ];
      const tags: string[] = [];
      const filterTags: string[] = [];
      for (const m of moods) deps.rememberMood(m);

      const hasVideoFile = !!(form.querySelector("[data-video-file]") as HTMLInputElement)
        ?.files?.[0];
      const hasCoverFile = !!(form.querySelector("[data-cover-file]") as HTMLInputElement)
        ?.files?.[0];
      const hasStemFiles = stemRows.some((r) => r.file);
      const masterFile =
        (form.querySelector("[data-master-file]") as HTMLInputElement)?.files?.[0] || null;
      const hasMasterFile = !!masterFile;

      const serverStems: DeliveryStem[] = Array.isArray(editingItem?.stems)
        ? (editingItem!.stems as DeliveryStem[])
        : [];
      const serverStemKeys = serverStems
        .map((s) => String(s.key || "").trim())
        .filter((k) => k.startsWith("library/"));
      const hasServerStems = serverStemKeys.length > 0;
      const hasServerVideo = Boolean(editingItem?.video);

      // Solo rehacer preview (ruido) sin re-subir stems HQ
      const wantsNewPreviewOnly =
        !!editingSlug && !hasStemFiles && mixDirty && hasServerStems;

      const hasAnyNewMedia =
        hasVideoFile || hasCoverFile || hasStemFiles || hasMasterFile || wantsNewPreviewOnly;

      // kind canónico: hay stems (nuevos o en servidor) → stems
      const kind: "video" | "stems" =
        hasStemFiles || hasServerStems || wantsNewPreviewOnly ? "stems" : "video";

      if (editingSlug && !hasAnyNewMedia) {
        deps.setLight("upload", "loading", "Guardando meta…");
        deps.setStatus("Guardando cambios (audio se conserva tal cual)…");
        const res = await fetch("/admin/items", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            slug: editingSlug,
            title,
            aspect: String(fd.get("aspect") || "1:1"),
            description: String(fd.get("description") || ""),
            notes: String(fd.get("notes") || ""),
            moods,
            tags,
            filterMoods,
            filterTags,
            year: Number(fd.get("year") || 2026),
            provisional: false,
            licenseEnabled: fd.get("licenseEnabled") === "on",
            // Precios: baremo global — no se editan por obra (no enviar → conservar R2)
          }),
        });
        let data: {
          ok?: boolean;
          message?: string;
          error?: string;
          item?: unknown;
        } = {};
        try {
          data = await res.json();
        } catch {
          throw new Error(
            `Respuesta no JSON (${res.status}). ¿Sesión caducada? Vuelve a entrar.`,
          );
        }
        if (!res.ok || !data.ok) {
          throw new Error(
            data.message || data.error || `Error al guardar (${res.status})`,
          );
        }
        deps.setLight("upload", "ok", "Meta OK · audio igual");
        deps.setStatus(`✅ ${data.message || "Guardado"} — stems/master/preview sin tocar.`);
        deps.showToast(`✅ «${title}» meta guardada`, 14000);
        await deps.loadPubs();
        const updated =
          deps.getPublications().find((p) => p.slug === editingSlug) ||
          (data.item as Record<string, unknown> | undefined);
        if (updated) deps.setEditMode(updated as Record<string, unknown>);
        deps.setMixDirty(false);
        return;
      }

      // Alta nueva: al menos vídeo o stems
      if (!editingSlug && !hasVideoFile && !hasStemFiles) {
        throw new Error("Sube un vídeo y/o al menos un stem HQ.");
      }
      // Edición con media nueva pero sin base: necesita algo público
      if (
        editingSlug &&
        hasAnyNewMedia &&
        !hasVideoFile &&
        !hasStemFiles &&
        !hasServerVideo &&
        !hasServerStems &&
        !wantsNewPreviewOnly
      ) {
        throw new Error("La obra necesita vídeo o stems (en servidor o nuevos).");
      }

      const body = new FormData();
      body.set("title", title);
      body.set("slug", slug);
      body.set("kind", kind);
      body.set("aspect", String(fd.get("aspect") || "1:1"));
      body.set("moods", JSON.stringify(moods));
      body.set("tags", JSON.stringify(tags));
      body.set("filterMoods", JSON.stringify(filterMoods));
      body.set("filterTags", JSON.stringify(filterTags));
      body.set("description", String(fd.get("description") || ""));
      body.set("notes", String(fd.get("notes") || ""));
      body.set("year", String(fd.get("year") || "2026"));
      body.set("provisional", "0");
      body.set("licenseEnabled", fd.get("licenseEnabled") === "on" ? "1" : "0");

      if (hasMasterFile && masterFile) {
        deps.setLight("master", "loading", "Master…");
        body.set("master", masterFile, masterFile.name);
      }

      const v = (form.querySelector("[data-video-file]") as HTMLInputElement)?.files?.[0];
      if (v) body.set("video", v, v.name);
      const c = (form.querySelector("[data-cover-file]") as HTMLInputElement)?.files?.[0];
      if (c) {
        const small = await compressImageForUpload(c, { maxEdge: 360, quality: 0.72 });
        body.set("cover", small, small.name);
      }

      const { music01, noise01 } = deps.readMixGains();
      const withFile = stemRows.filter((r) => r.file);

      // HQ intactos → servidor (sin bake por capa)
      if (withFile.length) {
        deps.setLight("stems", "loading", `HQ ${withFile.length}…`);
        let n = 0;
        for (const row of withFile) {
          if (!row.file) continue;
          body.set(`stem_${n}_file`, row.file, row.file.name);
          body.set(`stem_${n}_label`, row.label || row.file.name);
          n++;
        }
      }

      // Preview biblioteca = 1 mix (copia de trabajo mono/MP3 + ruido) cuando hay stems
      const needPreview =
        withFile.length > 0 ||
        wantsNewPreviewOnly ||
        (editingSlug && hasServerStems && !editingItem?.preview);

      if (needPreview) {
        deps.mixPreview.stop();
        deps.setLight("upload", "loading", "Mix preview…");
        deps.setStatus(
          withFile.length
            ? `Generando preview web (mix + ruido ${Math.round(noise01 * 100)}%) — originales intactos…`
            : `Rehaciendo preview desde stems HQ en R2 (ruido ${Math.round(noise01 * 100)}%)…`,
        );

        let mix: File;
        if (withFile.length) {
          const originals = withFile.map((r) => r.file!).filter(Boolean);
          mix = await bakeLibraryPreview(originals, noise01, music01);
        } else {
          const urls = serverStemKeys.map(adminMediaUrl);
          mix = await bakeLibraryPreviewFromUrls(urls, {
            noise01,
            music01,
            fetchInit: { credentials: "same-origin", cache: "reload" },
          });
        }
        const ext =
          mix.type.includes("mpeg") || mix.name.endsWith(".mp3") ? "mp3" : "wav";
        body.set("preview", mix, `${slug}-preview.${ext}`);
      }

      deps.mixPreview.stop();
      if (hasVideoFile) deps.setLight("video", "loading", "Subiendo…");
      if (hasCoverFile) deps.setLight("cover", "loading", "Subiendo…");
      if (hasStemFiles) deps.setLight("stems", "loading", "Stems HQ…");
      if (hasMasterFile) deps.setLight("master", "loading", "Master R2…");
      deps.setLight("upload", "loading", "Publicando en R2…");
      deps.setStatus(
        editingSlug ? "Subiendo…" : "Publicando… (stems privados + preview web)",
      );

      const res = await fetch("/admin/publish", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        deps.setLight("upload", "err", "Error");
        if (hasVideoFile) deps.setLight("video", "err", "Falló");
        if (hasStemFiles) deps.setLight("stems", "err", "Falló");
        if (hasMasterFile) deps.setLight("master", "err", "Falló");
        const err = String(data.error || "");
        if (err === "bad_extension") {
          throw new Error(
            "Tipo no permitido. Vídeo: mp4/webm · Stems/master: wav/flac/aiff/mp3 · Imagen: jpg/png/webp",
          );
        }
        if (err === "file_too_large" || err === "total_too_large") {
          throw new Error(
            err === "total_too_large"
              ? `Peso total máximo ${data.maxTotalMb || 250} MB por publicación`
              : `Archivo demasiado grande (máx ${data.maxMb || 100} MB)`,
          );
        }
        if (err === "missing_stems") {
          throw new Error("Faltan stems HQ y no hay stems previos que conservar.");
        }
        if (err === "missing_video") {
          throw new Error("Falta vídeo y no hay vídeo previo que conservar.");
        }
        if (err === "missing_media") {
          throw new Error("Sube un vídeo y/o stems HQ.");
        }
        throw new Error(data.message || data.error || `Error ${res.status}`);
      }

      const msg =
        data.message ||
        `✅ ${editingSlug ? "Guardado" : "Publicado"} «${data.item?.title || title}»`;
      deps.setLight("upload", "ok", "Listo");
      if (hasStemFiles) deps.setLight("stems", "ok", "HQ en R2");
      if (hasMasterFile || data.master?.hasMaster) {
        deps.setLight("master", "ok", hasMasterFile ? "Master OK" : "En R2");
      }
      deps.setMixDirty(false);
      deps.setStatus(`✅ ${msg}`);
      deps.showToast(
        hasStemFiles || wantsNewPreviewOnly
          ? `✅ ${msg} · preview web regenerado · stems HQ intactos`
          : `✅ ${msg}`,
        18000,
      );

      const out = document.querySelector("[data-out]");
      if (out instanceof HTMLElement) {
        out.hidden = false;
        out.textContent = JSON.stringify(
          {
            ok: true,
            merged: data.merged,
            keptMedia: data.keptMedia,
            stems: data.stems,
            master: data.master,
            catalogCount: data.catalogCount,
            item: data.item,
          },
          null,
          2,
        );
      }

      await deps.loadPubs();
      const updated =
        deps.getPublications().find((p) => p.slug === slug) ||
        (data.item as Record<string, unknown> | undefined);
      if (updated) {
        deps.setEditMode(updated);
        deps.clearStemsUi();
        deps.syncStemRows();
        form.querySelectorAll('input[type="file"]').forEach((inp) => {
          if (inp instanceof HTMLInputElement) inp.value = "";
        });
        document.querySelectorAll(".preview").forEach((p) => {
          if (p instanceof HTMLElement) {
            p.hidden = true;
            p.innerHTML = "";
          }
        });
        if (hasMasterFile && data.master?.hasMaster) {
          try {
            const vr = await fetch(`/admin/master?slug=${encodeURIComponent(slug)}`, {
              credentials: "same-origin",
              cache: "no-store",
            });
            const vj = (await vr.json()) as {
              ok?: boolean;
              exists?: boolean;
              message?: string;
              bytes?: number | null;
            };
            if (vr.ok && vj.ok && vj.exists) {
              deps.setLight(
                "master",
                "ok",
                vj.bytes != null
                  ? `${(Number(vj.bytes) / (1024 * 1024)).toFixed(2)} MB R2`
                  : "En R2",
              );
              deps.showToast(vj.message || "Master verificado en R2", 12000);
            }
          } catch {
            /* best-effort */
          }
        }
      } else {
        deps.setEditMode(null);
        form.reset();
        deps.clearStemsUi();
        deps.syncStemRows();
      }
    } catch (err) {
      deps.setLight("upload", "err", "Error");
      deps.setStatus(err instanceof Error ? err.message : "Error al publicar", false);
    } finally {
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
    }
  });
}
