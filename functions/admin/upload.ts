/**
 * POST /admin/upload (multipart)
 * Requiere cookie admin. Sube a R2 (binding LIBRARY_BUCKET).
 * Devuelve URLs públicas (r2.dev o LIBRARY_PUBLIC_BASE).
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
  /** ej. https://pub-xxx.r2.dev */
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

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

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
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  if (!env.LIBRARY_BUCKET) {
    return json(
      {
        ok: false,
        error: "r2_not_configured",
        message:
          "Falta binding LIBRARY_BUCKET. Revisa wrangler.toml y redespliega Pages.",
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
  const publicBase = (
    env.LIBRARY_PUBLIC_BASE ||
    "https://pub-c5f9444f68c84064be0b94ebfd66c91c.r2.dev"
  ).replace(/\/$/, "");

  const uploaded: {
    field: string;
    key: string;
    publicUrl: string;
    publicPath: string;
    bytes: number;
  }[] = [];

  for (const [field, value] of form.entries()) {
    if (field === "slug" || field === "kind") continue;
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > MAX_BYTES) {
      return json(
        {
          ok: false,
          error: "file_too_large",
          field,
          maxMb: MAX_BYTES / (1024 * 1024),
        },
        413,
      );
    }

    // field o nombre de archivo ya viene con extensión desde el admin
    const rawName = field.includes(".") ? field : value.name;
    const fileName = safeName(rawName) || `file-${uploaded.length + 1}.bin`;
    const key = `library/${slug}/${fileName}`;
    const buf = await value.arrayBuffer();
    await env.LIBRARY_BUCKET.put(key, buf, {
      httpMetadata: {
        contentType: value.type || "application/octet-stream",
      },
    });
    const publicUrl = `${publicBase}/${key}`;
    uploaded.push({
      field,
      key,
      publicUrl,
      // path usable en library.json (URL absoluta r2.dev)
      publicPath: publicUrl,
      bytes: value.size,
    });
  }

  if (!uploaded.length) {
    return json({ ok: false, error: "no_files" }, 400);
  }

  return json({
    ok: true,
    slug,
    publicBase,
    uploaded,
  });
}
