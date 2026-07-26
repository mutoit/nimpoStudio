/**
 * GET /api/products — catálogo público software (R2), paginado.
 * Query: limit, cursor, category
 */

import {
  readProducts,
  sanitizeProductsList,
  type ProductsBucket,
} from "../lib/products-catalog";
import { filterAndPage } from "../lib/library-query";

type Env = { LIBRARY_BUCKET?: ProductsBucket };

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

  if (!env.LIBRARY_BUCKET) {
    return json({
      ok: true,
      source: "none",
      items: [],
      count: 0,
      nextCursor: null,
      hasMore: false,
      message: "LIBRARY_BUCKET no configurado",
    });
  }

  const raw = await readProducts(env.LIBRARY_BUCKET);
  if (!raw) {
    return json({
      ok: true,
      source: "empty",
      items: [],
      count: 0,
      nextCursor: null,
      hasMore: false,
      message: "Sin productos en R2 — publica desde /admin/productos/",
    });
  }

  const url = new URL(request.url);
  const category = (url.searchParams.get("category") || "").trim().toLowerCase();
  let items = sanitizeProductsList(raw, { includeDraft: false });
  if (category && category !== "all") {
    items = items.filter((p) => p.category === category);
  }

  const page = filterAndPage(items as unknown as Record<string, unknown>[], {
    limit: url.searchParams.get("limit") || "24",
    cursor: url.searchParams.get("cursor"),
    type: "all",
  });

  return json({
    ok: true,
    source: "r2",
    items: page.items,
    count: page.count,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    limit: page.limit,
  });
}
