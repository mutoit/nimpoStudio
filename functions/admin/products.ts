/**
 * Admin productos software:
 * GET    /admin/products          → lista (auth, incluye draft)
 * POST   /admin/products          → multipart publish/upsert
 * DELETE /admin/products?slug=    → borra catálogo + media
 */

import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  checkFileSize,
  checkTotalSize,
  clipStringList,
  clipText,
  contentTypeForExt,
  resolveExt,
  safeName,
  safeSlug,
} from "../lib/media-upload";
import {
  deleteProduct,
  deleteProductMedia,
  findProduct,
  productIdFromSlug,
  readProducts,
  sanitizeSoftwareProduct,
  upsertProduct,
  type ProductsBucket,
  type SoftwareProduct,
} from "../lib/products-catalog";
import { readDownloadStats } from "../lib/download-stats";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import type { AdminEnv } from "../lib/admin-auth";

type Env = AdminEnv & {
  LIBRARY_BUCKET?: ProductsBucket;
  RATE_LIMIT_KV?: RateLimitKv;
};

const MAX_IMAGES = 8;

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const auth = await requireAdmin(env, request);
  if ("error" in auth && auth.error) return auth.error;
  const bucket = auth.bucket!;
  const ip = clientIp(request);

  if (request.method === "GET") {
    const items = (await readProducts(bucket)) || [];
    const downloadStats = await readDownloadStats(bucket);
    return json({
      ok: true,
      items,
      count: items.length,
      downloadStats: {
        products: downloadStats.products,
        totals: downloadStats.totals,
        updatedAt: downloadStats.updatedAt,
      },
    });
  }

  if (request.method === "DELETE") {
    const rl = await checkRateLimitAsync(
      `admin-products-del:${ip}`,
      { limit: 40, windowSec: 3600 },
      env.RATE_LIMIT_KV,
    );
    if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

    const url = new URL(request.url);
    const slug = safeSlug(url.searchParams.get("slug") || "", "");
    if (!slug || slug === "item") {
      return json({ ok: false, error: "missing_slug" }, 400);
    }

    const mediaDeleted = await deleteProductMedia(bucket, slug);
    const { items, removed } = await deleteProduct(bucket, slug);
    if (!removed) {
      return json({ ok: false, error: "not_found", mediaDeleted }, 404);
    }
    return json({
      ok: true,
      message: "Producto borrado",
      mediaDeleted,
      count: items.length,
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const rl = await checkRateLimitAsync(
    `admin-products:${ip}`,
    { limit: 20, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_form" }, 400);
  }

  const name = clipText(form.get("name") || form.get("title"), 160);
  if (!name) return json({ ok: false, error: "missing_name", message: "Nombre obligatorio" }, 400);

  const slug = safeSlug(String(form.get("slug") || ""), name);
  const existing = await findProduct(bucket, slug);

  const category =
    clipText(form.get("category"), 48).toLowerCase().replace(/\s+/g, "-") ||
    existing?.category ||
    "other";

  let status = String(form.get("status") || existing?.status || "published");
  if (
    status !== "published" &&
    status !== "draft" &&
    status !== "coming-soon" &&
    status !== "beta" &&
    status !== "demo"
  ) {
    status = "published";
  }

  const shortDescription = clipText(
    form.get("shortDescription") || form.get("short"),
    280,
  );
  const description = clipText(form.get("description") || form.get("body"), 4000);
  if (!description && !existing?.description) {
    return json(
      { ok: false, error: "missing_description", message: "Descripción obligatoria" },
      400,
    );
  }

  const tagsRaw = String(form.get("tags") || "");
  const tags = clipStringList(
    tagsRaw
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean),
    16,
    40,
  );
  const formatsRaw = String(form.get("formats") || "");
  const formats = clipStringList(
    formatsRaw
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean),
    12,
    32,
  );
  const featured =
    form.get("featured") === "1" ||
    form.get("featured") === "on" ||
    form.get("featured") === "true";

  const demoKind = clipText(form.get("demoKind"), 20) || existing?.demo?.kind || "none";
  const demoUrl = clipText(form.get("demoUrl"), 500) || existing?.demo?.url || "";
  const demoNotes = clipText(form.get("demoNotes"), 500);
  const planName = clipText(form.get("planName"), 80);
  // Beta/demo: precio no obligatorio (vacío → null). Decimales OK (9.90).
  const priceEurRaw = String(form.get("priceEur") ?? "").trim();
  const priceEurForItem =
    priceEurRaw === "" && (status === "beta" || status === "demo")
      ? ""
      : priceEurRaw;
  const buyUrl = clipText(form.get("buyUrl"), 500);
  const stripePriceId = clipText(form.get("stripePriceId"), 80);
  const version = clipText(form.get("version"), 40);

  let totalBytes = 0;
  const putFile = async (
    file: File,
    mediaRole: "image" | "video" | "bin",
    fileBase: string,
    subdir?: string,
  ): Promise<string> => {
    const sizeErr = checkFileSize(file.size);
    if (sizeErr) throw new Error(sizeErr);
    totalBytes += file.size;
    const totalErr = checkTotalSize(totalBytes);
    if (totalErr) throw new Error(totalErr);
    let ext = resolveExt(file.name, mediaRole === "bin" ? "image" : mediaRole);
    if (mediaRole === "bin") {
      const n = file.name.toLowerCase();
      const m = n.match(/\.([a-z0-9]{1,8})$/);
      ext = m?.[1] || "bin";
      // allow zip/exe/msi/dmg/7z
      if (!/^(zip|7z|rar|exe|msi|dmg|pkg|tar|gz|tgz|appimage|bin)$/i.test(ext)) {
        throw new Error("bad_extension:bin");
      }
    }
    if (!ext) throw new Error(`bad_extension:${mediaRole}`);
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const fileName = `${safeName(fileBase).slice(0, 40) || mediaRole}-${stamp}.${ext}`;
    const key = subdir
      ? `library/products/${slug}/${subdir}/${fileName}`
      : `library/products/${slug}/${fileName}`;
    const buf = await file.arrayBuffer();
    await bucket.put(key, buf, {
      httpMetadata: {
        contentType:
          mediaRole === "bin"
            ? "application/octet-stream"
            : contentTypeForExt(ext),
        cacheControl: mediaRole === "bin" ? "private, no-store" : "public, max-age=86400",
      },
    });
    return mediaRole === "bin" ? key : `/api/media/${key}`;
  };

  try {
    // Por defecto: conservar media al editar. Solo se vacía si replaceMedia=1.
    let images: string[] = existing?.images ? [...existing.images] : [];
    let video: string | null = existing?.video ?? null;

    const replaceMedia = form.get("replaceMedia") === "1";
    if (replaceMedia) {
      images = [];
      video = null;
    }

    const imageFiles = form.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
    const singleImage = form.get("image");
    if (singleImage instanceof File && singleImage.size > 0) {
      imageFiles.push(singleImage);
    }

    // Nuevas imágenes → se suman a las existentes (máx MAX_IMAGES). No sustituyen salvo replaceMedia.
    let imagesAdded = 0;
    if (imageFiles.length) {
      const room = Math.max(0, MAX_IMAGES - images.length);
      const toUpload = imageFiles.slice(0, room);
      for (const file of toUpload) {
        images.push(await putFile(file, "image", "img"));
        imagesAdded++;
      }
      images = images.slice(0, MAX_IMAGES);
    }

    // Vídeo: solo cambia si subes uno nuevo. Sin archivo → se mantiene el anterior.
    // (Con replaceMedia y sin archivo nuevo, video ya quedó null arriba.)
    const videoFile = form.get("video");
    let videoReplaced = false;
    if (videoFile instanceof File && videoFile.size > 0) {
      video = await putFile(videoFile, "video", "video");
      videoReplaced = true;
    }

    let fullKey: string | null = existing?.fullKey ?? null;
    let fullUploaded = false;
    const fullFile = form.get("full");
    if (fullFile instanceof File && fullFile.size > 0) {
      fullKey = await putFile(fullFile, "bin", "full", "full");
      fullUploaded = true;
    }

    // Demo binary upload → public media under demo/
    let demoUrlResolved = demoUrl || existing?.demo?.url || "";
    let demoUploaded = false;
    const demoFile = form.get("demoFile");
    if (demoFile instanceof File && demoFile.size > 0) {
      const demoKey = await putFile(demoFile, "bin", "demo", "demo");
      // putFile for bin returns raw key — expose via /api/media (demo/ allowed)
      demoUrlResolved = `/api/media/${demoKey}`;
      demoUploaded = true;
    }

    const itemRaw: Record<string, unknown> = {
      id: existing?.id || productIdFromSlug(slug),
      slug,
      name,
      category,
      status,
      shortDescription: shortDescription || existing?.shortDescription || "",
      description: description || existing?.description || "",
      images,
      video,
      tags: tags.length ? tags : existing?.tags || [],
      formats: formats.length ? formats : existing?.formats || [],
      featured,
      demoKind,
      demoUrl: demoUrlResolved,
      demoNotes: demoNotes || existing?.demo?.notes || "",
      planName: planName || existing?.pricing?.[0]?.name || "Standard",
      priceEur:
        priceEurForItem !== ""
          ? priceEurForItem
          : status === "beta" || status === "demo"
            ? ""
            : (existing?.pricing?.[0]?.priceEur ?? ""),
      buyUrl: buyUrl || existing?.pricing?.[0]?.buyUrl || "",
      stripePriceId: stripePriceId || existing?.pricing?.[0]?.stripePriceId || "",
      version: version || existing?.version || "",
      fullKey,
      demo: existing?.demo,
      pricing: existing?.pricing,
    };

    const clean = sanitizeSoftwareProduct(itemRaw);
    if (!clean) {
      return json({ ok: false, error: "invalid_item" }, 400);
    }

    const list = await upsertProduct(bucket, clean);
    const fullNote = fullUploaded
      ? "full subido"
      : fullKey
        ? existing
          ? "full sin cambios"
          : "full en R2"
        : existing
          ? "sin full"
          : null;
    const demoNote = demoUploaded
      ? "demo subido"
      : demoUrlResolved
        ? existing
          ? "demo sin cambios"
          : "demo listo"
        : existing
          ? "sin demo"
          : null;
    const mediaNote = [
      imagesAdded > 0 ? `+${imagesAdded} img` : null,
      videoReplaced ? "vídeo actualizado" : null,
      fullNote,
      demoNote,
      replaceMedia
        ? "media reemplazada"
        : existing && imagesAdded === 0 && !videoReplaced
          ? "media anterior conservada"
          : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return json({
      ok: true,
      item: clean,
      count: list.length,
      bins: {
        full: fullUploaded ? "uploaded" : fullKey ? "kept" : "none",
        demo: demoUploaded ? "uploaded" : demoUrlResolved ? "kept" : "none",
        fullKey: fullKey || null,
        demoUrl: demoUrlResolved || null,
      },
      message: existing
        ? `Producto actualizado${mediaNote ? ` (${mediaNote})` : ""}`
        : `Producto publicado${mediaNote ? ` (${mediaNote})` : ""}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload_failed";
    console.error("[admin/products]", e);
    if (msg.startsWith("bad_extension")) {
      return json(
        {
          ok: false,
          error: "bad_extension",
          message: "Formatos: imágenes jpg/png/webp/gif · vídeo mp4/webm/mov",
        },
        400,
      );
    }
    if (msg === "file_too_large" || msg === "total_too_large") {
      return json(
        {
          ok: false,
          error: msg,
          message: "Archivo o total demasiado grande (máx 90 MB por petición). Comprime el vídeo (H.264) a menos de 90 MB.",
        },
        400,
      );
    }
    return json({ ok: false, error: "upload_failed", message: msg }, 500);
  }
}
