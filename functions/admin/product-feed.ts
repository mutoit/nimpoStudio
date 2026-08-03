/**
 * Admin feed productos:
 * GET    /admin/product-feed           → lista
 * POST   /admin/product-feed           → publica/edita (multipart)
 * DELETE /admin/product-feed?id=       → borra por id
 */

import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  checkFileSize,
  contentTypeForExt,
  resolveExt,
  safeName,
} from "../lib/media-upload";
import {
  deleteProductUpdate,
  PRODUCT_FEED_MEDIA_PREFIX,
  readProductUpdates,
  sanitizeProductFeedItem,
  sanitizeProductFeedMedia,
  upsertProductUpdate,
  type ProductFeedItem,
  type ProductUpdatesBucket,
} from "../lib/product-updates-catalog";
import {
  findProduct,
  type ProductsBucket,
} from "../lib/products-catalog";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import type { AdminEnv } from "../lib/admin-auth";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

type Env = AdminEnv & {
  LIBRARY_BUCKET?: ProductUpdatesBucket &
    ProductsBucket & {
      put: (
        key: string,
        value: ArrayBuffer | string,
        opts?: {
          httpMetadata?: { contentType?: string; cacheControl?: string };
        },
      ) => Promise<unknown>;
    };
  RATE_LIMIT_KV?: RateLimitKv;
};

async function uploadFeedMedia(
  bucket: NonNullable<Env["LIBRARY_BUCKET"]>,
  file: File,
  role: "image" | "video",
): Promise<string> {
  const max = role === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > max) {
    throw new Error(role === "video" ? "video_too_large" : "image_too_large");
  }
  const sizeErr = checkFileSize(file.size);
  if (sizeErr) throw new Error(sizeErr);

  const ext = resolveExt(file.name, role);
  if (!ext) throw new Error(role === "video" ? "bad_video_type" : "bad_image_type");

  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const base = safeName(file.name.replace(/\.[^.]+$/, "")) || "pfeed";
  const fileName = `${base.slice(0, 40)}-${stamp}.${ext}`;
  const key = `${PRODUCT_FEED_MEDIA_PREFIX}${fileName}`;
  const buf = await file.arrayBuffer();
  await bucket.put(key, buf, {
    httpMetadata: {
      contentType: contentTypeForExt(ext),
      cacheControl: "public, max-age=86400",
    },
  });
  return `/api/media/${key}`;
}

function isSelectableStatus(status: string): boolean {
  return status !== "draft";
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const auth = await requireAdmin(env, request);
  if ("error" in auth && auth.error) return auth.error;
  const bucket = auth.bucket!;

  if (request.method === "GET") {
    const items = (await readProductUpdates(bucket)) || [];
    return json({ ok: true, items, count: items.length });
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) {
      return json({ ok: false, error: "missing_fields", message: "id requerido" }, 400);
    }
    const { items, removed } = await deleteProductUpdate(bucket, id);
    if (!removed) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, count: items.length, message: "Entrada de feed de productos borrada" });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-product-feed:${ip}`,
    { limit: 40, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  const ct = request.headers.get("content-type") || "";
  let raw: Record<string, unknown> = {};
  let imageFile: File | null = null;
  let videoFile: File | null = null;

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      raw = {
        id: form.get("id"),
        productSlug: form.get("productSlug") ?? form.get("slug"),
        summary: form.get("summary") ?? form.get("description"),
        tag: form.get("tag"),
        date: form.get("date"),
        link: form.get("link"),
        image: form.get("imageUrl"),
        video: form.get("videoUrl"),
        keepMedia: form.get("keepMedia"),
      };
      const img = form.get("image") ?? form.get("feedImage");
      if (img instanceof File && img.size > 0) imageFile = img;
      const vid = form.get("video") ?? form.get("feedVideo");
      if (vid instanceof File && vid.size > 0) videoFile = vid;
    } else {
      const body = await request.json();
      if (body && typeof body === "object") raw = body as Record<string, unknown>;
    }
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const productSlug = String(raw.productSlug || "")
    .trim()
    .toLowerCase();
  if (!productSlug) {
    return json(
      { ok: false, error: "missing_fields", message: "Elige un producto publicado" },
      400,
    );
  }

  const product = await findProduct(bucket, productSlug);
  if (!product || !isSelectableStatus(product.status)) {
    return json(
      {
        ok: false,
        error: "product_not_found",
        message: "Producto no encontrado o es borrador",
      },
      400,
    );
  }

  let imageUrl = sanitizeProductFeedMedia(raw.image);
  let videoUrl = sanitizeProductFeedMedia(raw.video);

  // Editar: conservar media previa si no suben archivo nuevo
  const editId = String(raw.id || "").trim();
  if (editId && (raw.keepMedia === "1" || raw.keepMedia === true || raw.keepMedia === "true")) {
    const existing = ((await readProductUpdates(bucket)) || []).find((x) => x.id === editId);
    if (existing) {
      if (!imageFile && !videoFile) {
        imageUrl = existing.image;
        videoUrl = existing.video;
      }
    }
  }

  if (videoFile) {
    try {
      videoUrl = await uploadFeedMedia(bucket, videoFile, "video");
      imageUrl = undefined;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      if (msg === "video_too_large") {
        return json({ ok: false, error: "video_too_large", message: "Vídeo máx. 40 MB" }, 400);
      }
      if (msg === "bad_video_type") {
        return json(
          { ok: false, error: "bad_video_type", message: "Solo vídeo: mp4, webm o mov" },
          400,
        );
      }
      console.error("[admin/product-feed] video", e);
      return json({ ok: false, error: "upload_failed", message: msg }, 500);
    }
  } else if (imageFile) {
    try {
      imageUrl = await uploadFeedMedia(bucket, imageFile, "image");
      videoUrl = undefined;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      if (msg === "image_too_large") {
        return json({ ok: false, error: "image_too_large", message: "Imagen máx. 8 MB" }, 400);
      }
      if (msg === "bad_image_type") {
        return json(
          { ok: false, error: "bad_image_type", message: "Solo imagen: jpg, png, webp o gif" },
          400,
        );
      }
      console.error("[admin/product-feed] image", e);
      return json({ ok: false, error: "upload_failed", message: msg }, 500);
    }
  }

  const item = sanitizeProductFeedItem({
    ...raw,
    id: editId || raw.id,
    productSlug: product.slug,
    productName: product.name,
    summary: raw.summary,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(videoUrl ? { video: videoUrl } : {}),
    link: raw.link || `/es/catalogo/?p=${encodeURIComponent(product.slug)}`,
  });

  if (!item) {
    return json(
      {
        ok: false,
        error: "missing_fields",
        message: "Texto del post obligatorio",
      },
      400,
    );
  }

  try {
    const list = await upsertProductUpdate(bucket, item as ProductFeedItem);
    return json({
      ok: true,
      item,
      count: list.length,
      message: editId ? "Post actualizado." : "Post publicado en el feed de productos.",
    });
  } catch (e) {
    console.error("[admin/product-feed]", e);
    return json({ ok: false, error: "write_failed" }, 500);
  }
}
