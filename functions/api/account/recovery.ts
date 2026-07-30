/**
 * POST /api/account/recovery — account recovery request (always generic 200).
 * Creates support ticket subtype account_recovery; never reveals if email exists.
 */

import {
  findCustomer,
  isPaidBuyer,
  newId,
  upsertTicket,
  type CommerceEnv,
  type CommerceTicket,
} from "../../lib/commerce";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../../lib/rate-limit";
import { sendStudioMail, type MailEnv } from "../../lib/send-mail";

type Env = CommerceEnv & MailEnv & { RATE_LIMIT_KV?: RateLimitKv };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function oneLine(s: string, max = 200): string {
  return String(s || "")
    .replace(/[\r\n\u0000]/g, " ")
    .trim()
    .slice(0, max);
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `recovery:${ip}`,
    { limit: 5, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) {
    // Still generic — don't teach rate limits as enumeration
    return json({
      ok: true,
      message:
        "Si podemos ayudarte, te contactaremos. Revisa también spam. (Límite temporal; reintenta más tarde si hace falta.)",
    });
  }

  let body: {
    newEmail?: string;
    oldEmail?: string;
    licenseKey?: string;
    proof?: string;
    message?: string;
    productSlug?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({
      ok: true,
      message: "Si podemos ayudarte, te contactaremos por el email indicado.",
    });
  }

  const newEmail = oneLine(String(body.newEmail || ""), 200).toLowerCase();
  const oldEmail = oneLine(String(body.oldEmail || ""), 200).toLowerCase();
  const licenseKey = oneLine(String(body.licenseKey || ""), 40).toUpperCase();
  const proof = oneLine(String(body.proof || ""), 500);
  const productSlug = oneLine(String(body.productSlug || ""), 120) || null;
  const message = String(body.message || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 4000);

  const contactEmail =
    newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
      ? newEmail
      : oldEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(oldEmail)
        ? oldEmail
        : "";

  // Generic success even if invalid — anti-enumeration
  const generic = {
    ok: true as const,
    message:
      "Solicitud recibida. Si podemos verificar la compra, te escribiremos al email de contacto. No revelamos si un email tiene cuenta.",
  };

  if (!contactEmail || (!message && !licenseKey && !proof)) {
    return json(generic);
  }

  let buyer = false;
  if (env.LIBRARY_BUCKET && oldEmail) {
    const b = await isPaidBuyer(env.LIBRARY_BUCKET, oldEmail, null);
    buyer = b.buyer;
  }

  const customer = env.LIBRARY_BUCKET && oldEmail
    ? await findCustomer(env.LIBRARY_BUCKET, oldEmail)
    : null;

  const ticket: CommerceTicket = {
    id: newId("tkt"),
    email: contactEmail,
    buyer,
    productSlug,
    channel: "support",
    subtype: "account_recovery",
    message:
      message ||
      "Recuperación de cuenta (sin mensaje extra). Revisar key/prueba/emails.",
    nick: customer?.nick ?? null,
    name: null,
    status: "new",
    createdAt: new Date().toISOString(),
    ip,
    recovery: {
      oldEmail: oldEmail || undefined,
      newEmail: newEmail || undefined,
      licenseKey: licenseKey || undefined,
      proof: proof || undefined,
    },
  };

  if (env.LIBRARY_BUCKET) {
    await upsertTicket(env.LIBRARY_BUCKET, ticket);
  }

  const toStudio = (env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim();
  await sendStudioMail(env, {
    to: [toStudio],
    subject: `[SUPPORT·account_recovery][${buyer ? "CLIENT" : "PROSPECT"}] ${contactEmail}`,
    text: [
      `Ticket: ${ticket.id}`,
      `Contacto: ${contactEmail}`,
      `Email viejo: ${oldEmail || "—"}`,
      `Email nuevo: ${newEmail || "—"}`,
      `Key (si dio): ${licenseKey || "—"}`,
      `Prueba: ${proof || "—"}`,
      `Producto: ${productSlug || "—"}`,
      `Buyer hint (old email): ${buyer}`,
      `IP: ${ip}`,
      "",
      message || "(sin mensaje)",
      "",
      "Admin: transfer_email / rotate_key según prueba.",
    ].join("\n"),
    replyTo: contactEmail,
  });

  console.log(
    "[RECOVERY]",
    JSON.stringify({ id: ticket.id, contactEmail, buyer, time: ticket.createdAt }),
  );

  return json(generic);
}
