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
      return { id: sid, label, src };
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
    video: safeMediaUrlField(o.video),
    stems: stems.length ? stems : undefined,
    tags: clipStringList(o.tags),
    moods: clipStringList(o.moods),
    description: clipText(o.description, 2000),
    notes: clipText(o.notes, 2000),
    year: Number.isFinite(Number(o.year)) ? Number(o.year) : new Date().getFullYear(),
    provisional: Boolean(o.provisional),
    licenseEnabled: o.licenseEnabled !== false,
    availability,
    publishedAt:
      typeof o.publishedAt === "string" ? clipText(o.publishedAt, 40) : undefined,
  };
}

export function sanitizeCatalogItems(
  items: unknown[],
  opts?: { includeOffCatalog?: boolean },
): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(sanitizeCatalogItem)
    .filter((x): x is Record<string, unknown> => x != null)
    .filter((x) => opts?.includeOffCatalog || x.availability !== "off_catalog");
}
