/**
 * Auth del panel /admin/* —
 * - ADMIN_LIBRARY_SECRET = contraseña de login
 * - ADMIN_SESSION_SECRET = clave HMAC de cookie (si falta, se deriva del password)
 * Cookie httpOnly, Path=/admin, SameSite=Lax, Domain=.nimpo3dstudio.com en prod.
 */

const COOKIE = "nimpo_admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 días
const COOKIE_PATH = "/admin";

export type AdminEnv = {
  ADMIN_LIBRARY_SECRET?: string;
  /** Clave de firma de sesión (recomendada, distinta del password). */
  ADMIN_SESSION_SECRET?: string;
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

/**
 * Clave de firma de cookie.
 * Preferir ADMIN_SESSION_SECRET (largo, aleatorio).
 * Fallback: derivación determinista del password (instalaciones sin secret extra).
 */
export async function getSessionSigningKey(env: AdminEnv): Promise<string | null> {
  const explicit = String(env.ADMIN_SESSION_SECRET || "").trim();
  if (explicit.length >= 16) return explicit;

  const password = String(env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) return null;

  const key = await hmacKey(password);
  const derived = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("nimpo-admin-session-v1"),
  );
  return b64url(derived);
}

/** Comparación constant-time de dos strings (password vs secret). */
export async function secretsEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length, 1);
  const xa = new Uint8Array(len);
  const xb = new Uint8Array(len);
  xa.set(ba);
  xb.set(bb);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= xa[i]! ^ xb[i]!;
  }
  return diff === 0;
}

export async function createSessionToken(signingKey: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `v1.${exp}`;
  const sig = await sign(signingKey, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  signingKey: string,
  token: string | undefined | null,
): Promise<boolean> {
  if (!token || !signingKey) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [v, expStr, sig] = parts;
  if (v !== "v1" || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${v}.${expStr}`;
  const expected = await sign(signingKey, payload);
  if (expected.length !== sig.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return ok === 0;
}

/** Comprueba cookie de sesión con la clave correcta del env. */
export async function isAdminAuthenticated(
  env: AdminEnv,
  request: Request,
): Promise<boolean> {
  const key = await getSessionSigningKey(env);
  if (!key) return false;
  const token = getSessionFromRequest(request);
  return verifySessionToken(key, token);
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/** Domain compartido apex/www; host-only en localhost / pages.dev. */
export function cookieDomainForRequest(request?: Request | null): string | null {
  if (!request) return ".nimpo3dstudio.com";
  try {
    const host = new URL(request.url).hostname;
    if (host === "nimpo3dstudio.com" || host.endsWith(".nimpo3dstudio.com")) {
      return ".nimpo3dstudio.com";
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function sessionCookieHeader(token: string, request?: Request | null): string {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SEC}`,
  ];
  const domain = cookieDomainForRequest(request);
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export function clearSessionCookieHeader(request?: Request | null): string {
  const parts = [
    `${COOKIE}=`,
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  const domain = cookieDomainForRequest(request);
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export function getSessionFromRequest(request: Request): string | undefined {
  return parseCookies(request.headers.get("Cookie"))[COOKIE];
}

export { COOKIE, MAX_AGE_SEC, COOKIE_PATH };
