/**
 * POST /admin/session  { "password": "..." } → Set-Cookie
 * DELETE /admin/session → clear cookie
 * GET /admin/session → { ok, authenticated }
 */

import {
  clearSessionCookieHeader,
  createSessionToken,
  getSessionFromRequest,
  getSessionSigningKey,
  secretsEqual,
  sessionCookieHeader,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { clientIp, checkRateLimitAsync, type RateLimitKv } from "../lib/rate-limit";

type Env = AdminEnv & { RATE_LIMIT_KV?: RateLimitKv };

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  const { request, env } = context;
  const passwordSecret = (env.ADMIN_LIBRARY_SECRET || "").trim();
  const signingKey = await getSessionSigningKey(env);

  if (request.method === "GET") {
    if (!passwordSecret || !signingKey) {
      return json({ ok: true, authenticated: false, configured: false });
    }
    const token = getSessionFromRequest(request);
    const authenticated = await verifySessionToken(signingKey, token);
    return json({
      ok: true,
      authenticated,
      configured: true,
      sessionSecretConfigured: Boolean(String(env.ADMIN_SESSION_SECRET || "").trim()),
    });
  }

  if (request.method === "DELETE") {
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookieHeader() });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!passwordSecret || !signingKey) {
    return json(
      {
        ok: false,
        error: "not_configured",
        message:
          "Falta ADMIN_LIBRARY_SECRET en Pages → Settings → Environment variables.",
      },
      503,
    );
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-login:${ip}`,
    { limit: 8, windowSec: 15 * 60 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) {
    return json(
      { ok: false, error: "rate_limited" },
      429,
      { "Retry-After": String(rl.retryAfterSec ?? 60) },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const password = String(body.password || "");
  if (!password || !(await secretsEqual(password, passwordSecret))) {
    return json({ ok: false, error: "invalid_password" }, 401);
  }

  const token = await createSessionToken(signingKey);
  return json(
    { ok: true, authenticated: true },
    200,
    { "Set-Cookie": sessionCookieHeader(token) },
  );
}
