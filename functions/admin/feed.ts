/**
 * Admin feed Novedades:
 * GET    /admin/feed              → lista
 * POST   /admin/feed              → publica (multipart o JSON)
 * DELETE /admin/feed?title=&date= → borra entrada
 */

import {
  getSessionFromRequest,
  getSessionSigningKey,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  checkFileSize,
  contentTypeForExt,
  resolveExt,
  safeName,
} from "../lib/media-upload";
import {
  deleteUpdate,
  prependUpdate,
  readUpdates,
  sanitizeFeedImage,
  sanitizeFeedItem,
  type FeedItem,
  type UpdatesBucket,
} from "../lib/updates-catalog";

/** Límite más bajo que publish: miniaturas de feed. */
const MAX_FEED_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

type Env = AdminEnv & {
  LIBRARY_BUCKET?: UpdatesBucket & {
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
  };
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

async function uploadFeedImage(
  bucket: NonNullable<Env["LIBRARY_BUCKET"]>,
  file: File,
): Promise<string> {
  if (file.size > MAX_FEED_IMAGE_BYTES) {
    throw new Error("image_too_large");
  }
  const sizeErr = checkFileSize(file.size);
  if (sizeErr) throw new Error(sizeErr);

  const ext = resolveExt(file.name, "image");
  if (!ext) throw new Error("bad_image_type");

  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const base = safeName(file.name.replace(/\.[^.]+$/, "")) || "feed";
  const fileName = `${base.slice(0, 40)}-${stamp}.${ext}`;
  const key = `library/feed/${fileName}`;
  const buf = await file.arrayBuffer();
  await bucket.put(key, buf, {
    httpMetadata: {
      contentType: contentTypeForExt(ext),
      cacheControl: "public, max-age=86400",
    },
  });
  return `/api/media/${key}`;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const password = (env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) return json({ ok: false, error: "not_configured" }, 503);

  const signingKey = await getSessionSigningKey(env);
  const token = getSessionFromRequest(request);
  if (!signingKey || !(await verifySessionToken(signingKey, token))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  if (request.method === "GET") {
    const items = (await readUpdates(env.LIBRARY_BUCKET)) || [];
    return json({ ok: true, items, count: items.length });
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const title = String(url.searchParams.get("title") || "").trim();
    const date = String(url.searchParams.get("date") || "").trim().slice(0, 10);
    if (!title || !date) {
      return json({ ok: false, error: "missing_fields", message: "title y date requeridos" }, 400);
    }
    const { items, removed } = await deleteUpdate(env.LIBRARY_BUCKET, title, date);
    if (!removed) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, count: items.length, message: "Entrada de feed borrada" });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-feed:${ip}`,
    { limit: 30, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  const ct = request.headers.get("content-type") || "";
  let raw: Record<string, unknown> = {};
  let imageFile: File | null = null;

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      raw = {
        title: form.get("title") ?? form.get("feedTitle"),
        summary: form.get("summary") ?? form.get("feedSummary") ?? form.get("description"),
        tag: form.get("tag") ?? form.get("feedTag"),
        date: form.get("date") ?? form.get("feedDate"),
        image: form.get("imageUrl") ?? form.get("image"),
      };
      const f = form.get("image") ?? form.get("feedImage");
      if (f instanceof File && f.size > 0) imageFile = f;
    } else {
      const body = await request.json();
      if (body && typeof body === "object") raw = body as Record<string, unknown>;
    }
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  let imageUrl = sanitizeFeedImage(raw.image);
  if (imageFile) {
    try {
      imageUrl = await uploadFeedImage(env.LIBRARY_BUCKET, imageFile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      if (msg === "image_too_large") {
        return json(
          { ok: false, error: "image_too_large", message: "Imagen máx. 8 MB" },
          400,
        );
      }
      if (msg === "bad_image_type") {
        return json(
          {
            ok: false,
            error: "bad_image_type",
            message: "Solo imagen: jpg, png, webp o gif",
          },
          400,
        );
      }
      console.error("[admin/feed] image", e);
      return json({ ok: false, error: "upload_failed", message: msg }, 500);
    }
  }

  const item = sanitizeFeedItem({
    ...raw,
    ...(imageUrl ? { image: imageUrl } : {}),
  });
  if (!item) {
    return json(
      {
        ok: false,
        error: "missing_fields",
        message: "title y description/summary son obligatorios",
      },
      400,
    );
  }

  try {
    const list = await prependUpdate(env.LIBRARY_BUCKET, item as FeedItem);
    return json({
      ok: true,
      item,
      count: list.length,
      message: "Feed actualizado. Recarga la home para verlo.",
    });
  } catch (e) {
    console.error("[admin/feed]", e);
    return json({ ok: false, error: "write_failed" }, 500);
  }
}
