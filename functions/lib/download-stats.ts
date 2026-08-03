/**
 * Contadores de descargas / CTAs demo-beta por producto.
 * Storage: R2 monofile catalog/stats/downloads.json
 * Misma limitación de concurrencia que commerce (volumen bajo ok).
 */

import type { ProductsBucket } from "./products-catalog";
import { safeSlug } from "./media-upload";

export const DOWNLOAD_STATS_KEY = "catalog/stats/downloads.json";

export type DownloadStatKind = "demo" | "web" | "request" | "full";

export type ProductDownloadStats = {
  /** Clics / descargas demo (kind=download o archivo demo) */
  demo: number;
  /** Aperturas demo web */
  web: number;
  /** Solicitudes demo */
  request: number;
  /** Descargas full con licencia (token) */
  full: number;
  lastDemoAt?: string;
  lastWebAt?: string;
  lastRequestAt?: string;
  lastFullAt?: string;
};

export type DownloadStatsStore = {
  v: 1;
  updatedAt: string;
  products: Record<string, ProductDownloadStats>;
  totals: {
    demo: number;
    web: number;
    request: number;
    full: number;
  };
};

const EMPTY_PRODUCT = (): ProductDownloadStats => ({
  demo: 0,
  web: 0,
  request: 0,
  full: 0,
});

const EMPTY_STORE = (): DownloadStatsStore => ({
  v: 1,
  updatedAt: new Date(0).toISOString(),
  products: {},
  totals: { demo: 0, web: 0, request: 0, full: 0 },
});

function normalizeKind(raw: unknown): DownloadStatKind | null {
  const k = String(raw || "").toLowerCase().trim();
  if (k === "demo" || k === "download") return "demo";
  if (k === "web") return "web";
  if (k === "request") return "request";
  if (k === "full" || k === "product" || k === "paid") return "full";
  return null;
}

function sanitizeProduct(raw: unknown): ProductDownloadStats {
  if (!raw || typeof raw !== "object") return EMPTY_PRODUCT();
  const o = raw as Record<string, unknown>;
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
  };
  const iso = (v: unknown) =>
    typeof v === "string" && v.length >= 10 ? v.slice(0, 40) : undefined;
  return {
    demo: n(o.demo),
    web: n(o.web),
    request: n(o.request),
    full: n(o.full),
    lastDemoAt: iso(o.lastDemoAt),
    lastWebAt: iso(o.lastWebAt),
    lastRequestAt: iso(o.lastRequestAt),
    lastFullAt: iso(o.lastFullAt),
  };
}

function recomputeTotals(
  products: Record<string, ProductDownloadStats>,
): DownloadStatsStore["totals"] {
  const totals = { demo: 0, web: 0, request: 0, full: 0 };
  for (const p of Object.values(products)) {
    totals.demo += p.demo;
    totals.web += p.web;
    totals.request += p.request;
    totals.full += p.full;
  }
  return totals;
}

export async function readDownloadStats(
  bucket: ProductsBucket | undefined,
): Promise<DownloadStatsStore> {
  if (!bucket) return EMPTY_STORE();
  try {
    const obj = await bucket.get(DOWNLOAD_STATS_KEY);
    if (!obj) return EMPTY_STORE();
    const data = await obj.json<unknown>();
    if (!data || typeof data !== "object") return EMPTY_STORE();
    const o = data as Record<string, unknown>;
    const productsRaw =
      o.products && typeof o.products === "object"
        ? (o.products as Record<string, unknown>)
        : {};
    const products: Record<string, ProductDownloadStats> = {};
    for (const [slug, val] of Object.entries(productsRaw)) {
      const s = safeSlug(slug, "");
      if (!s || s === "item") continue;
      products[s] = sanitizeProduct(val);
    }
    return {
      v: 1,
      updatedAt:
        typeof o.updatedAt === "string"
          ? o.updatedAt.slice(0, 40)
          : new Date(0).toISOString(),
      products,
      totals: recomputeTotals(products),
    };
  } catch {
    return EMPTY_STORE();
  }
}

export async function writeDownloadStats(
  bucket: ProductsBucket,
  store: DownloadStatsStore,
): Promise<void> {
  const next: DownloadStatsStore = {
    v: 1,
    updatedAt: new Date().toISOString(),
    products: store.products,
    totals: recomputeTotals(store.products),
  };
  await bucket.put(DOWNLOAD_STATS_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/**
 * Incrementa un contador. Best-effort: no lanza al caller si falla I/O.
 * P: bucket + slug válido + kind.
 * Q: +1 en products[slug][kind] y totals.
 */
export async function incrementDownloadStat(
  bucket: ProductsBucket | undefined,
  slugRaw: string,
  kindRaw: unknown,
): Promise<boolean> {
  if (!bucket) return false;
  const kind = normalizeKind(kindRaw);
  if (!kind) return false;
  const slug = safeSlug(slugRaw, "");
  if (!slug || slug === "item") return false;

  try {
    const store = await readDownloadStats(bucket);
    const cur = store.products[slug] || EMPTY_PRODUCT();
    const now = new Date().toISOString();
    const next: ProductDownloadStats = { ...cur, [kind]: (cur[kind] || 0) + 1 };
    if (kind === "demo") next.lastDemoAt = now;
    if (kind === "web") next.lastWebAt = now;
    if (kind === "request") next.lastRequestAt = now;
    if (kind === "full") next.lastFullAt = now;
    store.products[slug] = next;
    await writeDownloadStats(bucket, store);
    return true;
  } catch (err) {
    console.warn("[DOWNLOAD_STATS]", err);
    return false;
  }
}

/** Extrae slug de R2 key library/products/{slug}/demo/... */
export function productSlugFromDemoMediaKey(key: string): string | null {
  const m = /^library\/products\/([^/]+)\/demo\//i.exec(String(key || ""));
  if (!m) return null;
  const slug = safeSlug(m[1] || "", "");
  return slug && slug !== "item" ? slug : null;
}
