/**
 * Catálogo vivo de biblioteca en R2 (clave fija).
 * Fuente de verdad en runtime; library.json del repo es semilla/fallback de build.
 */

export const CATALOG_KEY = "catalog/library.json";
/** Vocabulario global de moods (admin + filtros biblioteca). */
export const MOODS_KEY = "catalog/moods.json";

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

function normalizeMoodLabel(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

/** Moods/tags en ítems del catálogo. */
export function collectMoodsFromItems(items: unknown[]): string[] {
  const s = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    for (const key of ["moods", "tags", "filterMoods", "filterTags"] as const) {
      const arr = o[key];
      if (!Array.isArray(arr)) continue;
      for (const x of arr) {
        const m = normalizeMoodLabel(x);
        if (m) s.add(m);
      }
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "es"));
}

export async function readMoodsCatalog(
  bucket: CatalogBucket | undefined,
): Promise<string[]> {
  if (!bucket) return [];
  const obj = await bucket.get(MOODS_KEY);
  if (!obj) return [];
  try {
    const data = await obj.json<unknown>();
    if (!Array.isArray(data)) return [];
    return [
      ...new Set(data.map(normalizeMoodLabel).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "es"));
  } catch {
    return [];
  }
}

export async function writeMoodsCatalog(
  bucket: CatalogBucket,
  moods: string[],
): Promise<void> {
  const list = [
    ...new Set(moods.map(normalizeMoodLabel).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "es"));
  await bucket.put(MOODS_KEY, JSON.stringify(list, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/**
 * Unión: archivo moods.json + moods en ítems + extras (p.ej. al publicar).
 * Escribe el archivo si crece o no existía.
 */
export async function resolveMoodsVocabulary(
  bucket: CatalogBucket,
  extra: string[] = [],
  opts?: { persist?: boolean },
): Promise<string[]> {
  const items = (await readCatalog(bucket)) || [];
  const fromItems = collectMoodsFromItems(items);
  const stored = await readMoodsCatalog(bucket);
  const set = new Set<string>([...fromItems, ...stored]);
  for (const x of extra) {
    const m = normalizeMoodLabel(x);
    if (m) set.add(m);
  }
  const list = [...set].sort((a, b) => a.localeCompare(b, "es"));
  const persist = opts?.persist !== false;
  if (persist) {
    const same =
      list.length === stored.length && list.every((m, i) => m === stored[i]);
    if (!same) await writeMoodsCatalog(bucket, list);
  }
  return list;
}

export async function removeMoodFromVocabulary(
  bucket: CatalogBucket,
  mood: string,
): Promise<string[]> {
  const n = normalizeMoodLabel(mood);
  const current = await resolveMoodsVocabulary(bucket, [], { persist: false });
  const next = current.filter((m) => m !== n);
  await writeMoodsCatalog(bucket, next);
  return next;
}

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
