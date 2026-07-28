/**
 * POST /api/webhooks/stripe
 * Checkout session completed → order paid + license key + email.
 */

import {
  commerceSecret,
  findOrderBySession,
  generateLicenseKey,
  newId,
  productFullKey,
  siteBase,
  signDownloadToken,
  upsertLicense,
  upsertOrder,
  type CommerceEnv,
  type CommerceLicense,
  type CommerceOrder,
} from "../../lib/commerce";
import { findProduct } from "../../lib/products-catalog";
import { sendStudioMail } from "../../lib/send-mail";

type Env = CommerceEnv;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function stripeVerify(
  secret: string,
  payload: string,
  sigHeader: string | null,
): Promise<boolean> {
  if (!secret || !sigHeader) return false;
  // Stripe-Signature: t=timestamp,v1=sig
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as Record<string, string>;
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(age) || age > 60 * 5) return false;
  const signed = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const bytes = new Uint8Array(sigBuf);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  // constant-time compare
  if (hex.length !== v1.length) return false;
  let ok = 0;
  for (let i = 0; i < hex.length; i++) ok |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return ok === 0;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  const payload = await request.text();
  const whSecret = String(env.STRIPE_WEBHOOK_SECRET || "").trim();
  const sig = request.headers.get("Stripe-Signature");

  if (whSecret) {
    const valid = await stripeVerify(whSecret, payload, sig);
    if (!valid) {
      console.warn("[stripe-webhook] invalid signature");
      return json({ ok: false, error: "invalid_signature" }, 400);
    }
  } else {
    console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing — accepting unsigned (dev only)");
  }

  let event: {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (event.type !== "checkout.session.completed") {
    return json({ ok: true, ignored: event.type || "unknown" });
  }

  const session = event.data?.object || {};
  const sessionId = String(session.id || "");
  if (!sessionId) return json({ ok: false, error: "missing_session" }, 400);

  const existing = await findOrderBySession(env.LIBRARY_BUCKET, sessionId);
  if (existing?.status === "paid") {
    return json({ ok: true, duplicate: true, orderId: existing.id });
  }

  const meta = (session.metadata || {}) as Record<string, string>;
  const productSlug = String(meta.productSlug || session.client_reference_id || "").trim();
  const email = String(
    session.customer_details &&
      typeof session.customer_details === "object" &&
      (session.customer_details as { email?: string }).email
      ? (session.customer_details as { email?: string }).email
      : session.customer_email || "",
  )
    .toLowerCase()
    .trim();

  if (!productSlug || !email) {
    console.warn("[stripe-webhook] missing slug/email", productSlug, email);
    return json({ ok: false, error: "missing_fields" }, 400);
  }

  const product = await findProduct(env.LIBRARY_BUCKET, productSlug);
  const planId = String(meta.planId || "standard");
  const planName = String(meta.planName || "Standard");
  const fullKey =
    productFullKey(
      { slug: productSlug, fullKey: product?.fullKey || meta.fullKey },
      meta.fullKey,
    ) || null;

  const amountTotal = session.amount_total != null ? Number(session.amount_total) / 100 : null;
  const licenseKey = generateLicenseKey();
  const orderId = newId("ord");
  const now = new Date().toISOString();

  const order: CommerceOrder = {
    id: orderId,
    email,
    productSlug,
    productName: product?.name || meta.productName || productSlug,
    planId,
    planName,
    amountEur: amountTotal,
    currency: String(session.currency || "eur").toLowerCase(),
    status: "paid",
    stripeSessionId: sessionId,
    stripePaymentIntent: session.payment_intent
      ? String(session.payment_intent)
      : undefined,
    licenseKey,
    fullKey,
    createdAt: existing?.createdAt || now,
    paidAt: now,
  };

  const license: CommerceLicense = {
    key: licenseKey,
    orderId,
    productSlug,
    email,
    planId,
    seats: 1,
    activations: [],
    revoked: false,
    createdAt: now,
  };

  await upsertOrder(env.LIBRARY_BUCKET, order);
  await upsertLicense(env.LIBRARY_BUCKET, license);

  const secret = commerceSecret(env);
  let downloadUrl = "";
  if (secret && fullKey) {
    const token = await signDownloadToken(secret, {
      slug: productSlug,
      key: licenseKey,
      fileKey: fullKey,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 72, // 72h
    });
    downloadUrl = `${siteBase(env, request)}/api/download?token=${encodeURIComponent(token)}`;
  }

  const accountUrl = `${siteBase(env, request)}/es/cuenta/`;
  const text = [
    `Gracias por tu compra — Nimpo 3D Studio`,
    "",
    `Producto: ${order.productName}`,
    `Plan: ${planName}`,
    amountTotal != null ? `Importe: ${amountTotal} ${order.currency.toUpperCase()}` : null,
    "",
    `Tu licencia: ${licenseKey}`,
    "",
    downloadUrl
      ? `Descarga (72 h, o re-descarga desde tu cuenta):\n${downloadUrl}`
      : "La descarga estará disponible en tu cuenta cuando el estudio suba el build full.",
    "",
    `Cuenta (magic link): ${accountUrl}`,
    "Introduce este email para ver pedidos y re-descargar.",
    "",
    "— Nimpo 3D Studio",
    "contacto@nimpo3dstudio.com",
  ]
    .filter((x) => x != null)
    .join("\n");

  const mail = await sendStudioMail(env, {
    to: [email],
    subject: `Licencia ${order.productName} — ${licenseKey}`,
    text,
  });

  // Copia al estudio
  await sendStudioMail(env, {
    to: [String(env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim()],
    subject: `[Venta] ${order.productName} — ${email}`,
    text: [
      `Pedido ${orderId}`,
      `Email: ${email}`,
      `Producto: ${order.productName} (${productSlug})`,
      `Plan: ${planName}`,
      `Key: ${licenseKey}`,
      `Stripe session: ${sessionId}`,
      `Mail cliente: ${mail.ok ? "ok" : mail.error}`,
    ].join("\n"),
  });

  console.log(
    "[stripe-webhook] paid",
    JSON.stringify({ orderId, productSlug, email, licenseKey, mailed: mail.ok }),
  );

  return json({ ok: true, orderId, licenseKey, mailed: mail.ok });
}
