/**
 * Filtro + paginación cursor (offset) sobre catálogo ya sanitizado.
 * SSoT de orden = array R2 (admin unshift).
 */

export type LibraryListType = "all" | "stems";

export type LibraryQueryInput = {
  mood?: string | null;
  type?: LibraryListType | string | null;
  limit?: number | string | null;
  cursor?: string | null;
};

export type LibraryQueryResult<T> = {
  items: T[];
  count: number;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  offset: number;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

export function clampLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

/** Cursor v1: offset decimal en la lista filtrada */
export function encodeCursor(offset: number): string {
  return String(Math.max(0, Math.floor(offset)));
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (cursor == null || cursor === "") return 0;
  const o = Number(cursor);
  if (!Number.isFinite(o) || o < 0) return 0;
  return Math.floor(o);
}

function itemMatchesMood(item: Record<string, unknown>, mood: string): boolean {
  const m = mood.trim().toLowerCase();
  if (!m) return true;
  const bag = [
    ...(Array.isArray(item.moods) ? item.moods : []),
    ...(Array.isArray(item.tags) ? item.tags : []),
  ].map((x) => String(x).trim().toLowerCase());
  return bag.includes(m);
}

function itemMatchesType(item: Record<string, unknown>, type: string): boolean {
  const t = (type || "all").toLowerCase();
  if (t === "all" || !t) return true;
  if (t === "stems") {
    if (String(item.kind || "") === "stems") return true;
    if (Array.isArray(item.stems) && item.stems.length) return true;
    if (item.hasStems === true) return true;
    return false;
  }
  return true;
}

/**
 * Filtra (mood, type) y pagina. `items` debe ser lista pública (sin off_catalog).
 */
export function filterAndPage<T extends Record<string, unknown>>(
  items: T[],
  input: LibraryQueryInput,
): LibraryQueryResult<T> {
  const limit = clampLimit(input.limit);
  const offset = decodeCursor(input.cursor ?? null);
  const mood = input.mood ? String(input.mood).trim() : "";
  const type = String(input.type || "all").toLowerCase();

  const filtered = items.filter((item) => {
    if (mood && !itemMatchesMood(item, mood)) return false;
    if (!itemMatchesType(item, type)) return false;
    return true;
  });

  const count = filtered.length;
  const slice = filtered.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  const hasMore = nextOffset < count;

  return {
    items: slice,
    count,
    nextCursor: hasMore ? encodeCursor(nextOffset) : null,
    hasMore,
    limit,
    offset,
  };
}
