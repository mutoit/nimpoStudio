/**
 * GET /api/updates — feed Novedades vivo (R2).
 */

import { readUpdates, type UpdatesBucket } from "../lib/updates-catalog";

type Env = { LIBRARY_BUCKET?: UpdatesBucket };

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

  const items = await readUpdates(env.LIBRARY_BUCKET);
  if (!items) {
    return json({
      ok: true,
      source: "empty",
      items: [],
      message: "Feed R2 vacío — publica desde /admin/biblioteca/",
    });
  }

  return json({
    ok: true,
    source: "r2",
    items,
    count: items.length,
  });
}
