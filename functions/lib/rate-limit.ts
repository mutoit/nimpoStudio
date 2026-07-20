/**
 * Rate limit en memoria del isolate (sliding window).
 * No es multi-isolate (usa KV/WAF si hace falta DDoS real).
 * TODO: binding KV RATE para contadores globales.
 */

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
};

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("True-Client-IP") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * @param key identificador (ej. `login:1.2.3.4`)
 * @param limit máximo de eventos en la ventana
 * @param windowSec tamaño de ventana en segundos
 */
export function checkRateLimit(
  key: string,
  opts: { limit: number; windowSec: number },
): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length >= opts.limit) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfterSec, remaining: 0 };
  }
  entry.timestamps.push(now);
  // Evitar crecimiento infinito de claves
  if (store.size > 5000) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  return { ok: true, remaining: opts.limit - entry.timestamps.length };
}
