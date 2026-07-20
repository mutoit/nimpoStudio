/**
 * POST /admin/publish
 * Un paso: media → R2 + upsert catálogo vivo.
 * Allowlist MIME/ext, cuotas, aspect/id sanitizados.
 */

import {
  getSessionSigningKey,
  getSessionFromRequest,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { upsertCatalogItem, type CatalogBucket } from "../lib/library-catalog";
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
      opts?: { httpMetadata?: { contentType?: string } },
    ) => Promise<unknown>;
  };
  LIBRARY_PUBLIC_BASE?: string;
  RATE_LIMIT_KV?: RateLimitKv;
};

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
  // Same-origin: el front hace fetch (Web Audio) sin CORS de r2.dev
  const publicBase = "/api/media";

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

  type Uploaded = { role: string; key: string; url: string; name: string };
  const uploaded: Uploaded[] = [];
  let totalBytes = 0;

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

    const fileName = `${fileBase}.${ext}`;
    const key = `library/${slug}/${fileName}`;
    const buf = await file.arrayBuffer();
    await env.LIBRARY_BUCKET!.put(key, buf, {
      httpMetadata: { contentType: contentTypeForExt(ext) },
    });
    const url = `${publicBase}/${key}`;
    uploaded.push({ role, key, url, name: fileName });
    return url;
  };

  try {
    let video: string | null = null;
    let cover: string | null = null;
    let stems: { id: string; label: string; src: string }[] | undefined;

    if (kind === "video") {
      const videoFile = form.get("video");
      if (!(videoFile instanceof File) || !videoFile.size) {
        return json({ ok: false, error: "missing_video" }, 400);
      }
      video = await putFile("video", videoFile, "video", slug);

      const coverFile = form.get("cover");
      if (coverFile instanceof File && coverFile.size) {
        cover = await putFile("cover", coverFile, "image", `${slug}-cover`);
      }
    } else {
      // Canal stems: audio obligatorio; vídeo y cover opcionales (vídeo sirve de miniatura visual)
      const videoFile = form.get("video");
      if (videoFile instanceof File && videoFile.size) {
        video = await putFile("video", videoFile, "video", slug);
      }

      const coverFile = form.get("cover");
      if (coverFile instanceof File && coverFile.size) {
        cover = await putFile("cover", coverFile, "image", `${slug}-cover`);
      }

      const stemItems: { id: string; label: string; src: string }[] = [];
      for (let i = 0; i < MAX_STEMS; i++) {
        const f = form.get(`stem_${i}_file`);
        if (!(f instanceof File) || !f.size) continue;
        if (stemItems.length >= MAX_STEMS) {
          throw new Error("too_many_stems");
        }
        const label = clipText(
          form.get(`stem_${i}_label`) || f.name.replace(/\.[^.]+$/, "") || `Stem ${i + 1}`,
          80,
        );
        const id = safeSlug(label, `stem-${i + 1}`);
        const src = await putFile(`stem_${i}`, f, "audio", `${slug}-${id}`);
        stemItems.push({ id, label, src });
      }
      if (!stemItems.length) {
        return json({ ok: false, error: "missing_stems" }, 400);
      }
      stems = stemItems;
    }

    const item = {
      id: safeItemId(slug),
      slug,
      title,
      kind,
      aspect,
      cover,
      video,
      stems,
      tags,
      moods,
      description: clipText(form.get("description"), 2000),
      notes: clipText(form.get("notes"), 2000),
      year: Number(form.get("year") || new Date().getFullYear()) || new Date().getFullYear(),
      provisional: String(form.get("provisional") || "") === "1",
      licenseEnabled: String(form.get("licenseEnabled") || "1") !== "0",
      availability: "available" as const,
      publishedAt: new Date().toISOString(),
    };

    const catalog = await upsertCatalogItem(env.LIBRARY_BUCKET, item);

    return json({
      ok: true,
      item,
      uploaded,
      catalogCount: catalog.length,
      limits: {
        maxFileMb: MAX_FILE_BYTES / (1024 * 1024),
        maxTotalMb: MAX_TOTAL_BYTES / (1024 * 1024),
        maxStems: MAX_STEMS,
      },
      publicUrl: "https://www.nimpo3dstudio.com/es/biblioteca/",
      message: "Publicado. Ya debería verse en la biblioteca (recarga la página).",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload_failed";
    if (msg === "file_too_large") {
      return json(
        {
          ok: false,
          error: "file_too_large",
          maxMb: MAX_FILE_BYTES / (1024 * 1024),
        },
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
