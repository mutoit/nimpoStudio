/**
 * Admin commerce:
 * GET  /admin/orders → orders + licenses
 * POST /admin/orders { action: "revoke", key }
 * POST /admin/orders { action: "fulfill", orderId } → re-send download email
 */

import {
  commerceSecret,
  findOrderById,
  listLicenses,
  listOrders,
  revokeLicense,
  signDownloadToken,
  siteBase,
  upsertOrder,
  type CommerceEnv,
} from "../lib/commerce";
import { findProduct } from "../lib/products-catalog";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import { sendStudioMail } from "../lib/send-mail";
import type { AdminEnv } from "../lib/admin-auth";
import type { RateLimitKv } from "../lib/rate-limit";
import { checkRateLimitAsync, clientIp } from "../lib/rate-limit";

type Env = AdminEnv &
  CommerceEnv & {
    RATE_LIMIT_KV?: RateLimitKv;
  };

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const auth = await requireAdmin(env, request);
  if ("error" in auth && auth.error) return auth.error;
  const bucket = auth.bucket!;

  if (request.method === "GET") {
    const orders = await listOrders(bucket);
    const licenses = await listLicenses(bucket);
    return json({
      ok: true,
      orders,
      licenses,
      count: orders.length,
      stripeConfigured: Boolean(String(env.STRIPE_SECRET_KEY || "").trim()),
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-orders:${ip}`,
    { limit: 40, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let body: { action?: string; key?: string; orderId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const action = String(body.action || "");

  if (action === "revoke") {
    const key = String(body.key || "").trim();
    if (!key) return json({ ok: false, error: "missing_key" }, 400);
    const lic = await revokeLicense(bucket, key);
    if (!lic) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, license: lic, message: `Licencia ${key} revocada.` });
  }

  if (action === "fulfill") {
    const orderId = String(body.orderId || "").trim();
    const order = await findOrderById(bucket, orderId);
    if (!order || order.status !== "paid") {
      return json({ ok: false, error: "order_not_found" }, 404);
    }
    const secret = commerceSecret(env);
    if (!secret) return json({ ok: false, error: "not_configured" }, 503);
    const product = await findProduct(bucket, order.productSlug);
    const fullKey =
      order.fullKey || product?.fullKey || null;
    if (!fullKey || !fullKey.includes("/full/")) {
      return json({ ok: false, error: "no_full_build" }, 404);
    }
    if (!order.fullKey) {
      await upsertOrder(bucket, { ...order, fullKey });
    }
    const token = await signDownloadToken(secret, {
      slug: order.productSlug,
      key: order.licenseKey || "NONE",
      fileKey: fullKey,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 72,
    });
    const downloadUrl = `${siteBase(env, request)}/api/download?token=${encodeURIComponent(token)}`;
    const mail = await sendStudioMail(env, {
      to: [order.email],
      subject: `Descarga ${order.productName} — ${order.licenseKey || ""}`,
      text: [
        `Producto: ${order.productName}`,
        `Licencia: ${order.licenseKey || "—"}`,
        "",
        `Descarga (72 h):`,
        downloadUrl,
        "",
        `${siteBase(env, request)}/es/cuenta/`,
      ].join("\n"),
    });
    return json({
      ok: true,
      mailed: mail.ok,
      downloadUrl,
      message: mail.ok ? "Email reenviado." : `Mail falló: ${mail.error}`,
    });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
