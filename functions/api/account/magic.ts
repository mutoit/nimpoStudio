/**
 * POST /api/account/magic  { email } → envía magic link
 * GET  /api/account/magic?token= → set cookie + redirect /es/cuenta/
 */

import {
  commerceSecret,
  signAccountSession,
  signMagicToken,
  verifyMagicToken,
  accountSessionCookie,
  siteBase,
  type CommerceEnv,
} from "../../lib/commerce";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../../lib/rate-limit";
import { sendStudioMail } from "../../lib/send-mail";

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
  const secret = commerceSecret(env);
  if (!secret) return json({ ok: false, error: "not_configured" }, 503);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    const magic = await verifyMagicToken(secret, token);
    if (!magic) {
      return Response.redirect(`${siteBase(env, request)}/es/cuenta/?e=magic`, 302);
    }
    const session = await signAccountSession(secret, magic.email);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${siteBase(env, request)}/es/cuenta/?ok=1`,
        "Set-Cookie": accountSessionCookie(session, request),
        "Cache-Control": "no-store",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `magic:${ip}`,
    { limit: 8, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const email = String(body.email || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  const token = await signMagicToken(secret, email);
  const link = `${siteBase(env, request)}/api/account/magic?token=${encodeURIComponent(token)}`;

  const mail = await sendStudioMail(env, {
    to: [email],
    subject: "Acceso a tu cuenta — Nimpo 3D Studio",
    text: [
      "Enlace de acceso (30 minutos):",
      link,
      "",
      "Si no pediste esto, ignora el email.",
      "",
      "— Nimpo 3D Studio",
    ].join("\n"),
  });

  console.log("[magic-link]", email, mail.ok ? "sent" : mail.error);

  // Always ok to avoid email enumeration; log failures
  return json({
    ok: true,
    message: "Si el email es válido, recibirás un enlace en unos minutos.",
    mailed: mail.ok,
  });
}
