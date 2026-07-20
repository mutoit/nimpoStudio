/**
 * Auth del panel /admin/* — secreto solo en servidor (Pages env ADMIN_LIBRARY_SECRET).
 * Cookie httpOnly firmada (HMAC-SHA256).
 */

const COOKIE = "nimpo_admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 días

export type AdminEnv = {
  ADMIN_LIBRARY_SECRET?: string;
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `v1.${exp}`;
  const sig = await sign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [v, expStr, sig] = parts;
  if (v !== "v1" || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${v}.${expStr}`;
  const expected = await sign(secret, payload);
  // comparación en tiempo constante simple
  if (expected.length !== sig.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return ok === 0;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function sessionCookieHeader(token: string): string {
  return [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${MAX_AGE_SEC}`,
  ].join("; ");
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function getSessionFromRequest(request: Request): string | undefined {
  return parseCookies(request.headers.get("Cookie"))[COOKIE];
}

export { COOKIE, MAX_AGE_SEC };
