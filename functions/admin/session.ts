/**
 * POST /admin/session  { "password": "..." } → Set-Cookie
 * DELETE /admin/session → clear cookie
 * GET /admin/session → { ok, authenticated }
 */

import {
  clearSessionCookieHeader,
  createSessionToken,
  getSessionFromRequest,
  sessionCookieHeader,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";

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
  env: AdminEnv;
}) {
  const { request, env } = context;
  const secret = (env.ADMIN_LIBRARY_SECRET || "").trim();

  if (request.method === "GET") {
    if (!secret) {
      return json({ ok: true, authenticated: false, configured: false });
    }
    const token = getSessionFromRequest(request);
    const authenticated = await verifySessionToken(secret, token);
    return json({ ok: true, authenticated, configured: true });
  }

  if (request.method === "DELETE") {
    return json(
      { ok: true },
      200,
      { "Set-Cookie": clearSessionCookieHeader() },
    );
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!secret) {
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

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const password = String(body.password || "");
  if (!password || password !== secret) {
    return json({ ok: false, error: "invalid_password" }, 401);
  }

  const token = await createSessionToken(secret);
  return json(
    { ok: true, authenticated: true },
    200,
    { "Set-Cookie": sessionCookieHeader(token) },
  );
}
