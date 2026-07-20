/**
 * POST /admin/upload (multipart)
 * Requiere cookie admin. Sube a R2 si hay binding LIBRARY_BUCKET.
 * Body fields: slug, kind, files (video | cover | stem_*), stemLabels (JSON)
 *
 * R2 debe estar activado en la cuenta y el binding en wrangler.toml / Pages.
 */

import {
  getSessionFromRequest,
  verifySessionToken,
  type AdminEnv,
} from "../lib/admin-auth";
import { checkRateLimit, clientIp } from "../lib/rate-limit";

type Env = AdminEnv & {
  LIBRARY_BUCKET?: {
    put: (
      key: string,
      value: ArrayBuffer | ReadableStream | string,
      opts?: { httpMetadata?: { contentType?: string } },
    ) => Promise<unknown>;
  };
  LIBRARY_PUBLIC_BASE?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function safeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB por archivo

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const secret = (env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!secret) {
    return json({ ok: false, error: "not_configured" }, 503);
  }
  const token = getSessionFromRequest(request);
  if (!(await verifySessionToken(secret, token))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const ip = clientIp(request);
  const rl = checkRateLimit(`admin-upload:${ip}`, { limit: 30, windowSec: 3600 });
  if (!rl.ok) {
    return json(
      { ok: false, error: "rate_limited" },
      429,
    );
  }

  if (!env.LIBRARY_BUCKET) {
    return json(
      {
        ok: false,
        error: "r2_not_configured",
        message:
          "R2 no está activado o falta binding LIBRARY_BUCKET. Usa la descarga local del panel o activa R2 en Cloudflare.",
      },
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_form" }, 400);
  }

  const slug = safeName(String(form.get("slug") || "item")) || "item";
  const uploaded: { field: string; key: string; publicPath: string; bytes: number }[] = [];
  const base = (env.LIBRARY_PUBLIC_BASE || "/library").replace(/\/$/, "");

  for (const [field, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > MAX_BYTES) {
      return json(
        { ok: false, error: "file_too_large", field, maxMb: MAX_BYTES / (1024 * 1024) },
        413,
      );
    }
    const ext = (value.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `library/${slug}/${safeName(field)}.${ext}`;
    const buf = await value.arrayBuffer();
    await env.LIBRARY_BUCKET.put(key, buf, {
      httpMetadata: { contentType: value.type || "application/octet-stream" },
    });
    uploaded.push({
      field,
      key,
      publicPath: `${base}/${slug}/${safeName(field)}.${ext}`,
      bytes: value.size,
    });
  }

  if (!uploaded.length) {
    return json({ ok: false, error: "no_files" }, 400);
  }

  return json({ ok: true, slug, uploaded });
}
