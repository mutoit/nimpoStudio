/**
 * GET /admin/media?key=library/… — stream de objeto R2 con sesión admin.
 * Sirve stems/master bajo /full/ (bloqueados en /api/media público).
 */

import type { AdminEnv } from "../lib/admin-auth";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { isPrivateMasterKey } from "../lib/media-upload";

type Bucket = {
  get: (
    key: string,
    opts?: { range?: { offset: number; length?: number } },
  ) => Promise<{
    body: ReadableStream | null;
    httpMetadata?: { contentType?: string };
    size?: number;
  } | null>;
  head?: (key: string) => Promise<{
    size?: number;
    httpMetadata?: { contentType?: string };
  } | null>;
};

type Env = AdminEnv & {
  LIBRARY_BUCKET?: Bucket;
  RATE_LIMIT_KV?: RateLimitKv;
};

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const auth = await requireAdmin(env, request);
  if ("error" in auth && auth.error) return auth.error;
  const bucket = env.LIBRARY_BUCKET!;

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-media:${ip}`,
    { limit: 120, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  const url = new URL(request.url);
  let key = String(url.searchParams.get("key") || "")
    .replace(/^\/+/, "")
    .replace(/\.\./g, "");
  // Aceptar también /api/media/library/… pegado por error
  if (key.startsWith("api/media/")) key = key.slice("api/media/".length);
  if (key.startsWith("/api/media/")) key = key.slice("/api/media/".length);

  if (!key.startsWith("library/")) {
    return json({ ok: false, error: "invalid_key" }, 400);
  }
  // Solo biblioteca del estudio (incl. full/stems y master)
  if (!key.includes("/full/") && !key.match(/^library\/[^/]+\//)) {
    return json({ ok: false, error: "invalid_key" }, 400);
  }

  let size = 0;
  let contentType = "application/octet-stream";
  if (bucket.head) {
    const h = await bucket.head(key);
    if (!h) return json({ ok: false, error: "not_found" }, 404);
    size = Number(h.size || 0);
    contentType = h.httpMetadata?.contentType || contentType;
  }

  const obj = await bucket.get(key);
  if (!obj || (!obj.body && request.method === "GET")) {
    return json({ ok: false, error: "not_found" }, 404);
  }
  contentType = obj.httpMetadata?.contentType || contentType;
  if (!size && obj.size) size = Number(obj.size);

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, no-store",
    "X-Nimpo-Private": isPrivateMasterKey(key) ? "1" : "0",
  };
  if (size > 0) headers["Content-Length"] = String(size);

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(obj.body, { status: 200, headers });
}
