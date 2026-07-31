/**
 * POST /api/checkout
 * Software: { productSlug, planId?, email? }
 * Música:   { kind: "music", workSlug, email, usage, term?, extras… }
 *   → Stripe line items desde baremo (licencias + extras), no price por obra.
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
import {
  calculateLicenseQuote,
  isLicenseUsageCode,
  type LicenseTermCode,
  type LicenseUsageCode,
} from "../lib/license-quote";
import {
  isMusicCatalogCheckoutReady,
  stripePricesForQuoteLines,
} from "../lib/stripe-license-map";

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
      musicCatalogPrices: isMusicCatalogCheckoutReady(),
      model: "license_catalog",
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
    /** Selección cotizador (música) — el servidor recalcula importes */
    usage?: string;
    term?: string;
    stems?: boolean;
    editShort?: boolean;
    exclusive?: boolean;
    exclusiveStrong?: boolean;
    buyout?: boolean;
    buyoutHigh?: boolean;
    needSpecialReview?: boolean;
    termPlus1y?: boolean;
    removeFromCatalog?: boolean;
    territoryExpand?: boolean;
    moreComposition?: boolean;
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

  // —— Música: licencia + extras (catálogo Stripe), obra solo metadata/entrega ——
  if (kind === "music") {
    const workSlug = String(body.workSlug || body.productSlug || "")
      .trim()
      .toLowerCase();
    if (!workSlug) return json({ ok: false, error: "missing_work" }, 400);

    if (!isMusicCatalogCheckoutReady()) {
      return json(
        {
          ok: false,
          error: "stripe_catalog_missing",
          message: "Falta mapa de precios de licencia en el servidor.",
        },
        503,
      );
    }

    if (body.needSpecialReview === true) {
      return json(
        {
          ok: false,
          error: "special_quote",
          message:
            "Presupuesto especial: envía el formulario (Obtener presupuesto). El estudio te cobrará por Invoice/Link Stripe.",
        },
        400,
      );
    }

    const usageRaw = String(body.usage || "").trim();
    if (!isLicenseUsageCode(usageRaw)) {
      return json({ ok: false, error: "missing_usage" }, 400);
    }
    const usage = usageRaw as LicenseUsageCode;
    const termRaw = String(body.term || "2y").trim() as LicenseTermCode;
    const term: LicenseTermCode =
      termRaw === "single" ||
      termRaw === "1y" ||
      termRaw === "project" ||
      termRaw === "custom" ||
      termRaw === "2y"
        ? termRaw
        : "2y";

    // Compat: package master_stems ⇒ stems on si no viene flag
    const pkg = String(body.package || "").toLowerCase();
    const stemsFromPkg = pkg === "master_stems" || pkg === "stems" || pkg === "full";
    const stems = body.stems === true || (body.stems !== false && stemsFromPkg);

    const quote = calculateLicenseQuote({
      usage,
      term,
      stems,
      editShort: body.editShort === true,
      exclusive: body.exclusive === true,
      exclusiveStrong: body.exclusiveStrong === true,
      buyout: body.buyout === true,
      buyoutHigh: body.buyoutHigh === true,
      needSpecialReview: false,
      termPlus1y: body.termPlus1y === true,
      removeFromCatalog: body.removeFromCatalog === true,
      territoryExpand: body.territoryExpand === true,
      moreComposition: body.moreComposition === true,
    });

    if (quote.mode !== "instant" || quote.total == null || !quote.lineItems.length) {
      return json(
        {
          ok: false,
          error: "not_instant",
          message: "Esta selección no tiene precio cerrado. Usa presupuesto especial.",
        },
        400,
      );
    }

    const priced = stripePricesForQuoteLines(quote.lineItems);
    if (!priced.ok) {
      return json(
        {
          ok: false,
          error: "stripe_price_map",
          message: `Faltan Prices Stripe para: ${priced.missing.join(", ")}`,
          missing: priced.missing,
        },
        500,
      );
    }

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

    const wantStems = quote.lineItems.some((l) => l.code === "stems");
    const stemKeys = musicStemKeysFromItem(item);
    const includeStems = wantStems && stemKeys.length > 0;

    const title = String(item.title || workSlug);
    const planName = quote.lineItems
      .map((l) => l.label)
      .slice(0, 3)
      .join(" + ");
    const lineCodes = quote.lineItems.map((l) => l.code).join(",");

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
    priced.priceIds.forEach((priceId, i) => {
      params.set(`line_items[${i}][price]`, priceId);
      params.set(`line_items[${i}][quantity]`, "1");
    });
    params.set("metadata[kind]", "music");
    params.set("metadata[productSlug]", workSlug);
    params.set("metadata[workSlug]", workSlug);
    params.set("metadata[productName]", title);
    params.set("metadata[planId]", usage);
    params.set("metadata[planName]", planName.slice(0, 450));
    params.set("metadata[usage]", usage);
    params.set("metadata[term]", term);
    params.set("metadata[lineCodes]", lineCodes.slice(0, 450));
    params.set("metadata[quoteTotal]", String(quote.total));
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
        total: quote.total,
        lines: quote.lineItems.length,
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
