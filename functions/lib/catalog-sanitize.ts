/**
 * Catálogo R2 = no confiable. Sanitiza ítems antes de servir o re-hidratar.
 *
 * Modelo único:
 * - Público: preview (+ video/cover). Sin stems[] ni masterKey.
 * - hasStems / hasMaster = flags de entrega (licencia), no player multi-capa.
 * - Admin: stems[{id,label,key}] privadas bajo full/stems.
 */

import { safeAspect, safeName, clipText, clipStringList, safeItemId } from "./media-upload";

/** Reescribe r2.dev → /api/media/... (same-origin). */
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
  // Nunca exponer rutas /full/ como URL de media pública
  if (u.includes("/full/")) return null;
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
      const out = toSameOriginMedia(u);
      if (out.includes("/full/")) return null;
      return out;
    }
  } catch {
    return null;
  }
  return null;
}

function mediaRefToKey(raw: unknown): string {
  let u = String(raw || "").trim();
  if (!u) return "";
  if (u.startsWith("library/")) return u.split("?")[0] || u;
  if (u.startsWith("/api/media/")) {
    u = u.slice("/api/media/".length).split("?")[0] || "";
    return u.startsWith("library/") ? u : "";
  }
  return "";
}

export type DeliveryStem = { id: string; label: string; key: string };

/** Stems de entrega (admin). Solo keys R2, sin URL pública. */
export function extractDeliveryStems(raw: unknown): DeliveryStem[] {
  if (!Array.isArray(raw)) return [];
  const out: DeliveryStem[] = [];
  for (let i = 0; i < Math.min(24, raw.length); i++) {
    const s = raw[i];
    if (!s || typeof s !== "object") continue;
    const st = s as Record<string, unknown>;
    const label = clipText(st.label || st.id || `Stem ${i + 1}`, 80);
    const id = safeName(String(st.id || label)) || `stem-${i + 1}`;
    const key =
      mediaRefToKey(st.key) ||
      mediaRefToKey(st.cleanSrc) ||
      mediaRefToKey(st.src);
    if (!key.startsWith("library/")) continue;
    out.push({ id, label, key });
  }
  return out;
}

export function sanitizeCatalogItem(
  raw: unknown,
  opts?: { includeDelivery?: boolean },
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = safeName(String(o.slug || "")) || "item";
  const idRaw = safeName(String(o.id || "").replace(/^lib-/, "")) || slug;
  const id = String(o.id || "").startsWith("lib-")
    ? `lib-${idRaw}`.slice(0, 96)
    : safeItemId(slug);

  const kind = String(o.kind || "") === "stems" ? "stems" : "video";
  const deliveryStems = extractDeliveryStems(o.stems);
  // Legacy: array stems con solo src público → cuenta como hasStems
  const legacyStemCount = Array.isArray(o.stems) ? o.stems.length : 0;
  const hasStems =
    deliveryStems.length > 0 || legacyStemCount > 0 || kind === "stems" || Boolean(o.hasStems);
  const hasVideo = Boolean(safeMediaUrlField(o.video));
  const hasPreview = Boolean(safeMediaUrlField(o.preview));

  const rawMasterKey = String(o.masterKey || "").trim();
  const hasMaster =
    Boolean(o.hasMaster) ||
    (rawMasterKey.startsWith("library/") && rawMasterKey.includes("/full/"));
  const masterName = hasMaster
    ? clipText(o.masterName || rawMasterKey.split("/").pop() || "master", 160)
    : undefined;
  const masterBytes =
    hasMaster && Number.isFinite(Number(o.masterBytes)) && Number(o.masterBytes) > 0
      ? Number(o.masterBytes)
      : undefined;
  const masterContentType = hasMaster
    ? clipText(o.masterContentType || "audio/wav", 80) || undefined
    : undefined;

  const availability = ["available", "reserved", "sold_exclusive", "off_catalog"].includes(
    String(o.availability || ""),
  )
    ? String(o.availability)
    : "available";

  const base: Record<string, unknown> = {
    id,
    slug,
    title: clipText(o.title || slug, 200) || slug,
    kind: hasStems ? "stems" : kind,
    aspect: safeAspect(String(o.aspect || "1:1")),
    cover: safeMediaUrlField(o.cover),
    thumb: safeMediaUrlField(o.thumb),
    /** Único audio de play en biblioteca pública. */
    preview: safeMediaUrlField(o.preview),
    video: safeMediaUrlField(o.video),
    hasStems,
    hasVideo,
    hasPreview,
    hasMaster,
    masterName,
    masterBytes,
    masterContentType,
    stemCount: deliveryStems.length || legacyStemCount || undefined,
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
    updatedAt:
      typeof o.updatedAt === "string" ? clipText(o.updatedAt, 40) : undefined,
  };

  if (opts?.includeDelivery) {
    base.stems = deliveryStems;
    if (hasMaster && rawMasterKey.includes("/full/")) {
      base.masterKey = rawMasterKey;
    }
  }

  return base;
}

export function sanitizeCatalogItems(
  items: unknown[],
  opts?: { includeOffCatalog?: boolean; includeDelivery?: boolean; stripCleanSrc?: boolean },
): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => sanitizeCatalogItem(x, { includeDelivery: opts?.includeDelivery }))
    .filter((x): x is Record<string, unknown> => x != null)
    .filter((x) => opts?.includeOffCatalog || x.availability !== "off_catalog");
}

/** @deprecated — stems públicos eliminados; no-op de compat. */
export function stripCleanSrcFromItem(
  item: Record<string, unknown>,
): Record<string, unknown> {
  const { stems: _s, masterKey: _m, ...rest } = item;
  return rest;
}

/**
 * Card de listado público: sin stems[], video URL, description, notes.
 */
export function toLibraryCard(item: Record<string, unknown>): Record<string, unknown> {
  const moods = Array.isArray(item.moods) ? item.moods.slice(0, 8) : [];
  const tags = Array.isArray(item.tags) ? item.tags.slice(0, 8) : [];
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
    hasVideo: Boolean(item.hasVideo),
    hasStems: Boolean(item.hasStems),
    hasMaster: Boolean(item.hasMaster),
    stemCount: item.stemCount,
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
