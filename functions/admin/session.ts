/**
 * POST /admin/session  → Set-Cookie (+ redirect HTML form o JSON)
 * DELETE /admin/session → clear cookie
 * GET /admin/session → { ok, authenticated }
 *
 * Form POST (application/x-www-form-urlencoded o multipart) → 303 a next.
 * JSON → { ok: true } + Set-Cookie (fetch).
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

function safeNext(raw: string | null | undefined): string {
  const n = String(raw || "/admin/biblioteca/").trim();
  if (n.startsWith("/admin") && !n.startsWith("//")) return n;
  return "/admin/biblioteca/";
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
    return json(
      { ok: true },
      200,
      { "Set-Cookie": clearSessionCookieHeader(request) },
    );
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

  const ct = (request.headers.get("Content-Type") || "").toLowerCase();
  const isForm =
    ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data");

  let password = "";
  let nextPath = "/admin/biblioteca/";

  if (isForm) {
    try {
      const form = await request.formData();
      password = String(form.get("password") || "");
      nextPath = safeNext(String(form.get("next") || ""));
    } catch {
      return json({ ok: false, error: "invalid_form" }, 400);
    }
  } else {
    try {
      const body = (await request.json()) as { password?: string; next?: string };
      password = String(body.password || "");
      nextPath = safeNext(body.next);
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
  }

  if (!password || !(await secretsEqual(password, passwordSecret))) {
    if (isForm) {
      // Vuelve al login con error (sin filtrar contraseña)
      return new Response(null, {
        status: 303,
        headers: {
          Location: `/admin/biblioteca/?e=1`,
          "Cache-Control": "no-store",
        },
      });
    }
    return json({ ok: false, error: "invalid_password" }, 401);
  }

  const token = await createSessionToken(signingKey);
  const setCookie = sessionCookieHeader(token, request);

  if (isForm) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: nextPath,
        "Set-Cookie": setCookie,
        "Cache-Control": "no-store",
      },
    });
  }

  return json(
    { ok: true, authenticated: true },
    200,
    { "Set-Cookie": setCookie },
  );
}
