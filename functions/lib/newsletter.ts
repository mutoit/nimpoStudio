/**
 * Lista de abonados a novedades (R2 catalog/newsletter.json).
 * Opt-in doble: pending → active vía link de confirmación.
 */

export const NEWSLETTER_KEY = "catalog/newsletter.json";

export type NewsletterBucket = {
  get: (key: string) => Promise<{
    text: () => Promise<string>;
    json: <T>() => Promise<T>;
  } | null>;
  put: (
    key: string,
    value: string,
    opts?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
};

export type NewsletterStatus = "pending" | "active" | "unsubscribed";

export type NewsletterSub = {
  email: string;
  status: NewsletterStatus;
  /** Token opaco para confirm / baja */
  token: string;
  createdAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  lang?: string;
};

export type NewsletterStore = {
  subscribers: NewsletterSub[];
  updatedAt?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBS = 5000;

export function normalizeEmail(raw: unknown): string | null {
  const e = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  if (!e || !EMAIL_RE.test(e)) return null;
  return e;
}

export function newNewsletterToken(): string {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function readNewsletter(
  bucket: NewsletterBucket | undefined,
): Promise<NewsletterStore> {
  if (!bucket) return { subscribers: [] };
  const obj = await bucket.get(NEWSLETTER_KEY);
  if (!obj) return { subscribers: [] };
  try {
    const data = await obj.json<unknown>();
    if (!data || typeof data !== "object") return { subscribers: [] };
    const o = data as Record<string, unknown>;
    const list = Array.isArray(o.subscribers) ? o.subscribers : Array.isArray(data) ? data : [];
    const subscribers = list
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;
        const s = raw as Record<string, unknown>;
        const email = normalizeEmail(s.email);
        const token = String(s.token || "").trim().slice(0, 80);
        const status = String(s.status || "pending") as NewsletterStatus;
        if (!email || !token) return null;
        if (status !== "pending" && status !== "active" && status !== "unsubscribed") {
          return null;
        }
        return {
          email,
          status,
          token,
          createdAt: String(s.createdAt || "").slice(0, 40) || new Date().toISOString(),
          confirmedAt: s.confirmedAt ? String(s.confirmedAt).slice(0, 40) : undefined,
          unsubscribedAt: s.unsubscribedAt
            ? String(s.unsubscribedAt).slice(0, 40)
            : undefined,
          lang: s.lang ? String(s.lang).slice(0, 8) : undefined,
        } satisfies NewsletterSub;
      })
      .filter((x): x is NewsletterSub => x != null)
      .slice(0, MAX_SUBS);
    return {
      subscribers,
      updatedAt: o.updatedAt ? String(o.updatedAt).slice(0, 40) : undefined,
    };
  } catch {
    return { subscribers: [] };
  }
}

export async function writeNewsletter(
  bucket: NewsletterBucket,
  store: NewsletterStore,
): Promise<void> {
  const next: NewsletterStore = {
    subscribers: store.subscribers.slice(0, MAX_SUBS),
    updatedAt: new Date().toISOString(),
  };
  await bucket.put(NEWSLETTER_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/**
 * Alta o re-alta. Q: sub pendiente/activa + si hay que mandar mail de confirmación.
 */
export async function upsertSubscribe(
  bucket: NewsletterBucket,
  emailRaw: string,
  lang?: string,
): Promise<{
  sub: NewsletterSub;
  action: "created" | "already_active" | "reconfirm" | "resubscribe";
}> {
  const email = normalizeEmail(emailRaw);
  if (!email) throw new Error("invalid_email");
  const store = await readNewsletter(bucket);
  const existing = store.subscribers.find((s) => s.email === email);
  const now = new Date().toISOString();
  const langOk = lang && /^(es|en|fr)$/.test(lang) ? lang : "es";

  if (existing?.status === "active") {
    return { sub: existing, action: "already_active" };
  }

  if (existing?.status === "pending") {
    // Reenviar confirmación (mismo token)
    if (langOk) existing.lang = langOk;
    await writeNewsletter(bucket, store);
    return { sub: existing, action: "reconfirm" };
  }

  if (existing?.status === "unsubscribed") {
    existing.status = "pending";
    existing.token = newNewsletterToken();
    existing.unsubscribedAt = undefined;
    existing.confirmedAt = undefined;
    existing.lang = langOk;
    existing.createdAt = now;
    await writeNewsletter(bucket, store);
    return { sub: existing, action: "resubscribe" };
  }

  const sub: NewsletterSub = {
    email,
    status: "pending",
    token: newNewsletterToken(),
    createdAt: now,
    lang: langOk,
  };
  store.subscribers.unshift(sub);
  await writeNewsletter(bucket, store);
  return { sub, action: "created" };
}

export async function confirmByToken(
  bucket: NewsletterBucket,
  tokenRaw: string,
): Promise<NewsletterSub | null> {
  const token = String(tokenRaw || "").trim();
  if (!token || token.length < 16) return null;
  const store = await readNewsletter(bucket);
  const sub = store.subscribers.find((s) => s.token === token);
  if (!sub) return null;
  if (sub.status === "unsubscribed") return null;
  if (sub.status === "active") return sub;
  sub.status = "active";
  sub.confirmedAt = new Date().toISOString();
  await writeNewsletter(bucket, store);
  return sub;
}

export async function unsubscribeByToken(
  bucket: NewsletterBucket,
  tokenRaw: string,
): Promise<NewsletterSub | null> {
  const token = String(tokenRaw || "").trim();
  if (!token || token.length < 16) return null;
  const store = await readNewsletter(bucket);
  const sub = store.subscribers.find((s) => s.token === token);
  if (!sub) return null;
  if (sub.status === "unsubscribed") return sub;
  sub.status = "unsubscribed";
  sub.unsubscribedAt = new Date().toISOString();
  await writeNewsletter(bucket, store);
  return sub;
}

/** Baja admin por email. */
export async function unsubscribeByEmail(
  bucket: NewsletterBucket,
  emailRaw: string,
): Promise<NewsletterSub | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  const store = await readNewsletter(bucket);
  const sub = store.subscribers.find((s) => s.email === email);
  if (!sub) return null;
  if (sub.status === "unsubscribed") return sub;
  sub.status = "unsubscribed";
  sub.unsubscribedAt = new Date().toISOString();
  await writeNewsletter(bucket, store);
  return sub;
}

/** Borra fila del store (admin). */
export async function deleteSubscriber(
  bucket: NewsletterBucket,
  emailRaw: string,
): Promise<boolean> {
  const email = normalizeEmail(emailRaw);
  if (!email) return false;
  const store = await readNewsletter(bucket);
  const next = store.subscribers.filter((s) => s.email !== email);
  if (next.length === store.subscribers.length) return false;
  await writeNewsletter(bucket, { subscribers: next });
  return true;
}

/** Vista admin: sin exponer tokens completos si no hace falta (sí se pueden necesitar para links). */
export function publicAdminSub(s: NewsletterSub): Omit<NewsletterSub, "token"> & {
  tokenTail: string;
} {
  return {
    email: s.email,
    status: s.status,
    createdAt: s.createdAt,
    confirmedAt: s.confirmedAt,
    unsubscribedAt: s.unsubscribedAt,
    lang: s.lang,
    tokenTail: s.token.slice(-6),
  };
}

export function activeSubscribers(store: NewsletterStore): NewsletterSub[] {
  return store.subscribers.filter((s) => s.status === "active");
}

export function siteBaseFromRequest(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.protocol}//${url.host}`;
  }
  return "https://www.nimpo3dstudio.com";
}

export function confirmUrl(base: string, token: string): string {
  return `${base.replace(/\/$/, "")}/api/newsletter?action=confirm&t=${encodeURIComponent(token)}`;
}

export function unsubscribeUrl(base: string, token: string): string {
  return `${base.replace(/\/$/, "")}/api/newsletter?action=unsubscribe&t=${encodeURIComponent(token)}`;
}

export function buildConfirmEmail(opts: {
  confirmLink: string;
  lang?: string;
}): { subject: string; text: string } {
  const es = !opts.lang || opts.lang === "es";
  if (es) {
    return {
      subject: "Confirma tu suscripción · Nimpo 3D Studio",
      text: [
        "Hola,",
        "",
        "Has pedido recibir novedades de Nimpo 3D Studio (productos, música, avisos).",
        "Confirma tu email con este enlace (válido hasta que lo uses):",
        "",
        opts.confirmLink,
        "",
        "Si no fuiste tú, ignora este mensaje.",
        "",
        "Nimpo 3D Studio",
        "contacto@nimpo3dstudio.com",
      ].join("\n"),
    };
  }
  return {
    subject: "Confirm your subscription · Nimpo 3D Studio",
    text: [
      "Hi,",
      "",
      "You asked to get Nimpo 3D Studio updates (products, music, news).",
      "Confirm your email:",
      "",
      opts.confirmLink,
      "",
      "If this wasn't you, ignore this message.",
      "",
      "Nimpo 3D Studio",
      "contacto@nimpo3dstudio.com",
    ].join("\n"),
  };
}

export function buildUpdateEmail(opts: {
  title: string;
  summary: string;
  link?: string | null;
  unsubscribeLink: string;
  lang?: string;
}): { subject: string; text: string } {
  const title = String(opts.title || "").trim().slice(0, 160);
  const summary = String(opts.summary || "").trim().slice(0, 500);
  const link = String(opts.link || "").trim();
  const es = !opts.lang || opts.lang === "es";

  const lines = es
    ? [
        "Hola,",
        "",
        "Hay algo nuevo en Nimpo 3D Studio:",
        "",
        `• ${title}`,
        summary,
      ]
    : [
        "Hi,",
        "",
        "Something new at Nimpo 3D Studio:",
        "",
        `• ${title}`,
        summary,
      ];

  if (link) {
    lines.push("");
    lines.push(es ? "Ver:" : "See:");
    lines.push(link);
  } else {
    lines.push("");
    lines.push(es ? "Web:" : "Site:");
    lines.push("https://www.nimpo3dstudio.com/es/");
  }

  lines.push("");
  lines.push(es ? "Un saludo," : "Cheers,");
  lines.push("Nimpo 3D Studio");
  lines.push("contacto@nimpo3dstudio.com");
  lines.push("");
  lines.push(es ? "Darte de baja:" : "Unsubscribe:");
  lines.push(opts.unsubscribeLink);

  return {
    subject: es ? `Nimpo: ${title}` : `Nimpo: ${title}`,
    text: lines.join("\n"),
  };
}

/** Enlace público seguro para el mail (https o path del sitio). */
export function sanitizeNewsletterLink(raw: unknown, base: string): string | null {
  const u = String(raw || "").trim().slice(0, 500);
  if (!u) return null;
  if (/^https:\/\/(www\.)?nimpo3dstudio\.com(\/|$)/i.test(u)) return u;
  if (/^https:\/\/nimpo-studio\.pages\.dev(\/|$)/i.test(u)) return u;
  if (u.startsWith("/") && !u.startsWith("//")) {
    return `${base.replace(/\/$/, "")}${u}`;
  }
  return null;
}
