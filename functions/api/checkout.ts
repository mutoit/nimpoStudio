/**
 * POST /api/checkout
 * Body: { productSlug, planId?, email?, successUrl?, cancelUrl? }
 * Q: { ok, url } Stripe Checkout Session — o error si no hay Stripe / price.
 */

import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  commerceSecret,
  siteBase,
  type CommerceEnv,
} from "../lib/commerce";
import { findProduct } from "../lib/products-catalog";

type Env = CommerceEnv & { RATE_LIMIT_KV?: RateLimitKv };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method === "GET") {
    return json({
      ok: true,
      stripeConfigured: Boolean(String(env.STRIPE_SECRET_KEY || "").trim()),
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `checkout:${ip}`,
    { limit: 20, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  const stripeKey = String(env.STRIPE_SECRET_KEY || "").trim();
  if (!stripeKey) {
    return json(
      {
        ok: false,
        error: "stripe_not_configured",
        message: "Falta STRIPE_SECRET_KEY. Usa buyUrl o mailto mientras tanto.",
      },
      503,
    );
  }

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  let body: {
    productSlug?: string;
    planId?: string;
    email?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const productSlug = String(body.productSlug || "").trim();
  if (!productSlug) return json({ ok: false, error: "missing_product" }, 400);

  const product = await findProduct(env.LIBRARY_BUCKET, productSlug);
  if (!product || product.status === "draft") {
    return json({ ok: false, error: "product_not_found" }, 404);
  }

  const plans = product.pricing || [];
  const plan =
    plans.find((p) => p.id === body.planId) || plans[0] || null;
  if (!plan?.stripePriceId) {
    // Fallback: Payment Link
    if (plan?.buyUrl && /^https:\/\//i.test(plan.buyUrl)) {
      return json({ ok: true, mode: "payment_link", url: plan.buyUrl });
    }
    return json(
      {
        ok: false,
        error: "no_stripe_price",
        message: "Configura stripePriceId en el plan del producto (admin).",
      },
      400,
    );
  }

  const base = siteBase(env, request);
  const successUrl =
    String(body.successUrl || "").trim() ||
    `${base}/es/cuenta/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    String(body.cancelUrl || "").trim() ||
    `${base}/es/catalogo/?p=${encodeURIComponent(productSlug)}&checkout=cancel`;

  const email = String(body.email || "").trim().toLowerCase();
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", plan.stripePriceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[productSlug]", product.slug);
  params.set("metadata[productName]", product.name);
  params.set("metadata[planId]", plan.id);
  params.set("metadata[planName]", plan.name);
  if (product.fullKey) params.set("metadata[fullKey]", product.fullKey);
  if (email) params.set("customer_email", email);
  params.set("client_reference_id", product.slug);

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = (await res.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !data.url) {
      console.warn("[checkout]", res.status, data);
      return json(
        {
          ok: false,
          error: "stripe_session_failed",
          message: data.error?.message || `stripe_${res.status}`,
        },
        502,
      );
    }
    // secret used only to ensure commerce is configured
    void commerceSecret(env);
    return json({
      ok: true,
      mode: "checkout",
      url: data.url,
      sessionId: data.id,
    });
  } catch (e) {
    console.error("[checkout]", e);
    return json({ ok: false, error: "stripe_network" }, 502);
  }
}
