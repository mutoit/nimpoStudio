/**
 * POST /api/feedback — ticket bug/suggestion/support/other → store + email estudio.
 * Buyer = servidor (sesión magic o email con order paid). Nunca confiar en body.buyer.
 */

import {
  commerceSecret,
  findCustomer,
  getAccountTokenFromRequest,
  isPaidBuyer,
  legacyFeedbackToChannel,
  newId,
  normalizeTicketChannel,
  normalizeTicketSubtype,
  ticketMailPrefix,
  touchCustomerSeen,
  upsertTicket,
  verifyAccountSession,
  type CommerceEnv,
  type CommerceTicket,
  type TicketChannel,
} from "../lib/commerce";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { verifyTurnstile } from "../lib/turnstile";
import { sendStudioMail, type MailEnv } from "../lib/send-mail";

type FeedbackBody = {
  productSlug?: string;
  /** Legacy: bug | idea | complaint | other */
  type?: string;
  channel?: string;
  subtype?: string;
  name?: string;
  email?: string;
  message?: string;
  turnstileToken?: string;
};

type Env = MailEnv &
  CommerceEnv & {
    TURNSTILE_SECRET_KEY?: string;
    RATE_LIMIT_KV?: RateLimitKv;
  };

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
  const productSlug = oneLine(String(body.productSlug || ""), 120) || null;
  const message = String(body.message || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 4000);

  let channel: TicketChannel;
  let subtype: string;
  if (body.channel) {
    channel = normalizeTicketChannel(body.channel);
    subtype = normalizeTicketSubtype(channel, String(body.subtype || "other"));
  } else if (body.type) {
    const mapped = legacyFeedbackToChannel(body.type);
    channel = mapped.channel;
    subtype = mapped.subtype;
  } else {
    channel = "other";
    subtype = "other";
  }

  // Email: session wins over body
  let email = oneLine(String(body.email || ""), 200).toLowerCase();
  let fromSession = false;
  const secret = commerceSecret(env);
  if (secret) {
    const session = await verifyAccountSession(secret, getAccountTokenFromRequest(request));
    if (session?.email) {
      email = session.email.toLowerCase().trim();
      fromSession = true;
    }
  }

  if (!email || !message) {
    return json({ ok: false, error: "missing_fields" }, 400, request);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400, request);
  }

  let buyer = false;
  let orderIds: string[] = [];
  if (env.LIBRARY_BUCKET) {
    const b = await isPaidBuyer(env.LIBRARY_BUCKET, email, productSlug);
    buyer = b.buyer;
    // If product-scoped check fails but has any paid order, still CLIENT for general
    if (!buyer && productSlug) {
      const any = await isPaidBuyer(env.LIBRARY_BUCKET, email, null);
      buyer = any.buyer;
      orderIds = any.orderIds;
    } else {
      orderIds = b.orderIds;
    }
  }

  const customer = env.LIBRARY_BUCKET
    ? await findCustomer(env.LIBRARY_BUCKET, email)
    : null;
  if (env.LIBRARY_BUCKET && fromSession) {
    await touchCustomerSeen(env.LIBRARY_BUCKET, email);
  }

  const ticket: CommerceTicket = {
    id: newId("tkt"),
    email,
    buyer,
    productSlug,
    channel,
    subtype,
    message,
    nick: customer?.nick ?? null,
    name: name || null,
    status: "new",
    createdAt: new Date().toISOString(),
    orderIds: orderIds.length ? orderIds : undefined,
    ip,
  };

  if (env.LIBRARY_BUCKET) {
    await upsertTicket(env.LIBRARY_BUCKET, ticket);
  }

  const toStudio = (env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim();
  const prefix = ticketMailPrefix(ticket);
  const subject = oneLine(
    productSlug
      ? `${prefix} ${productSlug} — ${name || email}`
      : `${prefix} ${name || email}`,
    180,
  );
  const text = [
    "Ticket — Nimpo 3D Studio",
    "",
    `Id: ${ticket.id}`,
    `Canal: ${channel} / ${subtype}`,
    `Cliente: ${buyer ? "CLIENT (pago verificado)" : "PROSPECT"}`,
    fromSession ? "Sesión: magic link" : "Sesión: no",
    productSlug ? `Producto: ${productSlug}` : "Producto: (general)",
    name ? `Nombre: ${name}` : null,
    customer?.nick ? `Nick: ${customer.nick}` : null,
    `Email: ${email}`,
    orderIds.length ? `Orders: ${orderIds.join(", ")}` : null,
    `IP: ${ip}`,
    `Fecha: ${ticket.createdAt}`,
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
    JSON.stringify({
      id: ticket.id,
      channel,
      subtype,
      buyer,
      productSlug: productSlug || undefined,
      email,
      time: ticket.createdAt,
    }),
  );

  const mail = await sendStudioMail(env, {
    to: [toStudio],
    subject,
    text,
    replyTo: email,
  });

  return json(
    {
      ok: true,
      ticketId: ticket.id,
      buyer,
      mailed: mail.ok,
      mailError: mail.ok ? undefined : mail.error,
      message: mail.ok
        ? "Mensaje enviado. Te responderemos por email."
        : "Mensaje registrado. Si no llega el mail, el estudio lo verá en admin.",
    },
    200,
    request,
  );
}
