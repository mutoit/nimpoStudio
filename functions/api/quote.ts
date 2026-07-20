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
  buyout?: boolean;
  needSpecialReview?: boolean;
  specialNotes?: string;
  termPlus1y?: boolean;
  removeFromCatalog?: boolean;
  territoryExpand?: boolean;
  moreComposition?: boolean;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
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
    `Exclusiva: ${body.exclusive ? "sí" : "no"}`,
    `Buyout: ${body.buyout ? "sí" : "no"}`,
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
    return json({ ok: true });
  }

  if (request.method === "GET") {
    return json({
      status: "ok",
      message: "POST license quote payload here",
      hasEmail: Boolean(
        env.MAIL || env.MAIL_SECRET || env.CLOUDFLARE_API_TOKEN || env.RESEND_API_KEY,
      ),
      providers: {
        mailWorker: Boolean(env.MAIL || env.MAIL_SECRET),
        cloudflareApi: Boolean(env.CLOUDFLARE_API_TOKEN),
        resend: Boolean(env.RESEND_API_KEY),
      },
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  let body: QuoteBody;
  try {
    body = (await request.json()) as QuoteBody;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const workName = String(body.workName || "").trim();
  const workSlug = String(body.workSlug || "").trim();
  const territory = String(body.territory || "").trim();
  const project = String(body.project || "").trim();
  const usageRaw = String(body.usage || "").trim();
  const termRaw = String(body.term || "2y").trim() as LicenseTermCode;

  if (!name || !email || !workName || !workSlug || !territory || !project) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }
  if (!isLicenseUsageCode(usageRaw)) {
    return json({ ok: false, error: "invalid_usage" }, 400);
  }

  const usage = usageRaw as LicenseUsageCode;
  const quote = calculateLicenseQuote({
    usage,
    stems: Boolean(body.stems),
    editShort: Boolean(body.editShort),
    exclusive: Boolean(body.exclusive),
    buyout: Boolean(body.buyout),
    needSpecialReview: Boolean(body.needSpecialReview),
    specialNotes: String(body.specialNotes || "").trim(),
    term: ["project", "1y", "2y", "custom"].includes(termRaw) ? termRaw : "2y",
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
  const clientText = buildClientText({ name, workName }, quote);

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
  console.log("[QUOTE_FULL]\n" + studioText);

  const toStudio = (env.QUOTE_TO_EMAIL || "contacto@nimpo3dstudio.com").trim();
  const subjectStudio =
    quote.mode === "instant"
      ? `[Licencia ${quote.total}€] ${workName} — ${name}`
      : `[Revisión licencia] ${workName} — ${name}`;
  const subjectClient =
    quote.mode === "instant"
      ? `Tu presupuesto — ${workName} (${quote.total} €)`
      : `Hemos recibido tu solicitud — ${workName}`;

  const studioMail = await sendEmail(env, {
    to: [toStudio],
    subject: subjectStudio,
    text: studioText,
    replyTo: email,
  });

  const clientMail = await sendEmail(env, {
    to: [email],
    subject: subjectClient,
    text: clientText,
  });

  return json({
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
      clientSent: clientMail.ok,
      studioError: studioMail.ok ? null : studioMail.error || null,
      clientError: clientMail.ok ? null : clientMail.error || null,
      via: studioMail.via || clientMail.via || null,
    },
  });
}
