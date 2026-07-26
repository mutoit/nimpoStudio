/**
 * Auth admin compartida (un solo gate para /admin/* APIs).
 */

import {
  getSessionFromRequest,
  getSessionSigningKey,
  verifySessionToken,
  type AdminEnv,
} from "./admin-auth";

export type AdminBucket = {
  get: (key: string) => Promise<{
    text: () => Promise<string>;
    json: <T>() => Promise<T>;
  } | null>;
  put: (
    key: string,
    value: string | ArrayBuffer,
    opts?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  list?: (opts: {
    prefix: string;
    cursor?: string;
    limit?: number;
  }) => Promise<{
    objects: { key: string }[];
    truncated: boolean;
    cursor?: string;
  }>;
  delete?: (key: string) => Promise<void>;
};

export type AdminJsonEnv = AdminEnv & {
  LIBRARY_BUCKET?: AdminBucket;
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

/**
 * P: request + env con secret y bucket. Q: bucket listo o Response de error.
 */
export async function requireAdmin(
  env: AdminJsonEnv,
  request: Request,
): Promise<{ bucket: AdminBucket } | { error: Response }> {
  const password = String(env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) {
    return { error: json({ ok: false, error: "not_configured" }, 503) };
  }
  const signingKey = await getSessionSigningKey(env);
  const token = getSessionFromRequest(request);
  if (!signingKey || !(await verifySessionToken(signingKey, token))) {
    return { error: json({ ok: false, error: "unauthorized" }, 401) };
  }
  if (!env.LIBRARY_BUCKET) {
    return { error: json({ ok: false, error: "r2_not_configured" }, 503) };
  }
  return { bucket: env.LIBRARY_BUCKET };
}

export { json as adminJson };
