/**
 * GET /api/product-updates — feed de productos vivo (R2).
 * Separado de /api/updates (Novedades home).
 */

import {
  readProductUpdates,
  type ProductUpdatesBucket,
} from "../lib/product-updates-catalog";

type Env = { LIBRARY_BUCKET?: ProductUpdatesBucket };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=20",
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
    return json({ ok: true, source: "none", items: [] });
  }

  const items = await readProductUpdates(env.LIBRARY_BUCKET);
  if (!items) {
    return json({
      ok: true,
      source: "empty",
      items: [],
      message: "Feed productos vacío — publica desde /admin/productos/",
    });
  }

  return json({
    ok: true,
    source: "r2",
    items,
    count: items.length,
  });
}
