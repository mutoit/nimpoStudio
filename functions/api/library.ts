/**
 * GET /api/library — catálogo público (R2), list card paginado o detail por slug.
 *
 * List:  ?limit=24&cursor=&mood=&type=all|stems
 * Detail: ?slug=obra
 */

import {
  findCatalogItem,
  readCatalog,
  resolveMoodsVocabulary,
  type CatalogBucket,
} from "../lib/library-catalog";
import {
  sanitizeCatalogItem,
  sanitizeCatalogItems,
  stripCleanSrcFromItem,
  toLibraryCards,
} from "../lib/catalog-sanitize";
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

  // —— Detail ——
  if (slugParam) {
    const raw = await findCatalogItem(env.LIBRARY_BUCKET, slugParam);
    if (!raw) {
      return json({ ok: false, error: "not_found", source: "r2" }, 404);
    }
    const full = sanitizeCatalogItem(raw);
    if (!full || full.availability === "off_catalog") {
      return json({ ok: false, error: "not_found", source: "r2" }, 404);
    }
    const item = stripCleanSrcFromItem(full);
    return json({
      ok: true,
      source: "r2",
      view: "detail",
      item,
    });
  }

  // —— List (cards) ——
  const raw = await readCatalog(env.LIBRARY_BUCKET);
  if (!raw) {
    const moods = await resolveMoodsVocabulary(env.LIBRARY_BUCKET, [], {
      persist: false,
    });
    return json({
      ok: true,
      source: "empty",
      view: "card",
      items: [],
      moods,
      count: 0,
      nextCursor: null,
      hasMore: false,
      message: "Catálogo R2 vacío — publica desde /admin/biblioteca/",
    });
  }

  // Sanitizado full solo en servidor (para flags hasStems/hasVideo); respuesta = cards
  const fullItems = sanitizeCatalogItems(raw, { stripCleanSrc: true });
  const page = filterAndPage(fullItems, {
    mood: url.searchParams.get("mood"),
    type: url.searchParams.get("type") || "all",
    limit: url.searchParams.get("limit"),
    cursor: url.searchParams.get("cursor"),
  });

  const moods = await resolveMoodsVocabulary(env.LIBRARY_BUCKET, [], {
    persist: true,
  });

  return json({
    ok: true,
    source: "r2",
    view: "card",
    items: toLibraryCards(page.items),
    moods,
    count: page.count,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    limit: page.limit,
  });
}
