/**
 * POST /admin/publish
 * Media → R2 + upsert catálogo.
 * Si el slug ya existe: fusiona (conserva vídeo/stems/cover que no se reenvían).
 * No borra el prefijo entero al editar (evita perder archivos al cambiar un tag).
 */

import {
  getSessionSigningKey,
  getSessionFromRequest,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  findCatalogItem,
  resolveMoodsVocabulary,
  upsertCatalogItem,
  type CatalogBucket,
} from "../lib/library-catalog";
import {
  MAX_FILE_BYTES,
  MAX_STEMS,
  MAX_TOTAL_BYTES,
  checkFileSize,
  checkTotalSize,
  clipStringList,
  clipText,
  contentTypeForExt,
  isPrivateMasterKey,
  resolveExt,
  safeAspect,
  safeItemId,
  safeName,
  safeSlug,
} from "../lib/media-upload";

type Env = AdminEnv & {
  LIBRARY_BUCKET?: CatalogBucket & {
    put: (
      key: string,
      value: ArrayBuffer | string,
      opts?: {
        httpMetadata?: {
          contentType?: string;
          cacheControl?: string;
        };
      },
    ) => Promise<unknown>;
    list?: CatalogBucket["list"];
    delete?: CatalogBucket["delete"];
  };
  LIBRARY_PUBLIC_BASE?: string;
  RATE_LIMIT_KV?: RateLimitKv;
};

/**
 * Stem de entrega (HQ). key = R2 bajo library/{slug}/full/stems/…
 * Nunca se sirve por /api/media público. Preview de biblioteca = item.preview (1 mix).
 */
type StemItem = { id: string; label: string; key: string };

/** Extrae key R2 desde key cruda o URL /api/media/… (legacy). */
function mediaRefToKey(raw: unknown): string {
  let u = String(raw || "").trim();
  if (!u) return "";
  if (u.startsWith("library/")) return u.split("?")[0] || u;
  if (u.startsWith("/api/media/")) {
    u = u.slice("/api/media/".length).split("?")[0] || "";
    return u.startsWith("library/") ? u : "";
  }
  try {
    const parsed = new URL(u, "https://www.nimpo3dstudio.com");
    if (parsed.pathname.startsWith("/api/media/")) {
      const k = parsed.pathname.slice("/api/media/".length);
      return k.startsWith("library/") ? k : "";
    }
  } catch {
    /* */
  }
  return "";
}

function normalizeExistingStems(raw: unknown): StemItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StemItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const label = clipText(o.label || o.id || `Stem ${i + 1}`, 80);
    const id = safeSlug(String(o.id || label), `stem-${i + 1}`);
    // Preferir key privada; legacy: cleanSrc (HQ) luego src (preview viejo)
    const key =
      mediaRefToKey(o.key) ||
      mediaRefToKey(o.cleanSrc) ||
      mediaRefToKey(o.src);
    if (!key) continue;
    out.push({ id, label, key });
  }
  return out;
}

type MasterMeta = {
  masterKey: string | null;
  masterName: string | null;
  masterBytes: number | null;
  masterContentType: string | null;
  hasMaster: boolean;
};

function readExistingMaster(existing: Record<string, unknown> | null): MasterMeta {
  const key = existing ? String(existing.masterKey || "").trim() : "";
  if (!key || !isPrivateMasterKey(key)) {
    return {
      masterKey: null,
      masterName: null,
      masterBytes: null,
      masterContentType: null,
      hasMaster: false,
    };
  }
  const bytes = Number(existing?.masterBytes);
  return {
    masterKey: key,
    masterName: String(existing?.masterName || key.split("/").pop() || "master").slice(0, 160),
    masterBytes: Number.isFinite(bytes) && bytes > 0 ? bytes : null,
    masterContentType: String(existing?.masterContentType || "audio/wav").slice(0, 80),
    hasMaster: true,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const password = (env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) return json({ ok: false, error: "not_configured" }, 503);

  const signingKey = await getSessionSigningKey(env);
  const token = getSessionFromRequest(request);
  if (!signingKey || !(await verifySessionToken(signingKey, token))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-publish:${ip}`,
    { limit: 15, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_form" }, 400);
  }

  const title = clipText(form.get("title"), 200);
  if (!title) return json({ ok: false, error: "missing_title" }, 400);

  const slug = safeSlug(String(form.get("slug") || ""), title);
  // Canal admin o presencia de stems → siempre clasificar como stems
  const kindFromForm = String(form.get("kind") || "video") === "stems" ? "stems" : "video";
  let kind: "stems" | "video" = kindFromForm;
  const aspect = safeAspect(String(form.get("aspect") || "1:1"));
  const publicBase = "/api/media";

  const existing = (await findCatalogItem(env.LIBRARY_BUCKET, slug)) || null;

  const parseList = (raw: FormDataEntryValue | null) => {
    if (!raw) return [] as string[];
    try {
      const j = JSON.parse(String(raw));
      return clipStringList(Array.isArray(j) ? j : []);
    } catch {
      return clipStringList(
        String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  };

  const moods = parseList(form.get("moods"));
  const tags = parseList(form.get("tags"));
  const filterMoods = parseList(form.get("filterMoods")).filter((m) => moods.includes(m));
  const filterTags = parseList(form.get("filterTags")).filter((t) => tags.includes(t));

  type Uploaded = { role: string; key: string; url: string; name: string };
  const uploaded: Uploaded[] = [];
  let totalBytes = 0;

  /** Cada subida = clave única (evita oír WAV/vídeo viejo por caché del mismo path). */
  const putFile = async (
    role: string,
    file: File,
    mediaRole: "video" | "audio" | "image",
    fileBase: string,
  ) => {
    const sizeErr = checkFileSize(file.size);
    if (sizeErr) throw new Error(sizeErr);

    totalBytes += file.size;
    const totalErr = checkTotalSize(totalBytes);
    if (totalErr) throw new Error(totalErr);

    const ext = resolveExt(file.name, mediaRole);
    if (!ext) throw new Error(`bad_extension:${mediaRole}:${file.name}`);

    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const fileName = `${fileBase}-${stamp}.${ext}`;
    const key = `library/${slug}/${fileName}`;
    const buf = await file.arrayBuffer();
    const isImage = mediaRole === "image";
    await env.LIBRARY_BUCKET!.put(key, buf, {
      httpMetadata: {
        contentType: contentTypeForExt(ext),
        // Covers con stamp en nombre: cacheables (el admin comprime a ~480px).
        cacheControl: isImage
          ? "public, max-age=604800, stale-while-revalidate=86400"
          : "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
    const url = `${publicBase}/${key}`;
    uploaded.push({ role, key, url, name: fileName });
    return url;
  };

  /**
   * Master o stem HQ: bytes intactos bajo library/{slug}/full/…
   * No se sirve por /api/media (403). Admin: GET /admin/media?key=
   */
  const putPrivateAudio = async (
    role: "master" | "stem",
    file: File,
    subdir: "full" | "full/stems",
    fileBase: string,
  ) => {
    const sizeErr = checkFileSize(file.size);
    if (sizeErr) throw new Error(sizeErr);

    totalBytes += file.size;
    const totalErr = checkTotalSize(totalBytes);
    if (totalErr) throw new Error(totalErr);

    const ext = resolveExt(file.name, "master");
    if (!ext) throw new Error(`bad_extension:${role}:${file.name}`);

    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const base = safeName(fileBase || file.name.replace(/\.[^.]+$/, "")) || role;
    const fileName = `${base.slice(0, 60)}-${stamp}.${ext}`;
    const key = `library/${slug}/${subdir}/${fileName}`;
    const buf = await file.arrayBuffer();
    const contentType = contentTypeForExt(ext);
    await env.LIBRARY_BUCKET!.put(key, buf, {
      httpMetadata: {
        contentType,
        cacheControl: "private, no-store",
      },
    });
    uploaded.push({ role, key, url: "", name: fileName });
    return { key, fileName, contentType, bytes: file.size };
  };

  const putMaster = async (file: File) => {
    const put = await putPrivateAudio(
      "master",
      file,
      "full",
      safeName(file.name.replace(/\.[^.]+$/, "")) || "master",
    );
    return {
      masterKey: put.key,
      masterName: put.fileName,
      masterBytes: put.bytes,
      masterContentType: put.contentType,
      hasMaster: true as const,
    };
  };

  try {
    let video: string | null =
      existing && typeof existing.video === "string" ? existing.video : null;
    let cover: string | null =
      existing && typeof existing.cover === "string" ? existing.cover : null;
    let preview: string | null =
      existing && typeof (existing as { preview?: string }).preview === "string"
        ? String((existing as { preview: string }).preview)
        : null;
    // Normaliza legacy src/cleanSrc → key
    let stems: StemItem[] | undefined = (() => {
      const n = normalizeExistingStems(existing?.stems);
      return n.length ? n : undefined;
    })();

    const videoFile = form.get("video");
    const hasNewVideo = videoFile instanceof File && videoFile.size > 0;
    const coverFile = form.get("cover");
    const hasNewCover = coverFile instanceof File && coverFile.size > 0;
    const previewFile = form.get("preview");
    const hasNewPreview = previewFile instanceof File && previewFile.size > 0;

    if (kind === "video") {
      if (hasNewVideo) {
        video = await putFile("video", videoFile as File, "video", slug);
      } else if (!video) {
        return json({ ok: false, error: "missing_video" }, 400);
      }
      if (hasNewCover) {
        cover = await putFile("cover", coverFile as File, "image", `${slug}-cover`);
      }
    } else {
      if (hasNewVideo) {
        video = await putFile("video", videoFile as File, "video", slug);
      }
      if (hasNewCover) {
        cover = await putFile("cover", coverFile as File, "image", `${slug}-cover`);
      }

      // stem_i_file = HQ original intacto → full/stems/ (NO bake)
      const stemItems: StemItem[] = [];
      for (let i = 0; i < MAX_STEMS; i++) {
        const f = form.get(`stem_${i}_file`);
        if (!(f instanceof File) || !f.size) continue;
        if (stemItems.length >= MAX_STEMS) throw new Error("too_many_stems");
        const label = clipText(
          form.get(`stem_${i}_label`) || f.name.replace(/\.[^.]+$/, "") || `Stem ${i + 1}`,
          80,
        );
        const id = safeSlug(label, `stem-${i + 1}`);
        const put = await putPrivateAudio("stem", f as File, "full/stems", `${id}`);
        stemItems.push({ id, label, key: put.key });
      }
      if (stemItems.length) {
        stems = stemItems;
      } else if (!stems?.length) {
        return json({ ok: false, error: "missing_stems" }, 400);
      }
      // sin stems nuevos: se conservan keys previas (HQ)
    }

    // Único audio público de biblioteca: mix preview (generado en cliente)
    if (hasNewPreview) {
      preview = await putFile("preview", previewFile as File, "audio", `${slug}-preview`);
    }

    // Master HQ (opcional): sin bake, bytes intactos, privado bajo /full/
    let master = readExistingMaster(existing);
    const masterFile = form.get("master");
    const hasNewMaster = masterFile instanceof File && masterFile.size > 0;
    if (hasNewMaster) {
      master = await putMaster(masterFile as File);
    }

    // Si hay capas de audio, forzar kind stems (clasificación canónica)
    if (Array.isArray(stems) && stems.length > 0) {
      kind = "stems";
    }

    const item = {
      id: existing?.id || safeItemId(slug),
      slug,
      title,
      kind,
      aspect,
      cover,
      video,
      preview,
      stems,
      hasStems: Array.isArray(stems) && stems.length > 0,
      // Master: clave R2 privada (no URL pública). Meta para admin + hasMaster flag.
      masterKey: master.masterKey,
      masterName: master.masterName,
      masterBytes: master.masterBytes,
      masterContentType: master.masterContentType,
      hasMaster: master.hasMaster,
      tags,
      moods,
      filterMoods,
      filterTags,
      description: clipText(form.get("description"), 2000),
      notes: clipText(form.get("notes"), 2000),
      year: Number(form.get("year") || new Date().getFullYear()) || new Date().getFullYear(),
      provisional: false,
      licenseEnabled: String(form.get("licenseEnabled") || "1") !== "0",
      availability: (existing?.availability as string) || "available",
      /** ready | processing — escala: upload async futuro */
      mediaStatus: "ready" as const,
      publishedAt:
        (typeof existing?.publishedAt === "string" && existing.publishedAt) ||
        new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const catalog = await upsertCatalogItem(env.LIBRARY_BUCKET, item);
    const moodsVocab = await resolveMoodsVocabulary(
      env.LIBRARY_BUCKET,
      [...moods, ...filterMoods],
      { persist: true },
    );

    // Admin recibe keys de stems (privadas) + master meta; no URLs públicas de HQ
    return json({
      ok: true,
      item: {
        ...item,
        // masterKey solo en bloque master
        masterKey: undefined,
      },
      stems: (stems || []).map((s) => ({ id: s.id, label: s.label, key: s.key })),
      master: master.hasMaster
        ? {
            hasMaster: true,
            name: master.masterName,
            bytes: master.masterBytes,
            contentType: master.masterContentType,
            key: master.masterKey,
            uploadedNow: hasNewMaster,
          }
        : { hasMaster: false },
      moods: moodsVocab,
      uploaded: uploaded.map((u) =>
        u.role === "master" || u.role === "stem" ? { ...u, url: undefined } : u,
      ),
      merged: Boolean(existing),
      keptMedia: {
        video: !hasNewVideo && Boolean(video),
        cover: !hasNewCover && Boolean(cover),
        stems: kind === "stems" && !uploaded.some((u) => u.role === "stem"),
        master: !hasNewMaster && master.hasMaster,
        preview: !hasNewPreview && Boolean(preview),
      },
      catalogCount: catalog.length,
      limits: {
        maxFileMb: MAX_FILE_BYTES / (1024 * 1024),
        maxTotalMb: MAX_TOTAL_BYTES / (1024 * 1024),
        maxStems: MAX_STEMS,
      },
      publicUrl: "https://www.nimpo3dstudio.com/es/biblioteca/",
      message: existing
        ? hasNewPreview
          ? "Guardado. Preview web (mix) actualizado; stems HQ intactos."
          : hasNewMaster
            ? "Guardado. Master HQ en R2 privado."
            : "Guardado (media no re-subida se conserva)."
        : "Publicado. Biblioteca usa solo el preview; stems/master privados.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload_failed";
    if (msg === "file_too_large") {
      return json(
        { ok: false, error: "file_too_large", maxMb: MAX_FILE_BYTES / (1024 * 1024) },
        413,
      );
    }
    if (msg === "total_too_large") {
      return json(
        {
          ok: false,
          error: "total_too_large",
          maxTotalMb: MAX_TOTAL_BYTES / (1024 * 1024),
        },
        413,
      );
    }
    if (msg === "too_many_stems") {
      return json({ ok: false, error: "too_many_stems", max: MAX_STEMS }, 400);
    }
    if (msg.startsWith("bad_extension")) {
      return json(
        {
          ok: false,
          error: "bad_extension",
          detail: msg,
          allowed: {
            video: ["mp4", "webm", "mov"],
            audio: ["mp3", "wav", "m4a", "ogg", "aac"],
            master: ["wav", "flac", "aiff", "aif", "mp3", "m4a", "ogg", "aac"],
            image: ["jpg", "jpeg", "png", "webp"],
          },
        },
        400,
      );
    }
    console.error("[admin/publish]", e);
    return json({ ok: false, error: "upload_failed", detail: msg }, 500);
  }
}
