/**
 * Feed de productos vivo en R2 (catalog/product-updates.json).
 * Separado de catalog/updates.json (Novedades home).
 */

export const PRODUCT_UPDATES_KEY = "catalog/product-updates.json";
export const PRODUCT_FEED_MEDIA_PREFIX = "library/product-feed/";

export type ProductUpdatesBucket = {
  get: (key: string) => Promise<{
    text: () => Promise<string>;
    json: <T>() => Promise<T>;
  } | null>;
  put: (
    key: string,
    value: string | ArrayBuffer,
    opts?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
};

export type ProductFeedTag = "nuevo" | "mejora" | "fix" | "proximo" | "update";

export type ProductFeedItem = {
  id: string;
  date: string;
  productSlug: string;
  productName: string;
  summary: string;
  tag: ProductFeedTag;
  image?: string;
  video?: string;
  link?: string;
};

const TAGS = new Set<string>(["nuevo", "mejora", "fix", "proximo", "update"]);

export function newProductFeedId(): string {
  return `pf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Solo media same-origin del product-feed (o library genérica pública). */
export function sanitizeProductFeedMedia(raw: unknown): string | undefined {
  const u = String(raw || "")
    .trim()
    .slice(0, 512);
  if (!u) return undefined;
  if (u.startsWith("/api/media/library/product-feed/")) return u;
  if (u.startsWith("/api/media/library/")) return u;
  if (u.startsWith("library/product-feed/")) return `/api/media/${u}`;
  if (u.startsWith("library/")) return `/api/media/${u}`;
  return undefined;
}

export function sanitizeProductFeedLink(raw: unknown): string | undefined {
  const u = String(raw || "")
    .trim()
    .slice(0, 500);
  if (!u) return undefined;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^https:\/\/(www\.)?nimpo3dstudio\.com(\/|\?|#|$)/i.test(u)) return u;
  if (/^https:\/\/nimpo-studio\.pages\.dev(\/|\?|#|$)/i.test(u)) return u;
  return undefined;
}

export function sanitizeProductFeedItem(raw: unknown): ProductFeedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const productSlug = String(o.productSlug || o.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
  const productName = String(o.productName || o.name || "")
    .trim()
    .slice(0, 160);
  const summary = String(o.summary || o.description || "")
    .trim()
    .slice(0, 800);
  if (!productSlug || !productName || !summary) return null;

  let id = String(o.id || "")
    .trim()
    .slice(0, 64);
  if (!/^pf_[a-z0-9]+$/i.test(id)) id = newProductFeedId();

  let tag = String(o.tag || "update");
  if (!TAGS.has(tag)) tag = "update";

  let date = String(o.date || "")
    .trim()
    .slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    date = new Date().toISOString().slice(0, 10);
  }

  const video = sanitizeProductFeedMedia(o.video);
  const image = video ? undefined : sanitizeProductFeedMedia(o.image);
  const link =
    sanitizeProductFeedLink(o.link) ||
    `/es/catalogo/?p=${encodeURIComponent(productSlug)}`;

  return {
    id,
    date,
    productSlug,
    productName,
    summary,
    tag: tag as ProductFeedTag,
    ...(image ? { image } : {}),
    ...(video ? { video } : {}),
    ...(link ? { link } : {}),
  };
}

export async function readProductUpdates(
  bucket: ProductUpdatesBucket | undefined,
): Promise<ProductFeedItem[] | null> {
  if (!bucket) return null;
  const obj = await bucket.get(PRODUCT_UPDATES_KEY);
  if (!obj) return null;
  try {
    const data = await obj.json<unknown>();
    if (!Array.isArray(data)) return null;
    return data
      .map(sanitizeProductFeedItem)
      .filter((x): x is ProductFeedItem => x != null)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  } catch {
    return null;
  }
}

export async function writeProductUpdates(
  bucket: ProductUpdatesBucket,
  items: ProductFeedItem[],
): Promise<void> {
  await bucket.put(PRODUCT_UPDATES_KEY, JSON.stringify(items, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/** Inserta o reemplaza por id; cap 40. */
export async function upsertProductUpdate(
  bucket: ProductUpdatesBucket,
  item: ProductFeedItem,
): Promise<ProductFeedItem[]> {
  const current = (await readProductUpdates(bucket)) || [];
  const next = current.filter((u) => u.id !== item.id);
  next.unshift(item);
  const capped = next.slice(0, 40);
  await writeProductUpdates(bucket, capped);
  return capped;
}

export async function deleteProductUpdate(
  bucket: ProductUpdatesBucket,
  id: string,
): Promise<{ items: ProductFeedItem[]; removed: boolean }> {
  const key = String(id || "").trim();
  const current = (await readProductUpdates(bucket)) || [];
  const next = current.filter((u) => u.id !== key);
  const removed = next.length !== current.length;
  if (removed) await writeProductUpdates(bucket, next);
  return { items: next, removed };
}
