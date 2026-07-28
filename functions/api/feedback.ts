/**
 * POST /api/feedback — bug / idea / complaint / other → email estudio.
 * Reusa patrones de quote (cors, rate limit, turnstile, mail worker).
 */

import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { verifyTurnstile } from "../lib/turnstile";

type FeedbackBody = {
  productSlug?: string;
  type?: string;
  name?: string;
  email?: string;
  message?: string;
  turnstileToken?: string;
};

type Env = {
  RESEND_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  QUOTE_TO_EMAIL?: string;
  QUOTE_FROM_EMAIL?: string;
  MAIL_SECRET?: string;
  MAIL_WORKER_URL?: string;
  MAIL?: { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> };
  TURNSTILE_SECRET_KEY?: string;
  RATE_LIMIT_KV?: RateLimitKv;
};

const FEEDBACK_TYPES = new Set(["bug", "idea", "complaint", "other"]);

const ALLOWED_ORIGINS = new Set([
  "https://www.nimpo3dstudio.com",
  "https://nimpo3dstudio.com",
  "https://nimpo-studio.pages.dev",
]);

function oneLine(s: string, max = 200): string {
  return String(s || "")
    .replace(/[\r\n\u0000]/g, " ")
    .trim()
    .slice(0, max);
}

function corsOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (origin.endsWith(".nimpo-studio.pages.dev")) return origin;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return origin;
  }
  return null;
}

function json(
  data: unknown,
  status = 200,
  request?: Request,
  extra: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
  if (request) {
    const o = corsOrigin(request);
    if (o) {
      headers["Access-Control-Allow-Origin"] = o;
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS, GET";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
      headers["Vary"] = "Origin";
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function sendViaMailWorker(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string }> {
  const payload = JSON.stringify({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
    from: "contacto@nimpo3dstudio.com",
    fromName: "Nimpo 3D Studio",
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.MAIL_SECRET) headers["X-Mail-Secret"] = env.MAIL_SECRET;

  if (env.MAIL) {
    try {
      const res = await env.MAIL.fetch("https://mail.internal/send", {
        method: "POST",
        headers,
        body: payload,
      });
      if (res.ok) return { ok: true };
    } catch {
      /* fall through */
    }
  }

  const url = env.MAIL_WORKER_URL || "https://nimpo-mail.nosinfantasia.workers.dev/";
  if (!env.MAIL_SECRET) return { ok: false, error: "no_mail_secret" };
  try {
    const res = await fetch(url, { method: "POST", headers, body: payload });
    if (!res.ok) return { ok: false, error: `mail_http_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "mail_http_network" };
  }
}

async function sendResend(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string }> {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "no_resend_key" };
  const from = env.QUOTE_FROM_EMAIL || "Nimpo 3D Studio <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) return { ok: false, error: `resend_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "resend_network" };
  }
}

async function sendEmail(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
) {
  const viaWorker = await sendViaMailWorker(env, opts);
  if (viaWorker.ok) return viaWorker;
  const viaResend = await sendResend(env, opts);
  if (viaResend.ok) return viaResend;
  return { ok: false, error: viaWorker.error || viaResend.error || "no_email_provider" };
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return json({ ok: true }, 200, request);
  }

  if (request.method === "GET") {
    return json(
      {
        status: "ok",
        turnstileRequired: Boolean(String(env.TURNSTILE_SECRET_KEY || "").trim()),
      },
      200,
      request,
    );
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405, request);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `feedback:${ip}`,
    { limit: 8, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) {
    return json(
      { ok: false, error: "rate_limited" },
      429,
      request,
      { "Retry-After": String(rl.retryAfterSec ?? 60) },
    );
  }

  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, request);
  }

  const ts = await verifyTurnstile(env, body.turnstileToken, ip);
  if (!ts.ok) {
    return json({ ok: false, error: ts.error || "turnstile_failed" }, 403, request);
  }

  const name = oneLine(String(body.name || ""), 120);
  const email = oneLine(String(body.email || ""), 200).toLowerCase();
  const productSlug = oneLine(String(body.productSlug || ""), 120);
  const typeRaw = oneLine(String(body.type || "other"), 20).toLowerCase();
  const type = FEEDBACK_TYPES.has(typeRaw) ? typeRaw : "other";
  const message = String(body.message || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 4000);

  if (!email || !message) {
    return json({ ok: false, error: "missing_fields" }, 400, request);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400, request);
  }

  const toStudio = (env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim();
  const subject = oneLine(
    productSlug
      ? `[Feedback ${type}] ${productSlug} — ${name || email}`
      : `[Feedback ${type}] ${name || email}`,
    180,
  );
  const text = [
    "Feedback / soporte — Nimpo 3D Studio",
    "",
    `Tipo: ${type}`,
    productSlug ? `Producto: ${productSlug}` : "Producto: (general)",
    name ? `Nombre: ${name}` : null,
    `Email: ${email}`,
    `IP: ${ip}`,
    `Fecha: ${new Date().toISOString()}`,
    "",
    "Mensaje:",
    message,
    "",
    "— /api/feedback",
  ]
    .filter((x) => x != null)
    .join("\n");

  console.log(
    "[FEEDBACK]",
    JSON.stringify({ type, productSlug: productSlug || undefined, email, time: new Date().toISOString() }),
  );

  const mail = await sendEmail(env, {
    to: [toStudio],
    subject,
    text,
    replyTo: email,
  });

  return json(
    {
      ok: true,
      mailed: mail.ok,
      mailError: mail.ok ? undefined : mail.error,
      message: mail.ok
        ? "Mensaje enviado. Te responderemos por email."
        : "Mensaje registrado. Si no llega el mail, el estudio lo verá en logs.",
    },
    200,
    request,
  );
}
