/**
 * Submit del form admin biblioteca: meta-only update o publish con bake/preview.
 */

import {
  bakePreviewNoise,
  bakeMixPreview,
  bakeMixPreviewFromUrls,
} from "../preview-noise-bake";
import { compressImageForUpload } from "../admin-image-compress";
import type { AdminMixPreview } from "../admin-mix-preview";
import { normalizeMood } from "./moods";

export type StemRow = { label: string; file: File | null };

export type PublishDeps = {
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

export function bindAdminPublish(deps: PublishDeps) {
  document.querySelector("[data-admin-form]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const btn = form.querySelector("[data-publish]");
    if (btn instanceof HTMLButtonElement) btn.disabled = true;

    const channel = deps.getChannel();
    const editingSlug = deps.getEditingSlug();
    const editingItem = deps.getEditingItem();
    const stemRows = deps.getStemRows();
    let mixDirty = deps.getMixDirty();

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

      const hasVideoFile =
        channel === "video"
          ? !!(form.querySelector("[data-video-file]") as HTMLInputElement)?.files?.[0]
          : !!(form.querySelector("[data-stems-video]") as HTMLInputElement)?.files?.[0];
      const hasCoverFile =
        channel === "video"
          ? !!(form.querySelector("[data-cover-file]") as HTMLInputElement)?.files?.[0]
          : !!(form.querySelector("[data-stems-cover]") as HTMLInputElement)?.files?.[0];
      const hasStemFiles = stemRows.some((r) => r.file);
      const masterFile =
        (form.querySelector("[data-master-file]") as HTMLInputElement)?.files?.[0] || null;
      const hasMasterFile = !!masterFile;
      const hasAnyNewMedia =
        hasVideoFile || hasCoverFile || hasStemFiles || hasMasterFile;

      type ServerStem = { id?: string; label?: string; src?: string; cleanSrc?: string };
      const serverStemsForMix = Array.isArray(editingItem?.stems)
        ? (editingItem!.stems as ServerStem[])
        : [];
      const cleanServerStems = serverStemsForMix.filter(
        (s) => s && String(s.cleanSrc || "").trim(),
      );
      const wantsRemixedNoise =
        !!editingSlug && channel === "stems" && !hasStemFiles && mixDirty;

      if (wantsRemixedNoise && !cleanServerStems.length) {
        throw new Error(
          "Has cambiado el ruido, pero esta ficha no tiene copia limpia en servidor. Arrastra los stems limpios otra vez y publica (solo una vez); luego podrás bajar el ruido a 0% y guardar.",
        );
      }

      if (editingSlug && !hasAnyNewMedia && !wantsRemixedNoise) {
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
        deps.setStatus(
          `✅ ${data.message || "Guardado"} — el audio no se tocó (no moviste el ruido o no había re-bake).`,
        );
        deps.showToast(
          `✅ «${title}» meta guardada · audio igual en servidor`,
          14000,
        );
        await deps.loadPubs();
        const updated =
          deps.getPublications().find((p) => p.slug === editingSlug) ||
          (data.item as Record<string, unknown> | undefined);
        if (updated) deps.setEditMode(updated as Record<string, unknown>);
        deps.setMixDirty(false);
        return;
      }

      const body = new FormData();
      body.set("title", title);
      body.set("slug", slug);
      body.set("kind", channel);
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

      // Master HQ: sin bake, bytes tal cual (campo aparte de stems/preview).
      if (hasMasterFile && masterFile) {
        deps.setLight("master", "loading", "Master…");
        body.set("master", masterFile, masterFile.name);
      }

      if (channel === "video") {
        const v = (form.querySelector("[data-video-file]") as HTMLInputElement)?.files?.[0];
        if (!v && !editingSlug && !hasMasterFile) throw new Error("Elige un vídeo.");
        if (!v && !editingSlug && hasMasterFile) {
          throw new Error("Para publicar nueva ficha en canal vídeo hace falta el vídeo (el master es opcional de entrega).");
        }
        if (v) body.set("video", v, v.name);
        const c = (form.querySelector("[data-cover-file]") as HTMLInputElement)?.files?.[0];
        if (c) {
          const small = await compressImageForUpload(c, { maxEdge: 360, quality: 0.72 });
          body.set("cover", small, small.name);
        }
      } else {
        const v = (form.querySelector("[data-stems-video]") as HTMLInputElement)?.files?.[0];
        if (v) body.set("video", v, v.name);
        const c = (form.querySelector("[data-stems-cover]") as HTMLInputElement)?.files?.[0];
        if (c) {
          const small = await compressImageForUpload(c, { maxEdge: 360, quality: 0.72 });
          body.set("cover", small, small.name);
        }
        const { music01, noise01 } = deps.readMixGains();
        const withFile = stemRows.filter((r) => r.file);
        if (!withFile.length && !editingSlug) {
          throw new Error("Añade al menos un stem con audio.");
        }

        const fetchCleanAsFile = async (url: string, name: string) => {
          const res = await fetch(url, { credentials: "same-origin", cache: "reload" });
          if (!res.ok) throw new Error(`No se pudo bajar limpio (${res.status}): ${name}`);
          const blob = await res.blob();
          const base = name.replace(/[^\w.\-()+ ]+/g, "_") || "stem";
          const ext = (blob.type || "").includes("wav")
            ? "wav"
            : (blob.type || "").includes("mpeg")
              ? "mp3"
              : "wav";
          return new File([blob], `${base}.${ext}`, {
            type: blob.type || "audio/wav",
          });
        };

        const bakedPublic: File[] = [];
        if (withFile.length) {
          deps.mixPreview.stop();
          deps.setLight("stems", "loading", `Bake ${withFile.length}…`);
          deps.setLight("upload", "loading", "Procesando ruido…");
          deps.setStatus(
            `Procesando mezcla (audio ${Math.round(music01 * 100)}% · ruido ${Math.round(noise01 * 100)}%) en ${withFile.length} stem(s)…`,
          );
          let n = 0;
          const layerCount = withFile.length;
          for (const row of withFile) {
            if (!row.file) continue;
            deps.setLight("stems", "loading", `${n + 1}/${layerCount} bake`);
            body.set(`stem_${n}_clean`, row.file, row.file.name);
            let baked = row.file;
            try {
              baked = await bakePreviewNoise(row.file, noise01, music01, layerCount);
            } catch (err) {
              console.warn("[bake noise]", err);
              deps.setLight("stems", "err", "Bake falló (sube original)");
            }
            body.set(`stem_${n}_file`, baked, baked.name);
            body.set(`stem_${n}_label`, row.label || row.file.name);
            bakedPublic.push(baked);
            n++;
          }
        } else if (wantsRemixedNoise && cleanServerStems.length) {
          deps.mixPreview.stop();
          const layerCount = cleanServerStems.length;
          deps.setLight("stems", "loading", `Re-mezcla ${layerCount}…`);
          deps.setLight("upload", "loading", "Bajando limpios + bake…");
          deps.setStatus(
            `Re-aplicando ruido ${Math.round(noise01 * 100)}% desde copias limpias (${layerCount} stem(s))…`,
          );
          let n = 0;
          for (const st of cleanServerStems) {
            const cleanUrl = String(st.cleanSrc || "").trim();
            const label = String(st.label || st.id || `stem-${n + 1}`);
            deps.setLight("stems", "loading", `${n + 1}/${layerCount} limpio`);
            const cleanFile = await fetchCleanAsFile(cleanUrl, label);
            deps.setLight("stems", "loading", `${n + 1}/${layerCount} bake`);
            let baked = cleanFile;
            try {
              baked = await bakePreviewNoise(cleanFile, noise01, music01, layerCount);
            } catch (err) {
              console.warn("[bake noise cleanSrc]", err);
              throw new Error(`No se pudo re-mezclar «${label}». Prueba re-subir stems.`);
            }
            body.set(`stem_${n}_clean`, cleanFile, cleanFile.name);
            body.set(`stem_${n}_file`, baked, baked.name);
            body.set(`stem_${n}_label`, label);
            bakedPublic.push(baked);
            n++;
          }
        }
        if (bakedPublic.length) {
          deps.setStatus("Generando preview mix MP3…");
          deps.setLight("stems", "loading", "Preview MP3…");
          try {
            const mix = await bakeMixPreview(bakedPublic);
            const ext =
              mix.type.includes("mpeg") || mix.name.endsWith(".mp3") ? "mp3" : "wav";
            body.set("preview", mix, `${slug}-preview.${ext}`);
          } catch (err) {
            console.warn("[bake mix preview]", err);
          }
        } else if (editingSlug) {
          const pub = deps.getPublications().find((p) => p.slug === editingSlug) as
            | { stems?: { src?: string }[]; preview?: string }
            | undefined;
          const srcs = (pub?.stems || [])
            .map((s) => String(s.src || "").trim())
            .filter(Boolean);
          if (srcs.length && !pub?.preview) {
            try {
              deps.setStatus("Generando preview MP3 desde stems publicados…");
              const mix = await bakeMixPreviewFromUrls(srcs, {
                credentials: "same-origin",
                cache: "reload",
              });
              const ext =
                mix.type.includes("mpeg") || mix.name.endsWith(".mp3") ? "mp3" : "wav";
              body.set("preview", mix, `${slug}-preview.${ext}`);
            } catch (err) {
              console.warn("[rebuild mix preview]", err);
            }
          }
        }
      }

      deps.mixPreview.stop();
      if (hasVideoFile) deps.setLight("video", "loading", "Subiendo…");
      if (hasCoverFile) deps.setLight("cover", "loading", "Subiendo…");
      if (hasStemFiles) deps.setLight("stems", "loading", "Subiendo…");
      if (hasMasterFile) deps.setLight("master", "loading", "Master R2…");
      deps.setLight("upload", "loading", "Publicando en R2…");
      deps.setStatus(
        editingSlug
          ? hasMasterFile
            ? "Subiendo… master HQ intacto a R2 privado (/full/)."
            : "Subiendo archivos (URL nueva cada vez)…"
          : "Publicando… (subida + catálogo)",
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
            "Tipo no permitido. Vídeo: mp4/webm/mov · Stems: mp3/wav/m4a · Master: wav/flac/aiff/mp3 · Imagen: jpg/png/webp",
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
          throw new Error("Faltan stems y no hay stems previos que conservar.");
        }
        if (err === "missing_video") {
          throw new Error("Falta vídeo y no hay vídeo previo que conservar.");
        }
        throw new Error(data.message || data.error || `Error ${res.status}`);
      }

      const msg =
        data.message ||
        `✅ ${editingSlug ? "Guardado" : "Publicado"} «${data.item?.title || title}»`;
      deps.setLight(
        "upload",
        "ok",
        mixDirty || hasStemFiles ? "Mezcla OK" : "Listo",
      );
      if (hasStemFiles || wantsRemixedNoise) deps.setLight("stems", "ok", "En servidor");
      if (hasMasterFile || data.master?.hasMaster) {
        deps.setLight(
          "master",
          "ok",
          hasMasterFile
            ? `Master ${(Number(data.master?.bytes || masterFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB`
            : "En R2",
        );
      }
      deps.setMixDirty(false);
      deps.setStatus(`✅ ${msg}`);
      deps.showToast(
        hasMasterFile
          ? `✅ ${msg} · master HQ en R2 privado (verifica con «Comprobar R2»)`
          : hasStemFiles || wantsRemixedNoise
            ? `✅ ${msg} · audio con la mezcla actual (Ctrl+F5 en biblioteca)`
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
            catalogCount: data.catalogCount,
            master: data.master,
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
        // Tras subir master: head R2 automático (botón Comprobar R2 también disponible)
        if (hasMasterFile && data.master?.hasMaster) {
          try {
            const vr = await fetch(`/admin/master?slug=${encodeURIComponent(slug)}`, {
              credentials: "same-origin",
              cache: "no-store",
            });
            const vj = (await vr.json()) as {
              ok?: boolean;
              exists?: boolean;
              intact?: boolean;
              bytes?: number | null;
              contentType?: string | null;
              key?: string | null;
              message?: string;
            };
            if (vr.ok && vj.ok && vj.exists) {
              deps.setLight(
                "master",
                vj.intact ? "ok" : "err",
                vj.bytes != null
                  ? `${(Number(vj.bytes) / (1024 * 1024)).toFixed(2)} MB R2`
                  : "En R2",
              );
              deps.showToast(
                vj.message ||
                  `Master verificado en R2 · ${vj.contentType || "?"} · ${vj.key || ""}`,
                14000,
              );
              const vmsg = document.querySelector("[data-master-verify-msg]");
              if (vmsg instanceof HTMLElement) {
                vmsg.hidden = false;
                vmsg.textContent = vj.message || "Master OK en R2";
              }
            }
          } catch {
            /* verify best-effort; el botón Comprobar R2 sigue ahí */
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
