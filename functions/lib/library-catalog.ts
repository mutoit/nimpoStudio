/**
 * Catálogo vivo de biblioteca en R2 (clave fija).
 * Fuente de verdad en runtime; library.json del repo es semilla/fallback de build.
 */

export const CATALOG_KEY = "catalog/library.json";

export type CatalogBucket = {
  get: (key: string) => Promise<{
    text: () => Promise<string>;
    json: <T>() => Promise<T>;
  } | null>;
  put: (
    key: string,
    value: string,
    opts?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
};

export async function readCatalog(
  bucket: CatalogBucket | undefined,
): Promise<unknown[] | null> {
  if (!bucket) return null;
  const obj = await bucket.get(CATALOG_KEY);
  if (!obj) return null;
  try {
    const data = await obj.json<unknown>();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function writeCatalog(
  bucket: CatalogBucket,
  items: unknown[],
): Promise<void> {
  await bucket.put(CATALOG_KEY, JSON.stringify(items, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function upsertCatalogItem(
  bucket: CatalogBucket,
  item: { slug?: string; id?: string },
): Promise<unknown[]> {
  const current = (await readCatalog(bucket)) || [];
  const slug = String(item.slug || "");
  const id = String(item.id || "");
  const next = current.filter((raw) => {
    if (!raw || typeof raw !== "object") return true;
    const o = raw as { slug?: string; id?: string };
    if (slug && o.slug === slug) return false;
    if (id && o.id === id) return false;
    return true;
  });
  next.unshift(item);
  await writeCatalog(bucket, next);
  return next;
}
