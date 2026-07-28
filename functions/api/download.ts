/**
 * GET /api/download?token=…  — binario full con token firmado.
 * POST /api/download { licenseKey, productSlug } — re-emite token (email debe coincidir con license; o account session).
 */

import {
  commerceSecret,
  findLicense,
  signDownloadToken,
  verifyAccountSession,
  verifyDownloadToken,
  getAccountTokenFromRequest,
  type CommerceEnv,
} from "../lib/commerce";
import { findProduct } from "../lib/products-catalog";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";

type Env = CommerceEnv & { RATE_LIMIT_KV?: RateLimitKv };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const secret = commerceSecret(env);
  if (!secret) return json({ ok: false, error: "not_configured" }, 503);
  if (!env.LIBRARY_BUCKET) return json({ ok: false, error: "r2_not_configured" }, 503);

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `download:${ip}`,
    { limit: 60, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  // Re-issue token
  if (request.method === "POST") {
    let body: { licenseKey?: string; productSlug?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
    const licenseKey = String(body.licenseKey || "").trim();
    const productSlug = String(body.productSlug || "").trim();
    if (!licenseKey || !productSlug) {
      return json({ ok: false, error: "missing_fields" }, 400);
    }
    const lic = await findLicense(env.LIBRARY_BUCKET, licenseKey);
    if (!lic || lic.revoked || lic.productSlug !== productSlug) {
      return json({ ok: false, error: "invalid_license" }, 403);
    }
    const acct = await verifyAccountSession(
      secret,
      getAccountTokenFromRequest(request),
    );
    if (!acct || acct.email !== lic.email.toLowerCase()) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    const product = await findProduct(env.LIBRARY_BUCKET, productSlug);
    const fileKey = product?.fullKey || null;
    if (!fileKey || !fileKey.includes("/full/")) {
      return json({ ok: false, error: "no_full_build" }, 404);
    }
    const token = await signDownloadToken(secret, {
      slug: productSlug,
      key: licenseKey,
      fileKey,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });
    return json({
      ok: true,
      url: `/api/download?token=${encodeURIComponent(token)}`,
      expHours: 24,
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const payload = await verifyDownloadToken(secret, token);
  if (!payload) return json({ ok: false, error: "invalid_token" }, 403);

  const lic = await findLicense(env.LIBRARY_BUCKET, payload.key);
  if (!lic || lic.revoked || lic.productSlug !== payload.slug) {
    return json({ ok: false, error: "invalid_license" }, 403);
  }

  const key = payload.fileKey;
  const obj = await env.LIBRARY_BUCKET.get(key);
  if (!obj) return json({ ok: false, error: "file_not_found" }, 404);

  // ProductsBucket get returns text/json helpers; for binary we need body.
  // R2 binding in Pages has arrayBuffer/body — extend via cast.
  const r2obj = obj as {
    body?: ReadableStream | null;
    arrayBuffer?: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
    text: () => Promise<string>;
  };

  const fileName = key.split("/").pop() || "download.bin";
  const contentType =
    r2obj.httpMetadata?.contentType || "application/octet-stream";

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (r2obj.body) {
    return new Response(r2obj.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (r2obj.arrayBuffer) {
    const buf = await r2obj.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json({ ok: false, error: "read_failed" }, 500);
}
