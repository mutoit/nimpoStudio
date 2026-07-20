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
    value: string | ArrayBuffer,
    opts?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  list?: (opts: {
    prefix: string;
    cursor?: string;
    limit?: number;
  }) => Promise<{
    objects: { key: string }[];
    truncated: boolean;
    cursor?: string;
  }>;
  delete?: (key: string) => Promise<void>;
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

export async function findCatalogItem(
  bucket: CatalogBucket,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const current = (await readCatalog(bucket)) || [];
  const s = String(slug || "");
  for (const raw of current) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (String(o.slug || "") === s) return o;
  }
  return null;
}

export async function deleteCatalogItem(
  bucket: CatalogBucket,
  slug: string,
): Promise<{ items: unknown[]; removed: boolean }> {
  const current = (await readCatalog(bucket)) || [];
  const s = String(slug || "");
  let removed = false;
  const next = current.filter((raw) => {
    if (!raw || typeof raw !== "object") return true;
    const o = raw as { slug?: string };
    if (String(o.slug || "") === s) {
      removed = true;
      return false;
    }
    return true;
  });
  if (removed) await writeCatalog(bucket, next);
  return { items: next, removed };
}

/** Borra objetos R2 bajo library/{slug}/ */
export async function deleteMediaPrefix(
  bucket: CatalogBucket,
  slug: string,
): Promise<number> {
  if (!bucket.list || !bucket.delete) return 0;
  const prefix = `library/${slug}/`;
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 100 });
    for (const obj of page.objects || []) {
      if (obj.key) {
        await bucket.delete(obj.key);
        deleted++;
      }
    }
    cursor = page.truncated && page.cursor ? page.cursor : undefined;
  } while (cursor);
  return deleted;
}
