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
  resolveExt,
  safeAspect,
  safeItemId,
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

/** src = preview público (con ruido bake). cleanSrc = original limpio (admin). */
type StemItem = { id: string; label: string; src: string; cleanSrc?: string };

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
  const kind = String(form.get("kind") || "video") === "stems" ? "stems" : "video";
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
    await env.LIBRARY_BUCKET!.put(key, buf, {
      httpMetadata: {
        contentType: contentTypeForExt(ext),
        cacheControl: "private, max-age=0, must-revalidate",
      },
    });
    const url = `${publicBase}/${key}`;
    uploaded.push({ role, key, url, name: fileName });
    return url;
  };

  try {
    let video: string | null =
      existing && typeof existing.video === "string" ? existing.video : null;
    let cover: string | null =
      existing && typeof existing.cover === "string" ? existing.cover : null;
    let stems: StemItem[] | undefined = Array.isArray(existing?.stems)
      ? (existing!.stems as StemItem[])
      : undefined;

    const videoFile = form.get("video");
    const hasNewVideo = videoFile instanceof File && videoFile.size > 0;
    const coverFile = form.get("cover");
    const hasNewCover = coverFile instanceof File && coverFile.size > 0;

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

      const stemItems: StemItem[] = [];
      for (let i = 0; i < MAX_STEMS; i++) {
        // stem_i_file = con ruido (público). stem_i_clean = original limpio (admin preview).
        const f = form.get(`stem_${i}_file`);
        if (!(f instanceof File) || !f.size) continue;
        if (stemItems.length >= MAX_STEMS) throw new Error("too_many_stems");
        const label = clipText(
          form.get(`stem_${i}_label`) || f.name.replace(/\.[^.]+$/, "") || `Stem ${i + 1}`,
          80,
        );
        const id = safeSlug(label, `stem-${i + 1}`);
        const src = await putFile(`stem_${i}`, f, "audio", `${slug}-${id}`);
        const cleanFile = form.get(`stem_${i}_clean`);
        let cleanSrc: string | undefined;
        if (cleanFile instanceof File && cleanFile.size > 0) {
          cleanSrc = await putFile(
            `stem_${i}_clean`,
            cleanFile,
            "audio",
            `${slug}-${id}-clean`,
          );
        }
        stemItems.push(cleanSrc ? { id, label, src, cleanSrc } : { id, label, src });
      }
      if (stemItems.length) {
        // Nuevos stems → sustituyen la lista
        stems = stemItems;
      } else if (!stems?.length) {
        return json({ ok: false, error: "missing_stems" }, 400);
      }
      // si no hay stems nuevos y ya había: se conservan (incl. cleanSrc si existía)
    }

    const item = {
      id: existing?.id || safeItemId(slug),
      slug,
      title,
      kind,
      aspect,
      cover,
      video,
      stems,
      tags,
      moods,
      filterMoods,
      filterTags,
      description: clipText(form.get("description"), 2000),
      notes: clipText(form.get("notes"), 2000),
      year: Number(form.get("year") || new Date().getFullYear()) || new Date().getFullYear(),
      provisional: String(form.get("provisional") || "") === "1",
      licenseEnabled: String(form.get("licenseEnabled") || "1") !== "0",
      availability: (existing?.availability as string) || "available",
      publishedAt:
        (typeof existing?.publishedAt === "string" && existing.publishedAt) ||
        new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const catalog = await upsertCatalogItem(env.LIBRARY_BUCKET, item);

    return json({
      ok: true,
      item,
      uploaded,
      merged: Boolean(existing),
      keptMedia: {
        video: !hasNewVideo && Boolean(video),
        cover: !hasNewCover && Boolean(cover),
        stems: kind === "stems" && !uploaded.some((u) => u.role.startsWith("stem_")),
      },
      catalogCount: catalog.length,
      limits: {
        maxFileMb: MAX_FILE_BYTES / (1024 * 1024),
        maxTotalMb: MAX_TOTAL_BYTES / (1024 * 1024),
        maxStems: MAX_STEMS,
      },
      publicUrl: "https://www.nimpo3dstudio.com/es/biblioteca/",
      message: existing
        ? "Guardado (se conservó la media que no re-subiste)."
        : "Publicado. Ya debería verse en la biblioteca (recarga la página).",
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
