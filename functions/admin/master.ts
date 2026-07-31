/**
 * GET /admin/master?slug=… — verifica master HQ en R2 (head: size, type, key).
 * Auth admin. Nunca expone el binario; solo metadatos del objeto.
 *
 * Respuesta:
 *  { ok, slug, hasMaster, exists, key, name, bytes, contentType, etag?, catalog? }
 */

import type { AdminEnv } from "../lib/admin-auth";
import { findCatalogItem, type CatalogBucket } from "../lib/library-catalog";
import { isPrivateMasterKey, safeSlug } from "../lib/media-upload";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";

type BucketWithHead = CatalogBucket & {
  head?: (key: string) => Promise<{
    size?: number;
    etag?: string;
    httpMetadata?: { contentType?: string; cacheControl?: string };
  } | null>;
  get: CatalogBucket["get"];
};

type Env = AdminEnv & {
  LIBRARY_BUCKET?: BucketWithHead;
  RATE_LIMIT_KV?: RateLimitKv;
};

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const auth = await requireAdmin(env, request);
  if ("error" in auth && auth.error) return auth.error;
  const bucket = auth.bucket as BucketWithHead;

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-master:${ip}`,
    { limit: 60, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  const url = new URL(request.url);
  const slug = safeSlug(url.searchParams.get("slug") || "", "");
  if (!slug || slug === "item") {
    return json({ ok: false, error: "missing_slug" }, 400);
  }

  const item = await findCatalogItem(bucket, slug);
  if (!item) {
    return json({ ok: false, error: "not_found", slug }, 404);
  }

  const catalogKey = String(item.masterKey || "").trim();
  const catalogName = item.masterName != null ? String(item.masterName) : null;
  const catalogBytes = Number(item.masterBytes);
  const catalogType =
    item.masterContentType != null ? String(item.masterContentType) : null;
  const hasMasterFlag =
    Boolean(item.hasMaster) || (catalogKey && isPrivateMasterKey(catalogKey));

  if (!catalogKey || !isPrivateMasterKey(catalogKey)) {
    return json({
      ok: true,
      slug,
      hasMaster: false,
      exists: false,
      key: null,
      name: null,
      bytes: null,
      contentType: null,
      message: "Esta ficha no tiene masterKey bajo library/…/full/.",
      catalog: {
        hasMaster: Boolean(hasMasterFlag),
        masterName: catalogName,
        masterBytes: Number.isFinite(catalogBytes) ? catalogBytes : null,
        masterContentType: catalogType,
      },
    });
  }

  // Head del objeto en R2 (preferido). Fallback: get metadata vía get body-less no disponible → get + discard.
  let size: number | null = null;
  let contentType: string | null = null;
  let etag: string | null = null;
  let exists = false;

  try {
    if (typeof bucket.head === "function") {
      const h = await bucket.head(catalogKey);
      if (h) {
        exists = true;
        size = Number(h.size || 0) || null;
        contentType = h.httpMetadata?.contentType || null;
        etag = h.etag || null;
      }
    } else {
      const obj = await bucket.get(catalogKey);
      if (obj) {
        exists = true;
        // R2 body object may not expose size on get in all typings — use catalog as hint
        size = Number.isFinite(catalogBytes) && catalogBytes > 0 ? catalogBytes : null;
        contentType = catalogType;
      }
    }
  } catch (e) {
    console.error("[admin/master] head failed", catalogKey, e);
    return json(
      {
        ok: false,
        error: "r2_head_failed",
        slug,
        key: catalogKey,
        message: e instanceof Error ? e.message : "head_failed",
      },
      502,
    );
  }

  // Consistencia catálogo vs R2
  const bytesMatch =
    size != null &&
    Number.isFinite(catalogBytes) &&
    catalogBytes > 0 &&
    size === catalogBytes;
  const typeMatch =
    contentType &&
    catalogType &&
    contentType.toLowerCase() === catalogType.toLowerCase();

  const intact =
    exists &&
    isPrivateMasterKey(catalogKey) &&
    (size == null || size > 0) &&
    // path must be private
    catalogKey.includes("/full/");

  return json({
    ok: true,
    slug,
    hasMaster: true,
    exists,
    intact,
    key: catalogKey,
    name: catalogName || catalogKey.split("/").pop() || null,
    bytes: size,
    contentType,
    etag,
    privatePath: true,
    mediaBlocked: true, // /api/media/*…/full/… → 403
    consistency: {
      bytesMatch: bytesMatch || size == null || !Number.isFinite(catalogBytes),
      typeMatch: typeMatch || !contentType || !catalogType,
      catalogBytes: Number.isFinite(catalogBytes) ? catalogBytes : null,
      catalogContentType: catalogType,
    },
    message: !exists
      ? "Catálogo apunta a masterKey pero el objeto no está en R2."
      : intact
        ? `Master OK en R2 · ${size != null ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "?"} · ${contentType || "type?"}`
        : "Master encontrado con inconsistencias; revisa size/type.",
  });
}
