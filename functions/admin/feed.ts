/**
 * POST /admin/feed — publica o actualiza una entrada del feed Novedades.
 * JSON: { title, summary|description, tag?, date? }
 */

import {
  getSessionFromRequest,
  getSessionSigningKey,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  prependUpdate,
  sanitizeFeedItem,
  type UpdatesBucket,
} from "../lib/updates-catalog";

type Env = AdminEnv & {
  LIBRARY_BUCKET?: UpdatesBucket;
  RATE_LIMIT_KV?: RateLimitKv;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const password = (env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) return json({ ok: false, error: "not_configured" }, 503);

  const signingKey = await getSessionSigningKey(env);
  const token = getSessionFromRequest(request);
  if (!signingKey || !(await verifySessionToken(signingKey, token))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-feed:${ip}`,
    { limit: 30, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const item = sanitizeFeedItem(body);
  if (!item) {
    return json(
      { ok: false, error: "missing_fields", message: "title y description/summary son obligatorios" },
      400,
    );
  }

  try {
    const list = await prependUpdate(env.LIBRARY_BUCKET, item);
    return json({
      ok: true,
      item,
      count: list.length,
      message: "Feed actualizado. Recarga la home para verlo.",
    });
  } catch (e) {
    console.error("[admin/feed]", e);
    return json({ ok: false, error: "write_failed" }, 500);
  }
}
