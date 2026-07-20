/** Escape HTML text content (not for URLs). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Id/slug seguro para atributos data-* y selectores. */
export function safeDomId(raw: string | null | undefined): string {
  const s = String(raw || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 96);
  return s || "item";
}

/** Solo ratios conocidos (evita XSS en innerHTML). */
export function safeAspectLabel(raw: string | null | undefined): "1:1" | "9:16" | "16:9" {
  const a = String(raw || "").trim();
  if (a === "9:16" || a === "16:9" || a === "1:1") return a;
  return "1:1";
}

/**
 * Solo rutas relativas del sitio o https del propio dominio / R2.
 * Rechaza javascript: y data: peligrosos.
 */
export function safeMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  let u = String(url).trim().slice(0, 2048);
  // r2.dev → same-origin proxy (Web Audio fetch necesita CORS)
  try {
    if (u.startsWith("library/")) return `/api/media/${u}`;
    if (u.includes(".r2.dev/")) {
      const parsed = new URL(u);
      if (parsed.hostname.endsWith(".r2.dev")) {
        const key = parsed.pathname.replace(/^\/+/, "");
        if (key.startsWith("library/")) return `/api/media/${key}`;
      }
    }
  } catch {
    /* continue */
  }
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const host = parsed.hostname;
    if (
      host === "nimpo3dstudio.com" ||
      host === "www.nimpo3dstudio.com" ||
      host.endsWith(".nimpo-studio.pages.dev") ||
      host.endsWith(".r2.dev") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return u;
    }
  } catch {
    return "";
  }
  return "";
}
