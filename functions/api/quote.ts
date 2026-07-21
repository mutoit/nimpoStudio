/**
 * POST /api/quote
 * Calcula presupuesto de licencia + notifica estudio y cliente (Resend si hay clave).
 *
 * Env (Pages → Settings → Environment variables):
 *   RESEND_API_KEY     — https://resend.com (gratis para empezar)
 *   QUOTE_TO_EMAIL     — destino estudio (default contacto@nimpo3dstudio.com)
 *   QUOTE_FROM_EMAIL   — remitente verificado en Resend (ej. Nimpo <hola@tudominio.com>)
 *
 * Sin RESEND_API_KEY: igual devuelve el presupuesto al cliente y deja log en CF.
 */

import {
  calculateLicenseQuote,
  formatEur,
  isLicenseUsageCode,
  type LicenseQuoteResult,
  type LicenseTermCode,
  type LicenseUsageCode,
} from "../lib/license-quote";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { verifyTurnstile } from "../lib/turnstile";

type QuoteBody = {
  name?: string;
  email?: string;
  workName?: string;
  workSlug?: string;
  lang?: string;
  usage?: string;
  territory?: string;
  term?: string;
  project?: string;
  stems?: boolean;
  editShort?: boolean;
  exclusive?: boolean;
  exclusiveStrong?: boolean;
  buyout?: boolean;
  buyoutHigh?: boolean;
  needSpecialReview?: boolean;
  specialNotes?: string;
  termPlus1y?: boolean;
  removeFromCatalog?: boolean;
  territoryExpand?: boolean;
  moreComposition?: boolean;
  /** Token Cloudflare Turnstile (si TURNSTILE_SECRET_KEY está configurado). */
  turnstileToken?: string;
};

/** Una línea, sin CR/LF (subjects / nombres). */
function oneLine(s: string, max = 200): string {
  return String(s || "")
    .replace(/[\r\n\u0000]/g, " ")
    .trim()
    .slice(0, max);
}

const ALLOWED_ORIGINS = new Set([
  "https://www.nimpo3dstudio.com",
  "https://nimpo3dstudio.com",
  "https://nimpo-studio.pages.dev",
]);

function corsOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (origin.endsWith(".nimpo-studio.pages.dev")) return origin;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return origin;
  }
  return null;
}

function json(data: unknown, status = 200, request?: Request, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
  if (request) {
    const o = corsOrigin(request);
    if (o) {
      headers["Access-Control-Allow-Origin"] = o;
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS, GET";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
      headers["Vary"] = "Origin";
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function buildStudioText(
  body: Required<
    Pick<QuoteBody, "name" | "email" | "workName" | "workSlug" | "territory" | "project">
  > &
    QuoteBody,
  quote: LicenseQuoteResult,
): string {
  const lines = [
    "═══ SOLICITUD DE LICENCIA / PRESUPUESTO ═══",
    "",
    `Obra: ${body.workName} (${body.workSlug})`,
    `Cliente: ${body.name} <${body.email}>`,
    `Idioma UI: ${body.lang || "es"}`,
    "",
    `Uso (código): ${body.usage}`,
    `Territorio: ${body.territory}`,
    `Plazo: ${body.term || "2y"}`,
    `Proyecto / uso:`,
    body.project || "—",
    "",
    `Stems: ${body.stems ? "sí" : "no"}`,
    `Edit corto: ${body.editShort ? "sí" : "no"}`,
    `Exclusiva: ${body.exclusive ? "sí" : "no"}${body.exclusiveStrong ? " (fuerte)" : ""}`,
    `Buyout: ${body.buyout ? "sí" : "no"}${body.buyoutHigh ? " (alto)" : ""}`,
    `+1 año: ${body.termPlus1y ? "sí" : "no"}`,
    `Retirar/no disponible catálogo: ${body.removeFromCatalog ? "sí" : "no"}`,
    `Ampliar territorio/medios: ${body.territoryExpand ? "sí" : "no"}`,
    `Más composición: ${body.moreComposition ? "sí" : "no"}`,
    `Revisión especial pedida: ${body.needSpecialReview ? "sí" : "no"}`,
    `Notas especiales:`,
    body.specialNotes || "—",
    "",
    "── Resultado calculadora ──",
    `Modo: ${quote.mode}`,
    quote.total != null
      ? `TOTAL LISTA: ${formatEur(quote.total)}`
      : `Revisión — desde: ${quote.fromAmount != null ? formatEur(quote.fromAmount) : "n/d"}`,
    ...quote.lineItems.map((l) => `  · ${l.label}: ${formatEur(l.amount)}`),
    "",
    quote.summaryEs,
    "",
    "Alcance:",
    ...quote.scopeEs.map((s) => `  - ${s}`),
  ];
  return lines.join("\n");
}

function buildClientText(
  body: { name: string; workName: string },
  quote: LicenseQuoteResult,
): string {
  if (quote.mode === "instant" && quote.total != null) {
    return [
      `Hola ${body.name},`,
      "",
      `Gracias por tu solicitud de licencia para «${body.workName}».`,
      "",
      `PRESUPUESTO DE CATÁLOGO (condiciones estándar): ${formatEur(quote.total)}`,
      "(IVA no incluido salvo que se indique en factura.)",
      "",
      "Desglose:",
      ...quote.lineItems.map((l) => `  · ${l.label}: ${formatEur(l.amount)}`),
      "",
      quote.summaryEs,
      "",
      "Qué incluye (resumen):",
      ...quote.scopeEs.map((s) => `  - ${s}`),
      "",
      "Siguiente paso: el estudio te confirmará por email y te enviará la licencia PDF + datos de pago. El master se entrega tras aceptación y pago.",
      "",
      "— Nimpo 3D Studio",
      "contacto@nimpo3dstudio.com",
    ].join("\n");
  }

  return [
    `Hola ${body.name},`,
    "",
    `Hemos recibido tu solicitud de presupuesto para «${body.workName}».`,
    "",
    "Tu caso requiere revisión manual (uso especial, exclusiva, multi-proyecto, etc.).",
    quote.fromAmount != null
      ? `Referencia orientativa mínima: desde ${formatEur(quote.fromAmount)} (no es el precio final).`
      : "Te responderemos con un presupuesto a medida.",
    "",
    quote.summaryEs,
    "",
    "No hace falta que reenvíes nada: el estudio ya tiene los datos y te contesta a este email.",
    "",
    "— Nimpo 3D Studio",
    "contacto@nimpo3dstudio.com",
  ].join("\n");
}

type Env = {
  RESEND_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  QUOTE_TO_EMAIL?: string;
  QUOTE_FROM_EMAIL?: string;
  MAIL_SECRET?: string;
  MAIL_WORKER_URL?: string;
  /** Service binding al Worker nimpo-mail */
  MAIL?: { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> };
  TURNSTILE_SECRET_KEY?: string;
  /** Si "1" | "true", también envía email al solicitante (off por defecto). */
  SEND_CLIENT_QUOTE_EMAIL?: string;
  RATE_LIMIT_KV?: RateLimitKv;
};

async function sendViaMailWorker(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string; via?: string }> {
  const payload = JSON.stringify({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
    from: "licencias@nimpo3dstudio.com",
    fromName: "Nimpo 3D Studio",
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.MAIL_SECRET) headers["X-Mail-Secret"] = env.MAIL_SECRET;

  // 1) Service binding (Pages → Worker)
  if (env.MAIL) {
    try {
      const res = await env.MAIL.fetch("https://mail.internal/send", {
        method: "POST",
        headers,
        body: payload,
      });
      if (res.ok) return { ok: true, via: "worker_binding" };
      const t = await res.text();
      console.warn("[QUOTE_MAIL_BINDING_FAIL]", res.status, t);
    } catch (e) {
      console.warn("[QUOTE_MAIL_BINDING_ERROR]", e);
    }
  }

  // 2) URL pública del Worker (fallback)
  const url = env.MAIL_WORKER_URL || "https://nimpo-mail.nosinfantasia.workers.dev/";
  if (!env.MAIL_SECRET) return { ok: false, error: "no_mail_secret" };
  try {
    const res = await fetch(url, { method: "POST", headers, body: payload });
    if (!res.ok) {
      const t = await res.text();
      console.warn("[QUOTE_MAIL_HTTP_FAIL]", res.status, t);
      return { ok: false, error: `mail_http_${res.status}`, via: "worker_http" };
    }
    return { ok: true, via: "worker_http" };
  } catch (e) {
    console.warn("[QUOTE_MAIL_HTTP_ERROR]", e);
    return { ok: false, error: "mail_http_network", via: "worker_http" };
  }
}

/** Cloudflare Email Sending REST API */
async function sendViaCloudflareApi(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string; via?: string }> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || "9465ef52d5149092dd29a0382f746954";
  if (!token) return { ok: false, error: "no_cf_token" };

  const fromAddress =
    env.QUOTE_FROM_EMAIL?.includes("<")
      ? env.QUOTE_FROM_EMAIL
      : env.QUOTE_FROM_EMAIL || "licencias@nimpo3dstudio.com";

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: opts.to,
          from: {
            address: fromAddress.replace(/.*<|>.*/g, "") || "licencias@nimpo3dstudio.com",
            name: "Nimpo 3D Studio",
          },
          subject: opts.subject,
          text: opts.text,
          reply_to: opts.replyTo,
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[QUOTE_CF_EMAIL_FAIL]", res.status, errText);
      return { ok: false, error: `cf_${res.status}`, via: "cf_api" };
    }
    return { ok: true, via: "cf_api" };
  } catch (e) {
    console.warn("[QUOTE_CF_EMAIL_ERROR]", e);
    return { ok: false, error: "cf_network", via: "cf_api" };
  }
}

async function sendResend(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string; via?: string }> {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "no_resend_key" };

  const from =
    env.QUOTE_FROM_EMAIL || "Nimpo 3D Studio <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[QUOTE_EMAIL_FAIL]", res.status, errText);
      return { ok: false, error: `resend_${res.status}`, via: "resend" };
    }
    return { ok: true, via: "resend" };
  } catch (e) {
    console.warn("[QUOTE_EMAIL_ERROR]", e);
    return { ok: false, error: "resend_network", via: "resend" };
  }
}

async function sendEmail(
  env: Env,
  opts: { to: string[]; subject: string; text: string; replyTo?: string },
): Promise<{ ok: boolean; error?: string; via?: string }> {
  // Prefer Worker binding → CF REST → Resend
  const viaWorker = await sendViaMailWorker(env, opts);
  if (viaWorker.ok) return viaWorker;
  const viaCf = await sendViaCloudflareApi(env, opts);
  if (viaCf.ok) return viaCf;
  const viaResend = await sendResend(env, opts);
  if (viaResend.ok) return viaResend;
  return {
    ok: false,
    error: viaWorker.error || viaCf.error || viaResend.error || "no_email_provider",
  };
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return json({ ok: true }, 200, request);
  }

  if (request.method === "GET") {
    // Mínimo en health — no filtrar proveedores (recon).
    return json(
      {
        status: "ok",
        turnstileRequired: Boolean(String(env.TURNSTILE_SECRET_KEY || "").trim()),
      },
      200,
      request,
    );
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405, request);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `quote:${ip}`,
    { limit: 6, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) {
    return json(
      { ok: false, error: "rate_limited" },
      429,
      request,
      { "Retry-After": String(rl.retryAfterSec ?? 60) },
    );
  }

  let body: QuoteBody;
  try {
    body = (await request.json()) as QuoteBody;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, request);
  }

  const ts = await verifyTurnstile(env, body.turnstileToken, ip);
  if (!ts.ok) {
    return json({ ok: false, error: ts.error || "turnstile_failed" }, 403, request);
  }

  const name = oneLine(String(body.name || ""), 120);
  const email = oneLine(String(body.email || ""), 200).toLowerCase();
  const workName = oneLine(String(body.workName || ""), 200);
  const workSlug = oneLine(String(body.workSlug || ""), 120);
  const territory = oneLine(String(body.territory || ""), 80);
  const project = String(body.project || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 2000);
  const usageRaw = oneLine(String(body.usage || ""), 40);
  const termRaw = oneLine(String(body.term || "2y"), 20) as LicenseTermCode;

  if (!name || !email || !workName || !workSlug || !territory || !project) {
    return json({ ok: false, error: "missing_fields" }, 400, request);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400, request);
  }
  if (!isLicenseUsageCode(usageRaw)) {
    return json({ ok: false, error: "invalid_usage" }, 400, request);
  }

  const usage = usageRaw as LicenseUsageCode;
  const quote = calculateLicenseQuote({
    usage,
    stems: Boolean(body.stems),
    editShort: Boolean(body.editShort),
    exclusive: Boolean(body.exclusive) || Boolean(body.exclusiveStrong),
    exclusiveStrong: Boolean(body.exclusiveStrong),
    buyout: Boolean(body.buyout) || Boolean(body.buyoutHigh),
    buyoutHigh: Boolean(body.buyoutHigh),
    needSpecialReview: Boolean(body.needSpecialReview),
    specialNotes: String(body.specialNotes || "")
      .replace(/\u0000/g, "")
      .trim()
      .slice(0, 2000),
    term: ["single", "project", "1y", "2y", "custom"].includes(termRaw) ? termRaw : "2y",
    termPlus1y: Boolean(body.termPlus1y),
    removeFromCatalog: Boolean(body.removeFromCatalog),
    territoryExpand: Boolean(body.territoryExpand),
    moreComposition: Boolean(body.moreComposition),
  });

  const filled = {
    ...body,
    name,
    email,
    workName,
    workSlug,
    territory,
    project,
    usage,
  };

  const studioText = buildStudioText(filled, quote);

  console.log(
    "[QUOTE]",
    JSON.stringify({
      workSlug,
      email,
      usage,
      mode: quote.mode,
      total: quote.total,
      fromAmount: quote.fromAmount,
      time: new Date().toISOString(),
    }),
  );

  const toStudio = (env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim();
  const subjectStudio = oneLine(
    quote.mode === "instant"
      ? `[Licencia ${quote.total}€] ${workName} — ${name}`
      : `[Revisión licencia] ${workName} — ${name}`,
    180,
  );

  const studioMail = await sendEmail(env, {
    to: [toStudio],
    subject: subjectStudio,
    text: studioText,
    replyTo: email,
  });

  // No auto-mail al "cliente" (evita spam a terceros). Opt-in: SEND_CLIENT_QUOTE_EMAIL=1
  const sendClient =
    String(env.SEND_CLIENT_QUOTE_EMAIL || "").trim() === "1" ||
    String(env.SEND_CLIENT_QUOTE_EMAIL || "").toLowerCase() === "true";

  let clientMail: { ok: boolean; error?: string; via?: string } = {
    ok: false,
    error: "client_email_disabled",
  };
  if (sendClient) {
    const clientText = buildClientText({ name, workName }, quote);
    const subjectClient = oneLine(
      quote.mode === "instant"
        ? `Tu presupuesto — ${workName} (${quote.total} €)`
        : `Hemos recibido tu solicitud — ${workName}`,
      180,
    );
    clientMail = await sendEmail(env, {
      to: [email],
      subject: subjectClient,
      text: clientText,
    });
  }

  return json(
    {
      ok: true,
      quote: {
        mode: quote.mode,
        currency: quote.currency,
        total: quote.total,
        fromAmount: quote.fromAmount,
        lineItems: quote.lineItems,
        summaryEs: quote.summaryEs,
        scopeEs: quote.scopeEs,
      },
      email: {
        configured: Boolean(
          env.MAIL || env.MAIL_SECRET || env.CLOUDFLARE_API_TOKEN || env.RESEND_API_KEY,
        ),
        studioSent: studioMail.ok,
        clientSent: sendClient ? clientMail.ok : false,
        clientEmailEnabled: sendClient,
        studioError: studioMail.ok ? null : studioMail.error || null,
        clientError: sendClient
          ? clientMail.ok
            ? null
            : clientMail.error || null
          : "disabled",
        via: studioMail.via || (sendClient ? clientMail.via : null) || null,
      },
    },
    200,
    request,
  );
}
