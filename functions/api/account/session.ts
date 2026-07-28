/**
 * GET  /api/account/session → { authenticated, email, orders, licenses }
 * DELETE → clear cookie
 */

import {
  clearAccountSessionCookie,
  commerceSecret,
  getAccountTokenFromRequest,
  licensesForEmail,
  ordersForEmail,
  verifyAccountSession,
  type CommerceEnv,
} from "../../lib/commerce";
import { findProduct } from "../../lib/products-catalog";

type Env = CommerceEnv;

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const secret = commerceSecret(env);

  if (request.method === "DELETE") {
    return json(
      { ok: true },
      200,
      { "Set-Cookie": clearAccountSessionCookie(request) },
    );
  }

  if (request.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!secret || !env.LIBRARY_BUCKET) {
    return json({ ok: true, authenticated: false, configured: Boolean(secret) });
  }

  const session = await verifyAccountSession(
    secret,
    getAccountTokenFromRequest(request),
  );
  if (!session) {
    return json({ ok: true, authenticated: false, configured: true });
  }

  const orders = await ordersForEmail(env.LIBRARY_BUCKET, session.email);
  const licenses = await licensesForEmail(env.LIBRARY_BUCKET, session.email);

  const enriched = [];
  for (const o of orders) {
    const product = await findProduct(env.LIBRARY_BUCKET, o.productSlug);
    enriched.push({
      id: o.id,
      productSlug: o.productSlug,
      productName: o.productName,
      planName: o.planName,
      amountEur: o.amountEur,
      paidAt: o.paidAt || o.createdAt,
      licenseKey: o.licenseKey,
      hasFullBuild: Boolean(
        (o.fullKey && o.fullKey.includes("/full/")) ||
          (product?.fullKey && product.fullKey.includes("/full/")),
      ),
    });
  }

  return json({
    ok: true,
    authenticated: true,
    email: session.email,
    orders: enriched,
    licenses: licenses.map((l) => ({
      key: l.key,
      productSlug: l.productSlug,
      planId: l.planId,
      seats: l.seats,
      activations: l.activations.length,
      revoked: l.revoked,
      createdAt: l.createdAt,
    })),
  });
}
