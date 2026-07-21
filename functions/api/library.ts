/**
 * GET /api/library — catálogo público vivo (R2), sanitizado.
 */

import { readCatalog, type CatalogBucket } from "../lib/library-catalog";
import { sanitizeCatalogItems } from "../lib/catalog-sanitize";

type Env = {
  LIBRARY_BUCKET?: CatalogBucket;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Tras borrar/publicar en admin, la biblioteca no debe servir catálogo viejo 30s
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

  const raw = await readCatalog(env.LIBRARY_BUCKET);
  if (!raw) {
    return json({
      ok: true,
      source: "empty",
      items: [],
      message: "Catálogo R2 vacío — publica desde /admin/biblioteca/",
    });
  }

  // Público: solo stems con ruido (sin cleanSrc)
  const items = sanitizeCatalogItems(raw, { stripCleanSrc: true });

  return json({
    ok: true,
    source: "r2",
    items,
    count: items.length,
  });
}
