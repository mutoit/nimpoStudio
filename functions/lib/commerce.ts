/**
 * Commerce SSoT: orders, licenses, customers, tickets, download tokens, magic sessions.
 * Storage: R2 JSON monofile (catalog/commerce/*).
 * Limitación conocida: no atómico bajo concurrencia alta — D1 schema en
 * migrations/0001_commerce.sql para migrar cuando haya volumen real.
 * ORDERS_DB tipado para el binding futuro; no hay dual-write aún.
 */

import type { AdminEnv } from "./admin-auth";
import type { ProductsBucket } from "./products-catalog";

export const ORDERS_KEY = "catalog/commerce/orders.json";
export const LICENSES_KEY = "catalog/commerce/licenses.json";
export const CUSTOMERS_KEY = "catalog/commerce/customers.json";
export const TICKETS_KEY = "catalog/commerce/tickets.json";

export type CommerceOrder = {
  id: string;
  email: string;
  productSlug: string;
  productName: string;
  planId: string;
  planName: string;
  amountEur: number | null;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  licenseKey?: string;
  fullKey?: string | null;
  createdAt: string;
  paidAt?: string;
};

export type CommerceLicense = {
  key: string;
  orderId: string;
  productSlug: string;
  email: string;
  planId: string;
  seats: number;
  activations: { machineId: string; activatedAt: string }[];
  revoked: boolean;
  createdAt: string;
};

export type CommerceCustomer = {
  email: string;
  nick: string | null;
  productSlugs: string[];
  createdAt: string;
  lastPurchaseAt?: string;
  lastSeenAt?: string;
  emailHistory?: string[];
};

export type TicketChannel = "bug" | "suggestion" | "support" | "other";
export type TicketStatus = "new" | "triaged" | "waiting" | "done" | "wontfix";

export type CommerceTicket = {
  id: string;
  email: string;
  buyer: boolean;
  productSlug: string | null;
  channel: TicketChannel;
  subtype: string;
  message: string;
  nick: string | null;
  name: string | null;
  status: TicketStatus;
  createdAt: string;
  orderIds?: string[];
  ip?: string;
  /** Recovery extras (opaque; admin only). */
  recovery?: {
    oldEmail?: string;
    newEmail?: string;
    licenseKey?: string;
    proof?: string;
  };
};

export const TICKET_CHANNELS = ["bug", "suggestion", "support", "other"] as const;

export const TICKET_SUBTYPES: Record<TicketChannel, readonly string[]> = {
  bug: ["crash", "install", "license_activate", "performance", "ui", "data_loss", "other"],
  suggestion: ["cosmetic", "visual", "feature", "workflow", "docs", "other"],
  support: [
    "download",
    "license",
    "billing",
    "how_to",
    "account_recovery",
    "email_change",
    "lost_license",
    "reset_devices",
    "missing_order",
    "other",
  ],
  other: ["other"],
};

export const NICK_RE = /^[a-zA-Z0-9_]{3,20}$/;

export type CommerceEnv = AdminEnv & {
  LIBRARY_BUCKET?: ProductsBucket;
  ORDERS_DB?: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  DOWNLOAD_SECRET?: string;
  SITE_URL?: string;
};

type D1Database = {
  prepare: (sql: string) => {
    bind: (...args: unknown[]) => {
      first: <T>() => Promise<T | null>;
      all: <T>() => Promise<{ results: T[] }>;
      run: () => Promise<unknown>;
    };
    first: <T>() => Promise<T | null>;
    all: <T>() => Promise<{ results: T[] }>;
    run: () => Promise<unknown>;
  };
  batch?: (stmts: unknown[]) => Promise<unknown>;
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJson(obj: unknown): string {
  const s = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64urlJson<T>(s: string): T | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

/**
 * Signing key for download tokens + magic link + account session.
 * P: DOWNLOAD_SECRET o ADMIN_SESSION_SECRET (≥16).
 * Q: secret usable. Nunca el password de login (ADMIN_LIBRARY_SECRET).
 */
export function commerceSecret(env: CommerceEnv): string {
  const download = String(env.DOWNLOAD_SECRET || "").trim();
  if (download.length >= 16) return download;
  const session = String(env.ADMIN_SESSION_SECRET || "").trim();
  if (session.length >= 16) return session;
  return "";
}

export function siteBase(env: CommerceEnv, request?: Request): string {
  const fromEnv = String(env.SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (request) {
    try {
      const u = new URL(request.url);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* */
    }
  }
  return "https://nimpo3dstudio.com";
}

/** NIMPO-XXXX-XXXX-XXXX */
export function generateLicenseKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = (n: number) => {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    let out = "";
    for (let i = 0; i < n; i++) out += alphabet[bytes[i]! % alphabet.length];
    return out;
  };
  return `NIMPO-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

export function newId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = crypto.getRandomValues(new Uint8Array(4));
  let h = "";
  for (const b of r) h += b.toString(16).padStart(2, "0");
  return `${prefix}_${t}_${h}`;
}

// —— Download tokens (full binary) ——

export type DownloadTokenPayload = {
  v: 1;
  slug: string;
  key: string; // license key
  fileKey: string; // R2 key under library/products/.../full/
  exp: number;
};

export async function signDownloadToken(
  secret: string,
  payload: Omit<DownloadTokenPayload, "v">,
): Promise<string> {
  const body: DownloadTokenPayload = { v: 1, ...payload };
  const p = b64urlJson(body);
  const sig = await hmacSign(secret, p);
  return `${p}.${sig}`;
}

export async function verifyDownloadToken(
  secret: string,
  token: string,
): Promise<DownloadTokenPayload | null> {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [p, sig] = parts;
  if (!p || !sig) return null;
  const expected = await hmacSign(secret, p);
  if (expected.length !== sig.length) return null;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (ok !== 0) return null;
  const body = fromB64urlJson<DownloadTokenPayload>(p);
  if (!body || body.v !== 1) return null;
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  if (!body.fileKey.startsWith("library/products/") || !body.fileKey.includes("/full/")) {
    return null;
  }
  return body;
}

// —— Magic link / account session ——

export type MagicPayload = { v: 1; email: string; exp: number };
export type AccountSessionPayload = { v: 1; email: string; exp: number };

const ACCOUNT_COOKIE = "nimpo_account_session";
const ACCOUNT_MAX_AGE = 60 * 60 * 24 * 30; // 30d
const MAGIC_TTL = 60 * 30; // 30 min

export async function signMagicToken(secret: string, email: string): Promise<string> {
  const body: MagicPayload = {
    v: 1,
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + MAGIC_TTL,
  };
  const p = b64urlJson(body);
  const sig = await hmacSign(secret, `magic.${p}`);
  return `${p}.${sig}`;
}

export async function verifyMagicToken(
  secret: string,
  token: string,
): Promise<MagicPayload | null> {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [p, sig] = parts;
  if (!p || !sig) return null;
  const expected = await hmacSign(secret, `magic.${p}`);
  if (expected.length !== sig.length) return null;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (ok !== 0) return null;
  const body = fromB64urlJson<MagicPayload>(p);
  if (!body || body.v !== 1 || !body.email) return null;
  if (body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

export async function signAccountSession(secret: string, email: string): Promise<string> {
  const body: AccountSessionPayload = {
    v: 1,
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + ACCOUNT_MAX_AGE,
  };
  const p = b64urlJson(body);
  const sig = await hmacSign(secret, `acct.${p}`);
  return `${p}.${sig}`;
}

export async function verifyAccountSession(
  secret: string,
  token: string | undefined | null,
): Promise<AccountSessionPayload | null> {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const [p, sig] = parts;
  if (!p || !sig) return null;
  const expected = await hmacSign(secret, `acct.${p}`);
  if (expected.length !== sig.length) return null;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (ok !== 0) return null;
  const body = fromB64urlJson<AccountSessionPayload>(p);
  if (!body || body.v !== 1 || !body.email) return null;
  if (body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

export function accountSessionCookie(token: string, request?: Request): string {
  const parts = [
    `${ACCOUNT_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${ACCOUNT_MAX_AGE}`,
  ];
  try {
    const host = request ? new URL(request.url).hostname : "";
    if (host === "nimpo3dstudio.com" || host.endsWith(".nimpo3dstudio.com")) {
      parts.push("Domain=.nimpo3dstudio.com");
    }
  } catch {
    /* */
  }
  return parts.join("; ");
}

export function clearAccountSessionCookie(request?: Request): string {
  const parts = [
    `${ACCOUNT_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  try {
    const host = request ? new URL(request.url).hostname : "";
    if (host === "nimpo3dstudio.com" || host.endsWith(".nimpo3dstudio.com")) {
      parts.push("Domain=.nimpo3dstudio.com");
    }
  } catch {
    /* */
  }
  return parts.join("; ");
}

export function getAccountTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k === ACCOUNT_COOKIE) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return part.slice(i + 1).trim();
      }
    }
  }
  return undefined;
}

// —— R2 store ——

async function readJsonArray<T>(
  bucket: ProductsBucket | undefined,
  key: string,
): Promise<T[]> {
  if (!bucket) return [];
  const obj = await bucket.get(key);
  if (!obj) return [];
  try {
    const data = await obj.json<unknown>();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonArray(
  bucket: ProductsBucket,
  key: string,
  items: unknown[],
): Promise<void> {
  await bucket.put(key, JSON.stringify(items, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function listOrders(bucket: ProductsBucket | undefined): Promise<CommerceOrder[]> {
  const list = await readJsonArray<CommerceOrder>(bucket, ORDERS_KEY);
  return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function listLicenses(
  bucket: ProductsBucket | undefined,
): Promise<CommerceLicense[]> {
  return readJsonArray<CommerceLicense>(bucket, LICENSES_KEY);
}

export async function upsertOrder(
  bucket: ProductsBucket,
  order: CommerceOrder,
): Promise<CommerceOrder[]> {
  const list = await listOrders(bucket);
  const next = list.filter((o) => o.id !== order.id && o.stripeSessionId !== order.stripeSessionId);
  next.unshift(order);
  await writeJsonArray(bucket, ORDERS_KEY, next);
  return next;
}

export async function findOrderBySession(
  bucket: ProductsBucket | undefined,
  sessionId: string,
): Promise<CommerceOrder | null> {
  const list = await listOrders(bucket);
  return list.find((o) => o.stripeSessionId === sessionId) || null;
}

export async function findOrderById(
  bucket: ProductsBucket | undefined,
  id: string,
): Promise<CommerceOrder | null> {
  const list = await listOrders(bucket);
  return list.find((o) => o.id === id) || null;
}

export async function upsertLicense(
  bucket: ProductsBucket,
  lic: CommerceLicense,
): Promise<CommerceLicense[]> {
  const list = await listLicenses(bucket);
  const next = list.filter((l) => l.key !== lic.key);
  next.unshift(lic);
  await writeJsonArray(bucket, LICENSES_KEY, next);
  return next;
}

export async function findLicense(
  bucket: ProductsBucket | undefined,
  key: string,
): Promise<CommerceLicense | null> {
  const k = String(key || "").trim().toUpperCase();
  const list = await listLicenses(bucket);
  return list.find((l) => l.key.toUpperCase() === k) || null;
}

export async function licensesForEmail(
  bucket: ProductsBucket | undefined,
  email: string,
): Promise<CommerceLicense[]> {
  const e = email.toLowerCase().trim();
  const list = await listLicenses(bucket);
  return list.filter((l) => l.email.toLowerCase() === e && !l.revoked);
}

export async function ordersForEmail(
  bucket: ProductsBucket | undefined,
  email: string,
): Promise<CommerceOrder[]> {
  const e = email.toLowerCase().trim();
  const list = await listOrders(bucket);
  return list.filter((o) => o.email.toLowerCase() === e && o.status === "paid");
}

export async function revokeLicense(
  bucket: ProductsBucket,
  key: string,
): Promise<CommerceLicense | null> {
  const lic = await findLicense(bucket, key);
  if (!lic) return null;
  const next = { ...lic, revoked: true };
  await upsertLicense(bucket, next);
  return next;
}

export async function activateLicense(
  bucket: ProductsBucket,
  key: string,
  machineId: string,
): Promise<{ ok: true; license: CommerceLicense } | { ok: false; error: string }> {
  const lic = await findLicense(bucket, key);
  if (!lic) return { ok: false, error: "invalid_key" };
  if (lic.revoked) return { ok: false, error: "revoked" };
  const mid = String(machineId || "").trim().slice(0, 120);
  if (!mid) return { ok: false, error: "missing_machine" };
  const existing = lic.activations || [];
  if (existing.some((a) => a.machineId === mid)) {
    return { ok: true, license: lic };
  }
  if (existing.length >= (lic.seats || 1)) {
    return { ok: false, error: "seats_exhausted" };
  }
  const next: CommerceLicense = {
    ...lic,
    activations: [...existing, { machineId: mid, activatedAt: new Date().toISOString() }],
  };
  await upsertLicense(bucket, next);
  return { ok: true, license: next };
}

/** Resolve full R2 key for product (from order or product meta). */
export function productFullKey(
  product: { slug: string; fullKey?: string | null },
  orderFull?: string | null,
): string | null {
  if (orderFull && orderFull.includes("/full/")) return orderFull;
  if (product.fullKey && product.fullKey.includes("/full/")) return product.fullKey;
  return null;
}

// —— Customers ——

export async function listCustomers(
  bucket: ProductsBucket | undefined,
): Promise<CommerceCustomer[]> {
  return readJsonArray<CommerceCustomer>(bucket, CUSTOMERS_KEY);
}

export async function findCustomer(
  bucket: ProductsBucket | undefined,
  email: string,
): Promise<CommerceCustomer | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;
  const list = await listCustomers(bucket);
  return list.find((c) => c.email.toLowerCase() === e) || null;
}

export async function upsertCustomer(
  bucket: ProductsBucket,
  customer: CommerceCustomer,
): Promise<CommerceCustomer[]> {
  const email = customer.email.toLowerCase().trim();
  const list = await listCustomers(bucket);
  const next = list.filter((c) => c.email.toLowerCase() !== email);
  next.unshift({ ...customer, email });
  await writeJsonArray(bucket, CUSTOMERS_KEY, next);
  return next;
}

/**
 * After paid order: create or merge customer productSlugs + lastPurchaseAt.
 */
export async function recordCustomerPurchase(
  bucket: ProductsBucket,
  email: string,
  productSlug: string,
  paidAt?: string,
): Promise<CommerceCustomer> {
  const e = email.toLowerCase().trim();
  const slug = String(productSlug || "").trim();
  const now = paidAt || new Date().toISOString();
  const existing = await findCustomer(bucket, e);
  const slugs = new Set(existing?.productSlugs || []);
  if (slug) slugs.add(slug);
  const customer: CommerceCustomer = {
    email: e,
    nick: existing?.nick ?? null,
    productSlugs: Array.from(slugs),
    createdAt: existing?.createdAt || now,
    lastPurchaseAt: now,
    lastSeenAt: existing?.lastSeenAt,
    emailHistory: existing?.emailHistory,
  };
  await upsertCustomer(bucket, customer);
  return customer;
}

export async function isPaidBuyer(
  bucket: ProductsBucket | undefined,
  email: string,
  productSlug?: string | null,
): Promise<{ buyer: boolean; orderIds: string[] }> {
  const orders = await ordersForEmail(bucket, email);
  const filtered = productSlug
    ? orders.filter((o) => o.productSlug === productSlug)
    : orders;
  return {
    buyer: filtered.length > 0,
    orderIds: filtered.map((o) => o.id),
  };
}

export function normalizeNick(raw: string): string | null {
  const n = String(raw || "").trim();
  if (!NICK_RE.test(n)) return null;
  return n;
}

export async function findCustomerByNick(
  bucket: ProductsBucket | undefined,
  nick: string,
): Promise<CommerceCustomer | null> {
  const n = String(nick || "").trim().toLowerCase();
  if (!n) return null;
  const list = await listCustomers(bucket);
  return list.find((c) => (c.nick || "").toLowerCase() === n) || null;
}

/**
 * Set nick for customer (creates shell customer if missing). Unique case-insensitive.
 */
export async function setCustomerNick(
  bucket: ProductsBucket,
  email: string,
  nickRaw: string,
): Promise<
  | { ok: true; customer: CommerceCustomer }
  | { ok: false; error: "invalid_nick" | "nick_taken" }
> {
  const nick = normalizeNick(nickRaw);
  if (!nick) return { ok: false, error: "invalid_nick" };
  const e = email.toLowerCase().trim();
  const taken = await findCustomerByNick(bucket, nick);
  if (taken && taken.email !== e) return { ok: false, error: "nick_taken" };
  const existing = await findCustomer(bucket, e);
  const now = new Date().toISOString();
  const customer: CommerceCustomer = {
    email: e,
    nick,
    productSlugs: existing?.productSlugs || [],
    createdAt: existing?.createdAt || now,
    lastPurchaseAt: existing?.lastPurchaseAt,
    lastSeenAt: now,
    emailHistory: existing?.emailHistory,
  };
  await upsertCustomer(bucket, customer);
  return { ok: true, customer };
}

export async function touchCustomerSeen(
  bucket: ProductsBucket,
  email: string,
): Promise<void> {
  const existing = await findCustomer(bucket, email);
  if (!existing) return;
  await upsertCustomer(bucket, {
    ...existing,
    lastSeenAt: new Date().toISOString(),
  });
}

/**
 * Transfer all commerce rows from fromEmail → toEmail.
 * Merges productSlugs; records fromEmail in emailHistory.
 */
export async function transferCustomerEmail(
  bucket: ProductsBucket,
  fromEmail: string,
  toEmail: string,
): Promise<
  | { ok: true; to: string; orders: number; licenses: number }
  | { ok: false; error: string }
> {
  const from = fromEmail.toLowerCase().trim();
  const to = toEmail.toLowerCase().trim();
  if (!from || !to || from === to) return { ok: false, error: "invalid_emails" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "invalid_emails" };

  const orders = await listOrders(bucket);
  let orderCount = 0;
  const nextOrders = orders.map((o) => {
    if (o.email.toLowerCase() !== from) return o;
    orderCount++;
    return { ...o, email: to };
  });
  if (orderCount > 0) await writeJsonArray(bucket, ORDERS_KEY, nextOrders);

  const licenses = await listLicenses(bucket);
  let licCount = 0;
  const nextLic = licenses.map((l) => {
    if (l.email.toLowerCase() !== from) return l;
    licCount++;
    return { ...l, email: to };
  });
  if (licCount > 0) await writeJsonArray(bucket, LICENSES_KEY, nextLic);

  const fromCust = await findCustomer(bucket, from);
  const toCust = await findCustomer(bucket, to);
  const now = new Date().toISOString();
  const slugs = new Set([...(fromCust?.productSlugs || []), ...(toCust?.productSlugs || [])]);
  const history = [
    ...(toCust?.emailHistory || []),
    ...(fromCust?.emailHistory || []),
    from,
  ].filter((x, i, a) => a.indexOf(x) === i && x !== to);

  const merged: CommerceCustomer = {
    email: to,
    nick: toCust?.nick || fromCust?.nick || null,
    productSlugs: Array.from(slugs),
    createdAt: toCust?.createdAt || fromCust?.createdAt || now,
    lastPurchaseAt: [toCust?.lastPurchaseAt, fromCust?.lastPurchaseAt]
      .filter(Boolean)
      .sort()
      .reverse()[0] as string | undefined,
    lastSeenAt: now,
    emailHistory: history,
  };
  const allCust = (await listCustomers(bucket)).filter(
    (c) => c.email.toLowerCase() !== from && c.email.toLowerCase() !== to,
  );
  allCust.unshift(merged);
  await writeJsonArray(bucket, CUSTOMERS_KEY, allCust);

  // Tickets: rewrite email for history
  const tickets = await listTickets(bucket);
  if (tickets.some((t) => t.email.toLowerCase() === from)) {
    await writeJsonArray(
      bucket,
      TICKETS_KEY,
      tickets.map((t) => (t.email.toLowerCase() === from ? { ...t, email: to } : t)),
    );
  }

  return { ok: true, to, orders: orderCount, licenses: licCount };
}

export async function rotateLicenseKey(
  bucket: ProductsBucket,
  oldKey: string,
): Promise<
  | { ok: true; license: CommerceLicense; oldKey: string }
  | { ok: false; error: string }
> {
  const lic = await findLicense(bucket, oldKey);
  if (!lic) return { ok: false, error: "not_found" };
  if (lic.revoked) return { ok: false, error: "revoked" };
  const newKey = generateLicenseKey();
  // revoke old
  await upsertLicense(bucket, { ...lic, revoked: true });
  const next: CommerceLicense = {
    ...lic,
    key: newKey,
    activations: [],
    revoked: false,
    createdAt: new Date().toISOString(),
  };
  await upsertLicense(bucket, next);
  // update order licenseKey if matches
  const orders = await listOrders(bucket);
  const updated = orders.map((o) =>
    o.licenseKey && o.licenseKey.toUpperCase() === lic.key.toUpperCase()
      ? { ...o, licenseKey: newKey }
      : o,
  );
  await writeJsonArray(bucket, ORDERS_KEY, updated);
  return { ok: true, license: next, oldKey: lic.key };
}

export async function resetLicenseActivations(
  bucket: ProductsBucket,
  key: string,
): Promise<CommerceLicense | null> {
  const lic = await findLicense(bucket, key);
  if (!lic || lic.revoked) return null;
  const next = { ...lic, activations: [] as CommerceLicense["activations"] };
  await upsertLicense(bucket, next);
  return next;
}

// —— Tickets ——

export function normalizeTicketChannel(raw: string): TicketChannel {
  const c = String(raw || "").toLowerCase().trim();
  if (c === "bug" || c === "suggestion" || c === "support" || c === "other") return c;
  // legacy feedback types
  if (c === "idea") return "suggestion";
  if (c === "complaint") return "support";
  return "other";
}

export function normalizeTicketSubtype(channel: TicketChannel, raw: string): string {
  const s = String(raw || "").toLowerCase().trim() || "other";
  const allowed = TICKET_SUBTYPES[channel];
  return allowed.includes(s) ? s : "other";
}

/** Map legacy type=bug|idea|complaint|other → channel/subtype */
export function legacyFeedbackToChannel(type: string): { channel: TicketChannel; subtype: string } {
  const t = String(type || "").toLowerCase();
  if (t === "bug") return { channel: "bug", subtype: "other" };
  if (t === "idea") return { channel: "suggestion", subtype: "feature" };
  if (t === "complaint") return { channel: "support", subtype: "other" };
  return { channel: "other", subtype: "other" };
}

export async function listTickets(
  bucket: ProductsBucket | undefined,
): Promise<CommerceTicket[]> {
  const list = await readJsonArray<CommerceTicket>(bucket, TICKETS_KEY);
  return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function upsertTicket(
  bucket: ProductsBucket,
  ticket: CommerceTicket,
): Promise<CommerceTicket[]> {
  const list = await listTickets(bucket);
  const next = list.filter((t) => t.id !== ticket.id);
  next.unshift(ticket);
  await writeJsonArray(bucket, TICKETS_KEY, next);
  return next;
}

export async function findTicket(
  bucket: ProductsBucket | undefined,
  id: string,
): Promise<CommerceTicket | null> {
  const list = await listTickets(bucket);
  return list.find((t) => t.id === id) || null;
}

export async function setTicketStatus(
  bucket: ProductsBucket,
  id: string,
  status: TicketStatus,
): Promise<CommerceTicket | null> {
  const allowed: TicketStatus[] = ["new", "triaged", "waiting", "done", "wontfix"];
  if (!allowed.includes(status)) return null;
  const t = await findTicket(bucket, id);
  if (!t) return null;
  const next = { ...t, status };
  await upsertTicket(bucket, next);
  return next;
}

export function ticketMailPrefix(t: Pick<CommerceTicket, "channel" | "subtype" | "buyer">): string {
  const who = t.buyer ? "CLIENT" : "PROSPECT";
  return `[${t.channel.toUpperCase()}·${t.subtype}][${who}]`;
}

export { ACCOUNT_COOKIE, ACCOUNT_MAX_AGE };
