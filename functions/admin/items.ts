/**
 * Admin catálogo:
 * GET  /admin/items          → lista ítems (auth)
 * DELETE /admin/items?slug=  → borra del catálogo + media R2
 * PATCH  /admin/items        → actualiza metadatos (mantiene media)
 * POST /admin/items          → { action:"update", ... } (mismo que PATCH; más fiable en algunos clients)
 */

import {
  getSessionFromRequest,
  getSessionSigningKey,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  deleteCatalogItem,
  deleteMediaPrefix,
  findCatalogItem,
  readCatalog,
  upsertCatalogItem,
  type CatalogBucket,
} from "../lib/library-catalog";
import { sanitizeCatalogItems } from "../lib/catalog-sanitize";
import {
  clipStringList,
  clipText,
  safeAspect,
  safeSlug,
} from "../lib/media-upload";

type Env = AdminEnv & {
  LIBRARY_BUCKET?: CatalogBucket;
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

async function requireAdmin(env: Env, request: Request) {
  const password = (env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) return { error: json({ ok: false, error: "not_configured" }, 503) };
  const signingKey = await getSessionSigningKey(env);
  const token = getSessionFromRequest(request);
  if (!signingKey || !(await verifySessionToken(signingKey, token))) {
    return { error: json({ ok: false, error: "unauthorized" }, 401) };
  }
  if (!env.LIBRARY_BUCKET) {
    return { error: json({ ok: false, error: "r2_not_configured" }, 503) };
  }
  return { bucket: env.LIBRARY_BUCKET };
}

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
    const raw = (await readCatalog(bucket)) || [];
    const items = sanitizeCatalogItems(raw, { includeOffCatalog: true });
    return json({ ok: true, items, count: items.length });
  }

  if (request.method === "DELETE") {
    const rl = await checkRateLimitAsync(
      `admin-items-del:${ip}`,
      { limit: 40, windowSec: 3600 },
      env.RATE_LIMIT_KV,
    );
    if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

    const url = new URL(request.url);
    const slug = safeSlug(url.searchParams.get("slug") || "", "");
    if (!slug || slug === "item") {
      return json({ ok: false, error: "missing_slug" }, 400);
    }

    const mediaDeleted = await deleteMediaPrefix(bucket, slug);
    const { items, removed } = await deleteCatalogItem(bucket, slug);
    if (!removed) {
      return json({ ok: false, error: "not_found", mediaDeleted }, 404);
    }
    return json({
      ok: true,
      slug,
      mediaDeleted,
      catalogCount: items.length,
      message: `Eliminado «${slug}» (${mediaDeleted} archivo(s) en R2).`,
    });
  }

  const isUpdate =
    request.method === "PATCH" ||
    (request.method === "POST" &&
      (request.headers.get("Content-Type") || "").includes("application/json"));

  if (isUpdate && request.method !== "GET" && request.method !== "DELETE") {
    // POST sin action=update se trata igual si trae slug (compat)
    const rl = await checkRateLimitAsync(
      `admin-items-patch:${ip}`,
      { limit: 40, windowSec: 3600 },
      env.RATE_LIMIT_KV,
    );
    if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }

    // POST genérico: exigir action o slug de update
    if (request.method === "POST") {
      const action = String(body.action || "update");
      if (action !== "update" && action !== "patch") {
        return json({ ok: false, error: "unknown_action" }, 400);
      }
    }

    const slug = safeSlug(String(body.slug || ""), "");
    if (!slug || slug === "item") {
      return json({ ok: false, error: "missing_slug" }, 400);
    }

    const existing = await findCatalogItem(bucket, slug);
    if (!existing) {
      return json(
        {
          ok: false,
          error: "not_found",
          message: `No hay ítem con slug «${slug}» en el catálogo R2.`,
        },
        404,
      );
    }

    const title = clipText(body.title ?? existing.title, 200);
    if (!title) return json({ ok: false, error: "missing_title" }, 400);

    const next = {
      ...existing,
      title,
      aspect: safeAspect(String(body.aspect ?? existing.aspect ?? "1:1")),
      description: clipText(body.description ?? existing.description, 2000),
      notes: clipText(body.notes ?? existing.notes, 2000),
      moods: body.moods != null ? clipStringList(body.moods) : existing.moods,
      tags: body.tags != null ? clipStringList(body.tags) : existing.tags,
      filterMoods:
        body.filterMoods != null
          ? clipStringList(body.filterMoods)
          : existing.filterMoods,
      filterTags:
        body.filterTags != null
          ? clipStringList(body.filterTags)
          : existing.filterTags,
      provisional:
        body.provisional != null
          ? Boolean(body.provisional)
          : Boolean(existing.provisional),
      licenseEnabled:
        body.licenseEnabled != null
          ? Boolean(body.licenseEnabled)
          : existing.licenseEnabled !== false,
      year:
        body.year != null
          ? Number(body.year) || new Date().getFullYear()
          : existing.year,
      updatedAt: new Date().toISOString(),
    };

    const catalog = await upsertCatalogItem(bucket, next);
    return json({
      ok: true,
      item: next,
      catalogCount: catalog.length,
      message: "Cambios guardados. Media en servidor sin tocar.",
    });
  }

  return json({ ok: false, error: "method_not_allowed" }, 405);
}
