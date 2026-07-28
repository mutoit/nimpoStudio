/**
 * Cliente catálogo biblioteca: list paginado + detail por slug.
 * Separa red de la UI monstruo (bind.ts).
 */

import { escapeHtml, safeAspectLabel, safeDomId, safeMediaUrl } from "../dom-escape";

export type Stem = { id: string; label: string; src: string };

export type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  aspect: string;
  cover?: string | null;
  thumb?: string | null;
  /** Mix preview ligero (1 archivo). Preferido para ▶ de grid. */
  preview?: string | null;
  video?: string | null;
  stems?: Stem[];
  tags: string[];
  moods: string[];
  filterMoods?: string[];
  filterTags?: string[];
  description?: string;
  notes?: string;
  provisional?: boolean;
  licenseEnabled?: boolean;
  availability?: string;
  updatedAt?: string;
  hasVideo?: boolean;
  hasStems?: boolean;
  hasPreview?: boolean;
};

export function mapLiveItem(raw: LibraryItem): LibraryItem {
  const stems = Array.isArray(raw.stems)
    ? raw.stems
        .map((s) => ({
          id: safeDomId(s.id),
          label: String(s.label || ""),
          src: safeMediaUrl(s.src),
        }))
        .filter((s) => s.src)
    : undefined;
  const video = safeMediaUrl(raw.video) || null;
  const preview = safeMediaUrl(raw.preview) || null;
  const cover = safeMediaUrl(raw.cover) || safeMediaUrl(raw.thumb) || null;
  const hasStems = Boolean(raw.hasStems || (stems && stems.length) || raw.kind === "stems");
  const hasVideo = Boolean(raw.hasVideo || video);
  const hasPreview = Boolean(raw.hasPreview || preview);
  return {
    ...raw,
    id: safeDomId(raw.id),
    aspect: safeAspectLabel(raw.aspect),
    title: String(raw.title || ""),
    moods: Array.isArray(raw.moods) ? raw.moods.map(String) : [],
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    filterMoods: Array.isArray(raw.filterMoods) ? raw.filterMoods.map(String) : [],
    filterTags: Array.isArray(raw.filterTags) ? raw.filterTags.map(String) : [],
    video,
    cover,
    preview,
    hasStems,
    hasVideo,
    hasPreview,
    updatedAt:
      typeof raw.updatedAt === "string" ? String(raw.updatedAt) : undefined,
    stems,
  };
}

function slugCandidates(card: LibraryItem): string[] {
  const raw = [card.slug, card.id, safeDomId(card.id), safeDomId(card.slug || "")]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const s of raw) {
    if (!out.includes(s)) out.push(s);
    if (s.startsWith("lib-")) {
      const bare = s.slice(4);
      if (bare && !out.includes(bare)) out.push(bare);
    }
  }
  return out;
}

/**
 * List cards (índice) traen preview/hasStems pero NO stems[] ni description.
 * Solo se considera detalle hidratado si las capas/campos de ficha están de verdad.
 */
export function isHydratedDetail(item: LibraryItem): boolean {
  const wantsStems =
    item.hasStems === true ||
    item.kind === "stems" ||
    (Array.isArray(item.stems) && item.stems.length > 0);
  if (wantsStems) {
    return Array.isArray(item.stems) && item.stems.length > 0;
  }
  // Sin stems: detalle si hay URL de vídeo o description (solo vienen en ?slug=)
  return (
    Boolean(item.video) ||
    typeof item.description === "string" ||
    typeof item.notes === "string"
  );
}

export type FetchListParams = {
  limit?: number;
  cursor?: string | null;
  mood?: string | null;
  type?: string | null;
  signal?: AbortSignal;
};

export type FetchListResult = {
  items: LibraryItem[];
  moods: string[];
  count: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchLibraryList(params: FetchListParams = {}): Promise<FetchListResult> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 24));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.mood) q.set("mood", params.mood);
  if (params.type && params.type !== "all") q.set("type", params.type);

  const res = await fetch(`/api/library?${q}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal: params.signal,
  });
  if (!res.ok) throw new Error(`list_${res.status}`);
  const live = (await res.json()) as {
    ok?: boolean;
    items?: LibraryItem[];
    moods?: string[];
    count?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
  if (!live?.ok || !Array.isArray(live.items)) throw new Error("list_bad_body");
  return {
    items: live.items.map(mapLiveItem),
    moods: Array.isArray(live.moods) ? live.moods.map((x) => String(x).toLowerCase()) : [],
    count: typeof live.count === "number" ? live.count : live.items.length,
    nextCursor: typeof live.nextCursor === "string" ? live.nextCursor : null,
    hasMore: Boolean(live.hasMore),
  };
}

export async function fetchLibraryDetail(
  card: LibraryItem,
  cache: Map<string, LibraryItem>,
  signal?: AbortSignal,
): Promise<LibraryItem | null> {
  const keys = slugCandidates(card);
  if (!keys.length) return null;

  for (const k of keys) {
    const hit = cache.get(k);
    if (hit && isHydratedDetail(hit)) return hit;
  }
  // Solo reutilizar la card si ya trae capas (nunca bastan preview/hasStems del list)
  if (isHydratedDetail(card)) {
    const mapped = mapLiveItem(card);
    for (const k of keys) cache.set(k, mapped);
    if (mapped.slug) cache.set(mapped.slug, mapped);
    return mapped;
  }

  for (const slug of keys) {
    try {
      const res = await fetch(`/api/library?slug=${encodeURIComponent(slug)}`, {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "follow",
        signal,
      });
      if (!res.ok) continue;
      const live = (await res.json()) as { ok?: boolean; item?: LibraryItem };
      if (!live?.ok || !live.item) continue;
      const full = mapLiveItem(live.item);
      for (const k of keys) cache.set(k, full);
      if (full.slug) cache.set(full.slug, full);
      if (full.id) cache.set(full.id, full);
      return full;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
    }
  }
  return null;
}

/** re-export escape for callers that render cards */
export { escapeHtml, safeDomId, safeMediaUrl };
