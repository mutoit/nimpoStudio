/**
 * Excluir al estudio de las estadísticas propias (/api/track, GA, Clarity…).
 *
 * Activar (una vez por navegador):
 *   https://www.nimpo3dstudio.com/?nimpo_no_stats=1
 * Desactivar:
 *   https://www.nimpo3dstudio.com/?nimpo_stats=1
 *
 * También se activa solo en rutas /admin/ (no cuenta panel).
 *
 * Cloudflare Web Analytics (beacon del panel CF) se filtra aparte en el panel
 * o con el mismo flag si usamos beacon propio; el auto-inject de CF no lee
 * localStorage — ver docs/analytics-publi.md.
 */

const STORAGE_KEY = "nimpo_analytics_opt_out";

export function isAnalyticsOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* private mode */
  }
  // Tráfico del panel admin = casi siempre el estudio
  try {
    if (location.pathname.includes("/admin")) return true;
  } catch {
    /* */
  }
  return false;
}

export function setAnalyticsOptOut(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}

/** Leer ?nimpo_no_stats=1 / ?nimpo_stats=1 y persistir. */
export function applyAnalyticsOptOutFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("nimpo_no_stats") === "1" || q.get("nimpo_no_analytics") === "1") {
      setAnalyticsOptOut(true);
      console.info(
        "[nimpo] Estadísticas desactivadas en este navegador. Reactivar: ?nimpo_stats=1",
      );
    }
    if (q.get("nimpo_stats") === "1" || q.get("nimpo_analytics") === "1") {
      setAnalyticsOptOut(false);
      console.info("[nimpo] Estadísticas reactivadas en este navegador.");
    }
  } catch {
    /* */
  }
}
