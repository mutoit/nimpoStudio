/**
 * Rate limit: memoria del isolate + opcional KV (global multi-edge).
 * Binding opcional: RATE_LIMIT_KV (KV namespace).
 */

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
  via?: "memory" | "kv";
};

export type RateLimitKv = {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ) => Promise<void>;
};

export function clientIp(request: Request): string {
  // En Cloudflare, CF-Connecting-IP es la fuente de verdad (no spoofable por el cliente).
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("True-Client-IP") ||
    "unknown"
  );
}

function pruneAndCheck(
  timestamps: number[],
  now: number,
  windowMs: number,
  limit: number,
): { timestamps: number[]; result: RateLimitResult } {
  const kept = timestamps.filter((t) => now - t < windowMs);
  if (kept.length >= limit) {
    const oldest = kept[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      timestamps: kept,
      result: { ok: false, retryAfterSec, remaining: 0 },
    };
  }
  kept.push(now);
  return {
    timestamps: kept,
    result: { ok: true, remaining: limit - kept.length },
  };
}

/**
 * Rate limit en memoria (single isolate).
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
  const { timestamps, result } = pruneAndCheck(
    entry.timestamps,
    now,
    windowMs,
    opts.limit,
  );
  entry.timestamps = timestamps;
  if (store.size > 5000) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  return { ...result, via: "memory" };
}

/**
 * Preferir KV si hay binding (global). Si no, memoria.
 * Ambos se aplican: memoria frena picos locales; KV frena multi-edge.
 */
export async function checkRateLimitAsync(
  key: string,
  opts: { limit: number; windowSec: number },
  kv?: RateLimitKv | null,
): Promise<RateLimitResult> {
  const mem = checkRateLimit(key, opts);
  if (!mem.ok) return mem;

  if (!kv) return mem;

  try {
    const now = Date.now();
    const windowMs = opts.windowSec * 1000;
    const kvKey = `rl:${key}`;
    let timestamps: number[] = [];
    const raw = await kv.get(kvKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed)) timestamps = parsed.map(Number).filter(Number.isFinite);
      } catch {
        timestamps = [];
      }
    }
    const { timestamps: next, result } = pruneAndCheck(
      timestamps,
      now,
      windowMs,
      opts.limit,
    );
    await kv.put(kvKey, JSON.stringify(next), {
      expirationTtl: Math.max(60, opts.windowSec + 30),
    });
    return { ...result, via: "kv" };
  } catch (e) {
    console.warn("[rate-limit-kv]", e);
    return mem;
  }
}
