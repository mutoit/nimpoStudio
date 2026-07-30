/**
 * POST /api/account/profile { nick } — set display nick (session required).
 */

import {
  commerceSecret,
  getAccountTokenFromRequest,
  setCustomerNick,
  touchCustomerSeen,
  verifyAccountSession,
  type CommerceEnv,
} from "../../lib/commerce";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../../lib/rate-limit";

type Env = CommerceEnv & { RATE_LIMIT_KV?: RateLimitKv };

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

  if (request.method !== "POST" && request.method !== "PATCH") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const secret = commerceSecret(env);
  if (!secret || !env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const session = await verifyAccountSession(secret, getAccountTokenFromRequest(request));
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `profile:${ip}`,
    { limit: 20, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let body: { nick?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const result = await setCustomerNick(env.LIBRARY_BUCKET, session.email, String(body.nick || ""));
  if (!result.ok) {
    const status = result.error === "nick_taken" ? 409 : 400;
    return json({ ok: false, error: result.error }, status);
  }

  await touchCustomerSeen(env.LIBRARY_BUCKET, session.email);
  return json({
    ok: true,
    nick: result.customer.nick,
    customer: {
      email: result.customer.email,
      nick: result.customer.nick,
      productSlugs: result.customer.productSlugs,
    },
  });
}
