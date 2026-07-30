/**
 * POST /api/license/activate
 * Body: { key, machineId, productSlug? }
 * Para el binario del software (ola 3).
 */

import {
  activateLicense,
  findCustomer,
  findLicense,
  type CommerceEnv,
} from "../../lib/commerce";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../../lib/rate-limit";

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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `license-act:${ip}`,
    { limit: 30, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let body: { key?: string; machineId?: string; productSlug?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const key = String(body.key || "").trim();
  const machineId = String(body.machineId || "").trim();
  const productSlug = String(body.productSlug || "").trim();
  if (!key || !machineId) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }

  if (productSlug) {
    const lic = await findLicense(env.LIBRARY_BUCKET, key);
    if (lic && lic.productSlug !== productSlug) {
      return json({ ok: false, error: "product_mismatch" }, 403);
    }
  }

  const result = await activateLicense(env.LIBRARY_BUCKET, key, machineId);
  if (!result.ok) {
    const status =
      result.error === "invalid_key"
        ? 404
        : result.error === "revoked" || result.error === "seats_exhausted"
          ? 403
          : 400;
    return json({ ok: false, error: result.error }, status);
  }

  const customer = await findCustomer(env.LIBRARY_BUCKET, result.license.email);

  return json({
    ok: true,
    productSlug: result.license.productSlug,
    planId: result.license.planId,
    seats: result.license.seats,
    activations: result.license.activations.length,
    nick: customer?.nick ?? null,
  });
}
