/**
 * GET /api/media/* — sirve objetos R2 same-origin.
 * Soporta Range (seek) cuando el cliente lo pide.
 */

type Env = {
  LIBRARY_BUCKET?: {
    get: (
      key: string,
      opts?: { range?: { offset: number; length?: number } },
    ) => Promise<{
      body: ReadableStream | null;
      httpMetadata?: { contentType?: string };
      size?: number;
      range?: { offset: number; length: number };
    } | null>;
    head?: (key: string) => Promise<{
      size?: number;
      httpMetadata?: { contentType?: string };
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

function parseRange(
  header: string | null,
  size: number,
): { offset: number; length: number } | null {
  if (!header || !header.startsWith("bytes=") || !(size > 0)) return null;
  const part = header.slice(6).split(",")[0]?.trim() || "";
  const m = /^(\d*)-(\d*)$/.exec(part);
  if (!m) return null;
  let start = m[1] === "" ? NaN : Number(m[1]);
  let end = m[2] === "" ? NaN : Number(m[2]);
  if (Number.isNaN(start) && Number.isNaN(end)) return null;
  if (Number.isNaN(start)) {
    // bytes=-N → últimos N
    const n = end;
    if (!(n > 0)) return null;
    start = Math.max(0, size - n);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }
  if (start < 0 || end < start || start >= size) return null;
  end = Math.min(end, size - 1);
  return { offset: start, length: end - start + 1 };
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

  // Tamaño: head si existe, si no get completo
  let size = 0;
  let contentType = "application/octet-stream";
  if (env.LIBRARY_BUCKET.head) {
    const h = await env.LIBRARY_BUCKET.head(key);
    if (!h) return bad(404, "not_found");
    size = Number(h.size || 0);
    contentType = h.httpMetadata?.contentType || contentType;
  }

  const rangeHdr = request.headers.get("Range");
  const range = size > 0 ? parseRange(rangeHdr, size) : null;

  const obj = await env.LIBRARY_BUCKET.get(
    key,
    range ? { range: { offset: range.offset, length: range.length } } : undefined,
  );
  if (!obj || (!obj.body && request.method === "GET")) return bad(404, "not_found");

  contentType = obj.httpMetadata?.contentType || contentType;
  if (!size && obj.size) size = Number(obj.size);

  const isImage = /^image\//i.test(contentType) || /\.(jpe?g|png|webp|gif|avif)$/i.test(key);
  const isAudio = /^audio\//i.test(contentType) || /\.(wav|mp3|ogg|m4a|aac|flac)$/i.test(key);
  const isPreview = /preview/i.test(key);
  const cacheControl = isImage
    ? "public, max-age=604800, stale-while-revalidate=86400"
    : isPreview || isAudio
      ? "public, max-age=86400, stale-while-revalidate=3600"
      : "public, max-age=86400, stale-while-revalidate=3600";

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Type, Accept-Ranges, Content-Range",
    "Accept-Ranges": "bytes",
  };

  if (size > 0) headers["Content-Length"] = String(range ? range.length : size);

  if (range && size > 0) {
    const end = range.offset + range.length - 1;
    headers["Content-Range"] = `bytes ${range.offset}-${end}/${size}`;
    if (request.method === "HEAD") {
      return new Response(null, { status: 206, headers });
    }
    return new Response(obj.body, { status: 206, headers });
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(obj.body, { status: 200, headers });
}
