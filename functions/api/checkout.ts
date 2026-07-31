/**
 * POST /api/checkout
 * Software: { productSlug, planId?, email? }
 * Música:   { kind: "music", workSlug, package?: "master"|"master_stems", email? }
 * Q: { ok, url } Stripe Checkout Session
 */

import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import {
  commerceSecret,
  isAllowedDownloadKey,
  musicStemKeysFromItem,
  siteBase,
  type CommerceEnv,
} from "../lib/commerce";
import { findProduct } from "../lib/products-catalog";
import { findCatalogItem } from "../lib/library-catalog";

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

function priceIdOk(id: string): boolean {
  return /^price_[a-zA-Z0-9]+$/.test(id);
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
      musicCheckout: true,
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
        message: "Falta STRIPE_SECRET_KEY en Pages. Puedes configurar Prices y reintentar.",
      },
      503,
    );
  }

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  let body: {
    kind?: string;
    productSlug?: string;
    workSlug?: string;
    planId?: string;
    package?: string;
    email?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const kind =
    String(body.kind || "").toLowerCase() === "music" || body.workSlug
      ? "music"
      : "software";

  const email = String(body.email || "").trim().toLowerCase();
  const base = siteBase(env, request);

  // —— Música: master (+ stems) ——
  if (kind === "music") {
    const workSlug = String(body.workSlug || body.productSlug || "")
      .trim()
      .toLowerCase();
    if (!workSlug) return json({ ok: false, error: "missing_work" }, 400);

    const item = await findCatalogItem(env.LIBRARY_BUCKET, workSlug);
    if (!item || String(item.availability || "") === "off_catalog") {
      return json({ ok: false, error: "work_not_found" }, 404);
    }
    if (item.licenseEnabled === false) {
      return json({ ok: false, error: "license_disabled" }, 400);
    }

    const masterKey = String(item.masterKey || "").trim();
    if (!isAllowedDownloadKey(masterKey)) {
      return json(
        {
          ok: false,
          error: "no_master",
          message: "Esta obra no tiene master HQ en R2. Sube el master en admin.",
        },
        400,
      );
    }

    const pkg = String(body.package || "master_stems").toLowerCase();
    const wantStems = pkg === "master_stems" || pkg === "stems" || pkg === "full";
    const stemKeys = musicStemKeysFromItem(item);
    const includeStems = wantStems && stemKeys.length > 0;

    // Price: master stripePriceId; opcional stemsStripePriceId si package stems y existe
    const masterPrice = String(item.stripePriceId || "").trim();
    const stemsPrice = String(item.stemsStripePriceId || "").trim();
    if (!masterPrice || !priceIdOk(masterPrice)) {
      return json(
        {
          ok: false,
          error: "no_stripe_price",
          message:
            "Configura stripePriceId (price_…) en la ficha de la obra (admin biblioteca). Puedes crearlo en Stripe y pegarlo aquí.",
          workSlug,
        },
        400,
      );
    }

    const title = String(item.title || workSlug);
    const successUrl =
      String(body.successUrl || "").trim() ||
      `${base}/es/cuenta/?checkout=success&kind=music&work=${encodeURIComponent(workSlug)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      String(body.cancelUrl || "").trim() ||
      `${base}/es/biblioteca/?p=${encodeURIComponent(workSlug)}&checkout=cancel`;

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("line_items[0][price]", masterPrice);
    params.set("line_items[0][quantity]", "1");
    let line = 1;
    if (includeStems && stemsPrice && priceIdOk(stemsPrice) && stemsPrice !== masterPrice) {
      params.set(`line_items[${line}][price]`, stemsPrice);
      params.set(`line_items[${line}][quantity]`, "1");
      line++;
    }
    // Si no hay price de stems aparte, el price del master se asume pack (master+stems si includeStems)
    params.set("metadata[kind]", "music");
    params.set("metadata[productSlug]", workSlug);
    params.set("metadata[workSlug]", workSlug);
    params.set("metadata[productName]", title);
    params.set("metadata[planId]", includeStems ? "master_stems" : "master");
    params.set(
      "metadata[planName]",
      includeStems ? "Master + stems" : "Master",
    );
    params.set("metadata[fullKey]", masterKey);
    params.set("metadata[includeStems]", includeStems ? "1" : "0");
    if (email) params.set("customer_email", email);
    params.set("client_reference_id", `music:${workSlug}`);

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
        console.warn("[checkout/music]", res.status, data);
        return json(
          {
            ok: false,
            error: "stripe_session_failed",
            message: data.error?.message || `stripe_${res.status}`,
          },
          502,
        );
      }
      void commerceSecret(env);
      return json({
        ok: true,
        mode: "checkout",
        kind: "music",
        url: data.url,
        sessionId: data.id,
        includeStems,
      });
    } catch (e) {
      console.error("[checkout/music]", e);
      return json({ ok: false, error: "stripe_network" }, 502);
    }
  }

  // —— Software (existente) ——
  const productSlug = String(body.productSlug || "").trim();
  if (!productSlug) return json({ ok: false, error: "missing_product" }, 400);

  const product = await findProduct(env.LIBRARY_BUCKET, productSlug);
  if (!product || product.status === "draft") {
    return json({ ok: false, error: "product_not_found" }, 404);
  }

  const plans = product.pricing || [];
  const plan = plans.find((p) => p.id === body.planId) || plans[0] || null;
  if (!plan?.stripePriceId) {
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

  const successUrl =
    String(body.successUrl || "").trim() ||
    `${base}/es/cuenta/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    String(body.cancelUrl || "").trim() ||
    `${base}/es/catalogo/?p=${encodeURIComponent(productSlug)}&checkout=cancel`;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", plan.stripePriceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[kind]", "software");
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
    void commerceSecret(env);
    return json({
      ok: true,
      mode: "checkout",
      kind: "software",
      url: data.url,
      sessionId: data.id,
    });
  } catch (e) {
    console.error("[checkout]", e);
    return json({ ok: false, error: "stripe_network" }, 502);
  }
}
