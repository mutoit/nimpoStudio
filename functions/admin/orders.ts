/**
 * Admin commerce:
 * GET  /admin/orders → orders + licenses + customers
 * POST /admin/orders {
 *   action: "issue" | "revoke" | "fulfill" | "transfer_email" | "rotate_key" | "reset_activations",
 *   ...
 * }
 * issue = licencia manual (Founder u otro plan) sin Stripe, cualquier productSlug software.
 */

import {
  commerceSecret,
  findOrderById,
  generateLicenseKey,
  listCustomers,
  listLicenses,
  listOrders,
  newId,
  productFullKey,
  recordCustomerPurchase,
  resetLicenseActivations,
  revokeLicense,
  rotateLicenseKey,
  signDownloadToken,
  siteBase,
  transferCustomerEmail,
  upsertLicense,
  upsertOrder,
  type CommerceEnv,
  type CommerceLicense,
  type CommerceOrder,
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
    const customers = await listCustomers(bucket);
    return json({
      ok: true,
      orders,
      licenses,
      customers,
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

  let body: {
    action?: string;
    key?: string;
    orderId?: string;
    fromEmail?: string;
    toEmail?: string;
    email?: string;
    productSlug?: string;
    planId?: string;
    planName?: string;
    seats?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const action = String(body.action || "");

  if (action === "issue") {
    const email = String(body.email || "")
      .toLowerCase()
      .trim();
    const productSlug = String(body.productSlug || "")
      .trim()
      .toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "invalid_email" }, 400);
    }
    if (!productSlug) {
      return json({ ok: false, error: "missing_product" }, 400);
    }

    const product = await findProduct(bucket, productSlug);
    if (!product) {
      return json({ ok: false, error: "product_not_found" }, 404);
    }
    if (String(product.status || "") === "draft") {
      return json({ ok: false, error: "product_draft" }, 400);
    }

    const planId = String(body.planId || "founder")
      .trim()
      .slice(0, 64) || "founder";
    const planName =
      String(body.planName || (planId === "founder" ? "Founder" : planId))
        .trim()
        .slice(0, 120) || "Founder";
    const seatsRaw = Number(body.seats);
    const seats =
      Number.isFinite(seatsRaw) && seatsRaw >= 1 && seatsRaw <= 10
        ? Math.floor(seatsRaw)
        : 1;

    const fullKey =
      productFullKey(
        { slug: product.slug, fullKey: product.fullKey },
        product.fullKey,
      ) || null;

    const licenseKey = generateLicenseKey();
    const orderId = newId("ord");
    const now = new Date().toISOString();

    const order: CommerceOrder = {
      id: orderId,
      email,
      productSlug: product.slug,
      productName: product.name || product.slug,
      planId,
      planName,
      amountEur: 0,
      currency: "eur",
      status: "paid",
      licenseKey,
      fullKey,
      createdAt: now,
      paidAt: now,
      kind: "software",
    };

    const license: CommerceLicense = {
      key: licenseKey,
      orderId,
      productSlug: product.slug,
      email,
      planId,
      seats,
      activations: [],
      revoked: false,
      createdAt: now,
    };

    await upsertOrder(bucket, order);
    await upsertLicense(bucket, license);
    await recordCustomerPurchase(bucket, email, product.slug, now);

    const secret = commerceSecret(env);
    const base = siteBase(env, request);
    let downloadUrl = "";
    if (secret && fullKey) {
      try {
        const token = await signDownloadToken(secret, {
          slug: product.slug,
          key: licenseKey,
          fileKey: fullKey,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 72,
        });
        downloadUrl = `${base}/api/download?token=${encodeURIComponent(token)}`;
      } catch (e) {
        console.warn("[admin-orders issue] sign download fail", e);
      }
    }

    const accountUrl = `${base}/es/cuenta/`;
    const mail = await sendStudioMail(env, {
      to: [email],
      subject: `Licencia Founder ${order.productName} — ${licenseKey}`,
      text: [
        `Licencia Founder — Nimpo 3D Studio`,
        "",
        `Producto: ${order.productName}`,
        `Plan: ${planName}`,
        `Importe: 0 EUR (regalo / founder)`,
        "",
        `Tu licencia: ${licenseKey}`,
        "",
        downloadUrl
          ? `Descarga (72 h, o re-descarga desde tu cuenta):\n${downloadUrl}`
          : "La descarga estará disponible en tu cuenta cuando el estudio suba el build full.",
        "",
        `Cuenta (sin contraseña): ${accountUrl}`,
        "Introduce este email; te enviamos un enlace mágico para ver pedidos, la key y re-descargar.",
        "",
        "En la app: pega la licencia → Activar.",
        "",
        "— Nimpo 3D Studio",
        "contacto@nimpo3dstudio.com",
      ].join("\n"),
    });

    await sendStudioMail(env, {
      to: [String(env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim()],
      subject: `[Founder] ${order.productName} — ${email}`,
      text: [
        `Pedido ${orderId}`,
        `Kind: software (admin issue)`,
        `Email: ${email}`,
        `Producto: ${order.productName} (${product.slug})`,
        `Plan: ${planName} (${planId})`,
        `Key: ${licenseKey}`,
        `Full: ${fullKey || "—"}`,
        `Mail cliente: ${mail.ok ? "ok" : mail.error}`,
      ].join("\n"),
    });

    return json({
      ok: true,
      order,
      license,
      mailed: mail.ok,
      downloadUrl: downloadUrl || null,
      message: mail.ok
        ? `Founder emitida: ${licenseKey} → ${email}`
        : `Key creada ${licenseKey}; mail falló: ${mail.error || "unknown"}`,
    });
  }

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

  if (action === "transfer_email") {
    const fromEmail = String(body.fromEmail || "").trim().toLowerCase();
    const toEmail = String(body.toEmail || "").trim().toLowerCase();
    if (!fromEmail || !toEmail) {
      return json({ ok: false, error: "missing_emails" }, 400);
    }
    const result = await transferCustomerEmail(bucket, fromEmail, toEmail);
    if (!result.ok) return json({ ok: false, error: result.error }, 400);
    return json({
      ok: true,
      ...result,
      message: `Transferido ${fromEmail} → ${result.to} (${result.orders} pedidos, ${result.licenses} licencias).`,
    });
  }

  if (action === "rotate_key") {
    const key = String(body.key || "").trim();
    if (!key) return json({ ok: false, error: "missing_key" }, 400);
    const result = await rotateLicenseKey(bucket, key);
    if (!result.ok) return json({ ok: false, error: result.error }, 404);
    return json({
      ok: true,
      license: result.license,
      oldKey: result.oldKey,
      message: `Key rotada: ${result.oldKey} → ${result.license.key}`,
    });
  }

  if (action === "reset_activations") {
    const key = String(body.key || "").trim();
    if (!key) return json({ ok: false, error: "missing_key" }, 400);
    const lic = await resetLicenseActivations(bucket, key);
    if (!lic) return json({ ok: false, error: "not_found" }, 404);
    return json({
      ok: true,
      license: lic,
      message: `Activaciones reseteadas para ${key}.`,
    });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
