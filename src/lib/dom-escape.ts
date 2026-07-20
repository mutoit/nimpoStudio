/** Escape HTML text content (not for URLs). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Solo rutas relativas del sitio o https del propio dominio.
 * Rechaza javascript: y data: peligrosos.
 */
export function safeMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const u = String(url).trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const host = parsed.hostname;
    if (
      host === "nimpo3dstudio.com" ||
      host === "www.nimpo3dstudio.com" ||
      host.endsWith(".nimpo-studio.pages.dev") ||
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
