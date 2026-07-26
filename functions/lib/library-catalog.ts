/**
 * Catálogo vivo de biblioteca en R2.
 *
 * Escala (dual-write, compatible):
 * - monofile legacy: catalog/library.json (admin/list fallback)
 * - por ítem: catalog/items/{slug}.json (detail O(1))
 * - índice ligero: catalog/library-index.json (list cards sin stems)
 */

export const CATALOG_KEY = "catalog/library.json";
export const CATALOG_INDEX_KEY = "catalog/library-index.json";
export const CATALOG_ITEMS_PREFIX = "catalog/items/";
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

/** Entrada de índice (list público sin stems). */
export type CatalogIndexEntry = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  aspect: string;
  cover: string | null;
  preview: string | null;
  hasPreview: boolean;
  hasStems: boolean;
  hasVideo: boolean;
  moods: string[];
  tags: string[];
  availability: string;
  licenseEnabled: boolean;
  publishedAt?: string;
  updatedAt?: string;
  mediaStatus?: string;
};

function normalizeMoodLabel(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export function itemKey(slug: string): string {
  const s = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${CATALOG_ITEMS_PREFIX}${s || "item"}.json`;
}

export function toIndexEntry(raw: unknown): CatalogIndexEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = String(o.slug || "").trim();
  if (!slug) return null;
  const stems = Array.isArray(o.stems) ? o.stems : [];
  const preview = o.preview != null && o.preview !== "" ? String(o.preview) : null;
  const video = o.video != null && o.video !== "" ? String(o.video) : null;
  const cover =
    (o.thumb != null && o.thumb !== "" ? String(o.thumb) : null) ||
    (o.cover != null && o.cover !== "" ? String(o.cover) : null);
  return {
    id: String(o.id || `lib-${slug}`),
    slug,
    title: String(o.title || slug),
    kind: String(o.kind || "stems"),
    aspect: String(o.aspect || "1:1"),
    cover,
    preview,
    hasPreview: Boolean(preview),
    hasStems: stems.length > 0 || String(o.kind || "") === "stems",
    hasVideo: Boolean(video),
    moods: Array.isArray(o.moods) ? o.moods.map(String) : [],
    tags: Array.isArray(o.tags) ? o.tags.map(String) : [],
    availability: String(o.availability || "available"),
    licenseEnabled: o.licenseEnabled !== false,
    publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
    mediaStatus: typeof o.mediaStatus === "string" ? o.mediaStatus : "ready",
  };
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
  // Dual-write: ítems + índice
  await writeCatalogIndex(bucket, items);
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const slug = String((raw as { slug?: string }).slug || "");
    if (!slug) continue;
    await writeCatalogItem(bucket, raw as Record<string, unknown>);
  }
}

export async function writeCatalogItem(
  bucket: CatalogBucket,
  item: Record<string, unknown>,
): Promise<void> {
  const slug = String(item.slug || "");
  if (!slug) return;
  await bucket.put(itemKey(slug), JSON.stringify(item, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function readCatalogItem(
  bucket: CatalogBucket,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const s = String(slug || "").trim();
  if (!s) return null;
  const obj = await bucket.get(itemKey(s));
  if (!obj) return null;
  try {
    const data = await obj.json<unknown>();
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function writeCatalogIndex(
  bucket: CatalogBucket,
  items: unknown[],
): Promise<void> {
  const index = items
    .map(toIndexEntry)
    .filter((x): x is CatalogIndexEntry => x != null);
  await bucket.put(CATALOG_INDEX_KEY, JSON.stringify(index, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function readCatalogIndex(
  bucket: CatalogBucket | undefined,
): Promise<CatalogIndexEntry[] | null> {
  if (!bucket) return null;
  const obj = await bucket.get(CATALOG_INDEX_KEY);
  if (obj) {
    try {
      const data = await obj.json<unknown>();
      if (Array.isArray(data) && data.length) {
        return data
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as CatalogIndexEntry;
            if (!o.slug) return null;
            return o;
          })
          .filter((x): x is CatalogIndexEntry => x != null);
      }
    } catch {
      /* rebuild below */
    }
  }
  // Fallback: construir desde monofile (sin stems en respuesta pública)
  const full = await readCatalog(bucket);
  if (!full?.length) return [];
  const index = full
    .map(toIndexEntry)
    .filter((x): x is CatalogIndexEntry => x != null);
  // Persist index for next time (best-effort)
  try {
    await writeCatalogIndex(bucket, full);
  } catch {
    /* ignore */
  }
  return index;
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
  const full = item as Record<string, unknown>;
  if (!full.mediaStatus) full.mediaStatus = "ready";
  next.unshift(full);
  // Monofile + per-item + index
  await bucket.put(CATALOG_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  if (slug) await writeCatalogItem(bucket, full);
  await writeCatalogIndex(bucket, next);
  return next;
}

export async function findCatalogItem(
  bucket: CatalogBucket,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const s = String(slug || "").trim();
  if (!s) return null;
  // O(1) per-item
  const direct = await readCatalogItem(bucket, s);
  if (direct) return direct;
  // bare lib-slug
  if (s.startsWith("lib-")) {
    const bare = s.slice(4);
    const d2 = await readCatalogItem(bucket, bare);
    if (d2) return d2;
  }
  // Fallback monofile
  const current = (await readCatalog(bucket)) || [];
  for (const raw of current) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (String(o.slug || "") === s || String(o.id || "") === s) return o;
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
  if (removed) {
    await bucket.put(CATALOG_KEY, JSON.stringify(next, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    await writeCatalogIndex(bucket, next);
    if (bucket.delete) {
      try {
        await bucket.delete(itemKey(s));
      } catch {
        /* ignore */
      }
    }
  }
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
