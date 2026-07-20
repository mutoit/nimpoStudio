/**
 * GET /api/media/* — sirve objetos R2 por same-origin (evita CORS en Web Audio).
 * Clave = path tras /api/media/  (ej. library/slug/file.mp3)
 */

type Env = {
  LIBRARY_BUCKET?: {
    get: (key: string) => Promise<{
      body: ReadableStream | null;
      httpMetadata?: { contentType?: string };
      size?: number;
    } | null>;
  };
};

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path?: string | string[] };
}) {
  const { request, env, params } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return bad(405, "method_not_allowed");
  }

  if (!env.LIBRARY_BUCKET) return bad(503, "r2_not_configured");

  const raw = params.path;
  const key = (Array.isArray(raw) ? raw.join("/") : String(raw || ""))
    .replace(/^\/+/, "")
    .replace(/\.\./g, "");

  if (!key || !key.startsWith("library/")) {
    return bad(400, "invalid_key");
  }

  const obj = await env.LIBRARY_BUCKET.get(key);
  if (!obj || !obj.body) return bad(404, "not_found");

  const contentType = obj.httpMetadata?.contentType || "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Length, Content-Type, Accept-Ranges",
    "Accept-Ranges": "bytes",
  };

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(obj.body, { status: 200, headers });
}
