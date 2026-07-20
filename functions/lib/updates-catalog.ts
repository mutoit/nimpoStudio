/**
 * Feed Novedades vivo en R2 (catalog/updates.json).
 */

export const UPDATES_KEY = "catalog/updates.json";

export type UpdatesBucket = {
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

export type FeedItem = {
  date: string;
  title: string;
  tag: "nuevo" | "mejora" | "fix" | "proximo";
  summary: string;
};

const TAGS = new Set(["nuevo", "mejora", "fix", "proximo"]);

export function sanitizeFeedItem(raw: unknown): FeedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title || "")
    .trim()
    .slice(0, 160);
  const summary = String(o.summary || o.description || "")
    .trim()
    .slice(0, 500);
  if (!title || !summary) return null;
  let tag = String(o.tag || "nuevo");
  if (!TAGS.has(tag)) tag = "nuevo";
  let date = String(o.date || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    date = new Date().toISOString().slice(0, 10);
  }
  return {
    date,
    title,
    tag: tag as FeedItem["tag"],
    summary,
  };
}

export async function readUpdates(
  bucket: UpdatesBucket | undefined,
): Promise<FeedItem[] | null> {
  if (!bucket) return null;
  const obj = await bucket.get(UPDATES_KEY);
  if (!obj) return null;
  try {
    const data = await obj.json<unknown>();
    if (!Array.isArray(data)) return null;
    return data
      .map(sanitizeFeedItem)
      .filter((x): x is FeedItem => x != null)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return null;
  }
}

export async function writeUpdates(
  bucket: UpdatesBucket,
  items: FeedItem[],
): Promise<void> {
  await bucket.put(UPDATES_KEY, JSON.stringify(items, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/** Inserta al inicio; si mismo título+fecha, reemplaza. */
export async function prependUpdate(
  bucket: UpdatesBucket,
  item: FeedItem,
): Promise<FeedItem[]> {
  const current = (await readUpdates(bucket)) || [];
  const next = current.filter(
    (u) => !(u.title === item.title && u.date === item.date),
  );
  next.unshift(item);
  // Cap razonable
  const capped = next.slice(0, 40);
  await writeUpdates(bucket, capped);
  return capped;
}
