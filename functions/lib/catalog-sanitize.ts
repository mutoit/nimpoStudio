/**
 * Catálogo R2 = no confiable. Sanitiza ítems antes de servir o re-hidratar.
 */

import { safeAspect, safeName, clipText, clipStringList, safeItemId } from "./media-upload";

/** Reescribe r2.dev → /api/media/... (same-origin, Web Audio OK). */
function toSameOriginMedia(u: string): string {
  try {
    if (u.startsWith("/api/media/")) return u;
    if (u.startsWith("library/")) return `/api/media/${u}`;
    const parsed = new URL(u);
    if (parsed.hostname.endsWith(".r2.dev")) {
      const key = parsed.pathname.replace(/^\/+/, "");
      if (key.startsWith("library/")) return `/api/media/${key}`;
    }
  } catch {
    /* keep */
  }
  return u;
}

function safeMediaUrlField(url: unknown): string | null {
  if (url == null || url === "") return null;
  let u = String(url).trim().slice(0, 2048);
  u = toSameOriginMedia(u);
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = parsed.hostname;
    if (
      host === "nimpo3dstudio.com" ||
      host === "www.nimpo3dstudio.com" ||
      host.endsWith(".nimpo-studio.pages.dev") ||
      host.endsWith(".r2.dev") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return toSameOriginMedia(u);
    }
  } catch {
    return null;
  }
  return null;
}

export function sanitizeCatalogItem(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = safeName(String(o.slug || "")) || "item";
  const idRaw = safeName(String(o.id || "").replace(/^lib-/, "")) || slug;
  const id = String(o.id || "").startsWith("lib-")
    ? `lib-${idRaw}`.slice(0, 96)
    : safeItemId(slug);

  const kind = String(o.kind || "") === "stems" ? "stems" : "video";
  const stemsIn = Array.isArray(o.stems) ? o.stems : [];
  const stems = stemsIn
    .slice(0, 24)
    .map((s, i) => {
      if (!s || typeof s !== "object") return null;
      const st = s as Record<string, unknown>;
      const src = safeMediaUrlField(st.src);
      if (!src) return null;
      const label = clipText(st.label || `Stem ${i + 1}`, 80);
      const sid = safeName(String(st.id || label)) || `stem-${i + 1}`;
      // cleanSrc = original sin ruido (solo admin re-mezcla / preview limpio)
      const cleanSrc = safeMediaUrlField(st.cleanSrc) || undefined;
      return cleanSrc
        ? { id: sid, label, src, cleanSrc }
        : { id: sid, label, src };
    })
    .filter(Boolean);

  const availability = ["available", "reserved", "sold_exclusive", "off_catalog"].includes(
    String(o.availability || ""),
  )
    ? String(o.availability)
    : "available";

  return {
    id,
    slug,
    title: clipText(o.title || slug, 200) || slug,
    kind,
    aspect: safeAspect(String(o.aspect || "1:1")),
    cover: safeMediaUrlField(o.cover),
    /** Miniatura de grid (opcional; si falta se usa cover). */
    thumb: safeMediaUrlField(o.thumb),
    /** Mix preview público (1 archivo mono). Preferido para ▶. */
    preview: safeMediaUrlField(o.preview),
    video: safeMediaUrlField(o.video),
    stems: stems.length ? stems : undefined,
    tags: clipStringList(o.tags),
    moods: clipStringList(o.moods),
    filterMoods: clipStringList(o.filterMoods),
    filterTags: clipStringList(o.filterTags),
    description: clipText(o.description, 2000),
    notes: clipText(o.notes, 2000),
    year: Number.isFinite(Number(o.year)) ? Number(o.year) : new Date().getFullYear(),
    provisional: Boolean(o.provisional),
    licenseEnabled: o.licenseEnabled !== false,
    availability,
    publishedAt:
      typeof o.publishedAt === "string" ? clipText(o.publishedAt, 40) : undefined,
    // Para cache-bust de media en el cliente tras re-publicar
    updatedAt:
      typeof o.updatedAt === "string" ? clipText(o.updatedAt, 40) : undefined,
  };
}

export function sanitizeCatalogItems(
  items: unknown[],
  opts?: { includeOffCatalog?: boolean; stripCleanSrc?: boolean },
): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(sanitizeCatalogItem)
    .filter((x): x is Record<string, unknown> => x != null)
    .filter((x) => opts?.includeOffCatalog || x.availability !== "off_catalog")
    .map((item) => (opts?.stripCleanSrc ? stripCleanSrcFromItem(item) : item));
}

/** Público: no exponer stems limpios (solo preview con ruido). */
export function stripCleanSrcFromItem(
  item: Record<string, unknown>,
): Record<string, unknown> {
  const stems = item.stems;
  if (!Array.isArray(stems)) return item;
  return {
    ...item,
    stems: stems.map((s) => {
      if (!s || typeof s !== "object") return s;
      const { cleanSrc: _c, ...rest } = s as Record<string, unknown>;
      return rest;
    }),
  };
}

/**
 * Card de listado público: sin stems[], video URL, description, notes.
 * Flags hasVideo / hasStems para la UI.
 */
export function toLibraryCard(item: Record<string, unknown>): Record<string, unknown> {
  const stems = Array.isArray(item.stems) ? item.stems : [];
  const video = item.video;
  const hasVideo = typeof video === "string" && video.length > 0;
  const moods = Array.isArray(item.moods) ? item.moods.slice(0, 8) : [];
  const tags = Array.isArray(item.tags) ? item.tags.slice(0, 8) : [];

  // Grid: preferir thumb (miniatura) si existe; cover full solo en detail
  const thumb = item.thumb ?? null;
  const cover = thumb || item.cover || null;
  const preview =
    typeof item.preview === "string" && item.preview ? item.preview : null;

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    kind: item.kind,
    aspect: item.aspect,
    cover,
    preview,
    hasPreview: Boolean(preview),
    hasVideo,
    hasStems: stems.length > 0 || String(item.kind || "") === "stems",
    moods,
    tags,
    availability: item.availability ?? "available",
    licenseEnabled: item.licenseEnabled !== false,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
  };
}

export function toLibraryCards(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.map(toLibraryCard);
}
