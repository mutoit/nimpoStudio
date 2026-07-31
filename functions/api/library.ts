/**
 * GET /api/library — list card paginado (índice ligero) o detail por slug (ítem O(1)).
 */

import {
  findCatalogItem,
  readCatalogIndex,
  resolveMoodsVocabulary,
  type CatalogBucket,
} from "../lib/library-catalog";
import { sanitizeCatalogItem } from "../lib/catalog-sanitize";
import { filterAndPage } from "../lib/library-query";

type Env = {
  LIBRARY_BUCKET?: CatalogBucket;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  if (request.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const url = new URL(request.url);
  const slugParam = (url.searchParams.get("slug") || "").trim();

  if (!env.LIBRARY_BUCKET) {
    if (slugParam) {
      return json({ ok: false, error: "not_found", source: "none" }, 404);
    }
    return json({
      ok: true,
      source: "none",
      view: "card",
      items: [],
      moods: [],
      count: 0,
      nextCursor: null,
      hasMore: false,
      message: "LIBRARY_BUCKET no configurado",
    });
  }

  // —— Detail (per-item O(1) + fallback monofile) ——
  if (slugParam) {
    const raw = await findCatalogItem(env.LIBRARY_BUCKET, slugParam);
    if (!raw) {
      return json({ ok: false, error: "not_found", source: "r2" }, 404);
    }
    // Público: sin stems[] ni masterKey (solo flags + preview)
    const item = sanitizeCatalogItem(raw, { includeDelivery: false });
    if (!item || item.availability === "off_catalog") {
      return json({ ok: false, error: "not_found", source: "r2" }, 404);
    }
    return json({
      ok: true,
      source: "r2",
      view: "detail",
      item,
    });
  }

  // —— List: índice ligero (sin stems) ——
  const index = (await readCatalogIndex(env.LIBRARY_BUCKET)) || [];
  // off_catalog fuera del list público
  const publicIndex = index.filter(
    (x) => !x.availability || x.availability !== "off_catalog",
  ) as unknown as Record<string, unknown>[];

  const page = filterAndPage(publicIndex, {
    mood: url.searchParams.get("mood"),
    type: url.searchParams.get("type") || "all",
    limit: url.searchParams.get("limit"),
    cursor: url.searchParams.get("cursor"),
  });

  const moods = await resolveMoodsVocabulary(env.LIBRARY_BUCKET, [], {
    persist: true,
  });

  // Asegurar shape card (index ya es casi card)
  const items = page.items.map((raw) => {
    const o = raw as Record<string, unknown>;
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      kind: o.kind,
      aspect: o.aspect,
      cover: o.cover ?? null,
      preview: o.preview ?? null,
      hasPreview: Boolean(o.hasPreview || o.preview),
      hasVideo: Boolean(o.hasVideo),
      hasStems: Boolean(o.hasStems),
      hasMaster: Boolean(o.hasMaster),
      stemCount: o.stemCount != null ? Number(o.stemCount) : undefined,
      moods: Array.isArray(o.moods) ? o.moods : [],
      tags: Array.isArray(o.tags) ? o.tags : [],
      availability: o.availability ?? "available",
      licenseEnabled: o.licenseEnabled !== false,
      publishedAt: o.publishedAt,
      updatedAt: o.updatedAt,
      mediaStatus: o.mediaStatus ?? "ready",
    };
  });

  return json({
    ok: true,
    source: "r2",
    view: "card",
    items,
    moods,
    count: page.count,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    limit: page.limit,
  });
}
