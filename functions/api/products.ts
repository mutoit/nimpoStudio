/**
 * GET /api/products — catálogo público software (R2), paginado.
 * Query: limit, cursor, category, slug (detail)
 */

import {
  findProduct,
  readProducts,
  sanitizeProductsList,
  sanitizeSoftwareProduct,
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

/** Strip anything that could point at full/ binaries. */
function publicProduct(p: ReturnType<typeof sanitizeSoftwareProduct>) {
  if (!p) return null;
  const demo = p.demo
    ? {
        kind: p.demo.kind,
        url:
          p.demo.url && !String(p.demo.url).includes("/full/")
            ? p.demo.url
            : null,
        notes: p.demo.notes || "",
      }
    : { kind: "none" as const, url: null, notes: "" };
  return {
    ...p,
    demo,
    pricing: (p.pricing || []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceEur: plan.priceEur,
      buyUrl: plan.buyUrl || null,
    })),
  };
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

  const url = new URL(request.url);
  const slugParam = (url.searchParams.get("slug") || "").trim();

  if (slugParam) {
    const found = await findProduct(env.LIBRARY_BUCKET, slugParam);
    if (!found || found.status === "draft") {
      return json({ ok: false, error: "not_found", source: "r2" }, 404);
    }
    const item = publicProduct(sanitizeSoftwareProduct(found));
    return json({ ok: true, source: "r2", view: "detail", item });
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

  const publicItems = page.items
    .map((rawItem) => publicProduct(sanitizeSoftwareProduct(rawItem)))
    .filter(Boolean);

  return json({
    ok: true,
    source: "r2",
    view: "card",
    items: publicItems,
    count: page.count,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    limit: page.limit,
  });
}
