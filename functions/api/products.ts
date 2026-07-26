/**
 * GET /api/products — catálogo público de productos software (R2).
 */

import {
  readProducts,
  sanitizeProductsList,
  type ProductsBucket,
} from "../lib/products-catalog";

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
      message: "LIBRARY_BUCKET no configurado",
    });
  }

  const raw = await readProducts(env.LIBRARY_BUCKET);
  if (!raw) {
    return json({
      ok: true,
      source: "empty",
      items: [],
      message: "Sin productos en R2 — publica desde /admin/productos/",
    });
  }

  const items = sanitizeProductsList(raw, { includeDraft: false });
  return json({
    ok: true,
    source: "r2",
    items,
    count: items.length,
  });
}
