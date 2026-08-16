/**
 * GET /api/download?token=…  — binario (software full o master/stem música).
 * POST /api/download
 *   Software: { licenseKey, productSlug }
 *   Música:   { licenseKey, productSlug|workSlug, file?: "master"|"stems" }
 *   Re-emite token(s) si la sesión de cuenta coincide con la licencia.
 */

import {
  commerceSecret,
  findLicense,
  findOrderById,
  getAccountTokenFromRequest,
  isAllowedDownloadKey,
  musicStemKeysFromItem,
  ordersForEmail,
  signDownloadToken,
  verifyAccountSession,
  verifyDownloadToken,
  type CommerceEnv,
} from "../lib/commerce";
import { findProduct } from "../lib/products-catalog";
import { findCatalogItem } from "../lib/library-catalog";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { incrementDownloadStat } from "../lib/download-stats";

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

  // Re-issue token(s)
  if (request.method === "POST") {
    let body: {
      licenseKey?: string;
      productSlug?: string;
      workSlug?: string;
      file?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
    const licenseKey = String(body.licenseKey || "").trim();
    const productSlug = String(body.productSlug || body.workSlug || "").trim();
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

    const orders = await ordersForEmail(env.LIBRARY_BUCKET, lic.email);
    const order =
      orders.find((o) => o.licenseKey === licenseKey) ||
      (lic.orderId ? await findOrderById(env.LIBRARY_BUCKET, lic.orderId) : null);

    const isMusic = order?.kind === "music" || Boolean(body.workSlug);
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

    if (isMusic) {
      const item = await findCatalogItem(env.LIBRARY_BUCKET, productSlug);
      const masterKey =
        (order?.fullKey && isAllowedDownloadKey(order.fullKey) && order.fullKey) ||
        (item?.masterKey && isAllowedDownloadKey(String(item.masterKey))
          ? String(item.masterKey)
          : null);
      const stemKeys =
        (order?.stemKeys && order.stemKeys.length
          ? order.stemKeys.filter(isAllowedDownloadKey)
          : null) ||
        (order?.includeStems ? musicStemKeysFromItem(item) : []);

      const want = String(body.file || "all").toLowerCase();
      const files: { name: string; url: string; role: string }[] = [];

      if ((want === "master" || want === "all") && masterKey) {
        const token = await signDownloadToken(secret, {
          slug: productSlug,
          key: licenseKey,
          fileKey: masterKey,
          exp,
        });
        files.push({
          name: masterKey.split("/").pop() || "master.wav",
          url: `/api/download?token=${encodeURIComponent(token)}`,
          role: "master",
        });
      }
      if ((want === "stems" || want === "all") && stemKeys.length) {
        for (const sk of stemKeys) {
          const token = await signDownloadToken(secret, {
            slug: productSlug,
            key: licenseKey,
            fileKey: sk,
            exp,
          });
          files.push({
            name: sk.split("/").pop() || "stem.wav",
            url: `/api/download?token=${encodeURIComponent(token)}`,
            role: "stem",
          });
        }
      }
      if (!files.length) {
        return json({ ok: false, error: "no_files" }, 404);
      }
      return json({ ok: true, kind: "music", files, expHours: 24 });
    }

    // Software
    const product = await findProduct(env.LIBRARY_BUCKET, productSlug);
    const fileKey =
      (order?.fullKey && isAllowedDownloadKey(order.fullKey) && order.fullKey) ||
      product?.fullKey ||
      null;
    if (!fileKey || !isAllowedDownloadKey(fileKey)) {
      return json({ ok: false, error: "no_full_build" }, 404);
    }
    const token = await signDownloadToken(secret, {
      slug: productSlug,
      key: licenseKey,
      fileKey,
      exp,
    });
    return json({
      ok: true,
      kind: "software",
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
  if (!isAllowedDownloadKey(key)) {
    return json({ ok: false, error: "forbidden_key" }, 403);
  }

  const obj = await env.LIBRARY_BUCKET.get(key);
  if (!obj) return json({ ok: false, error: "file_not_found" }, 404);

  const r2obj = obj as {
    body?: ReadableStream | null;
    arrayBuffer?: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
    text: () => Promise<string>;
  };

  const fileName = key.split("/").pop() || "download.bin";
  const contentType =
    r2obj.httpMetadata?.contentType || "application/octet-stream";

  // Contar solo entrega real (GET), no HEAD de probes.
  // Tráfico interno (estudio): se sirve la descarga pero NO se cuenta.
  if (request.method === "GET" && !isInternalTraffic(request, env)) {
    const statSlug =
      payload.slug ||
      (key.startsWith("library/products/")
        ? key.split("/")[2] || ""
        : key.startsWith("library/")
          ? key.split("/")[1] || ""
          : "");
    if (statSlug) {
      await incrementDownloadStat(env.LIBRARY_BUCKET, statSlug, "full");
    }
  }

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
