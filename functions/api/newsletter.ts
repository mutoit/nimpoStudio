/**
 * Newsletter novedades:
 * POST /api/newsletter          → abonarse (doble opt-in)
 * GET  /api/newsletter?action=confirm&t=
 * GET  /api/newsletter?action=unsubscribe&t=
 */

import {
  buildConfirmEmail,
  confirmByToken,
  confirmUrl,
  siteBaseFromRequest,
  unsubscribeByToken,
  unsubscribeUrl,
  upsertSubscribe,
  type NewsletterBucket,
} from "../lib/newsletter";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";
import { sendStudioMail, type MailEnv } from "../lib/send-mail";
import { verifyTurnstile } from "../lib/turnstile";

type Env = MailEnv & {
  LIBRARY_BUCKET?: NewsletterBucket;
  RATE_LIMIT_KV?: RateLimitKv;
  TURNSTILE_SECRET_KEY?: string;
};

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

function json(
  data: unknown,
  status = 200,
  request?: Request,
  extra: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
  if (request) {
    const o = corsOrigin(request);
    if (o) {
      headers["Access-Control-Allow-Origin"] = o;
      headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
      headers["Vary"] = "Origin";
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function htmlPage(title: string, body: string): Response {
  const doc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0a0a0c;color:#e8e8ec;margin:0;min-height:100vh;display:grid;place-items:center;padding:1.5rem}
    .box{max-width:28rem;border:1px solid rgb(201 169 98 / .28);border-radius:12px;padding:1.5rem 1.35rem;background:#121216}
    h1{font-size:1.25rem;font-weight:600;margin:0 0 .75rem;color:#c9a962}
    p{margin:0 0 .65rem;line-height:1.5;color:#b0b0b8;font-size:.95rem}
    a{color:#c9a962}
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`;
  return new Response(doc, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return json({ ok: true }, 200, request);
  }

  if (request.method === "GET") {
    const url = new URL(request.url);
    const action = String(url.searchParams.get("action") || "").trim();
    const t = String(url.searchParams.get("t") || "").trim();

    if (!action) {
      return json(
        {
          ok: true,
          status: "ok",
          turnstileRequired: Boolean(String(env.TURNSTILE_SECRET_KEY || "").trim()),
        },
        200,
        request,
      );
    }

    if (!env.LIBRARY_BUCKET) {
      return htmlPage("Error", "<p>Lista no configurada.</p>");
    }

    if (action === "confirm") {
      const sub = await confirmByToken(env.LIBRARY_BUCKET, t);
      if (!sub) {
        return htmlPage(
          "Enlace no válido",
          "<p>No pudimos confirmar la suscripción. Puede que el enlace haya caducado o ya no sea válido.</p><p><a href=\"/es/\">Volver a la web</a></p>",
        );
      }
      return htmlPage(
        "Suscripción confirmada",
        `<p>Gracias. <strong>${escapeHtml(sub.email)}</strong> recibirá avisos cuando publiquemos novedades.</p><p><a href="/es/">Ir a Nimpo 3D Studio</a></p>`,
      );
    }

    if (action === "unsubscribe") {
      const sub = await unsubscribeByToken(env.LIBRARY_BUCKET, t);
      if (!sub) {
        return htmlPage(
          "Enlace no válido",
          "<p>No pudimos procesar la baja. Revisa el enlace del email.</p><p><a href=\"/es/\">Volver a la web</a></p>",
        );
      }
      return htmlPage(
        "Baja completada",
        `<p>Ya no enviaremos novedades a <strong>${escapeHtml(sub.email)}</strong>.</p><p>Puedes volver a abonarte desde la web cuando quieras.</p><p><a href="/es/">Ir a la web</a></p>`,
      );
    }

    return json({ ok: false, error: "unknown_action" }, 400, request);
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405, request);
  }

  if (!env.LIBRARY_BUCKET) {
    return json({ ok: false, error: "r2_not_configured" }, 503, request);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `newsletter:${ip}`,
    { limit: 6, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) {
    return json(
      { ok: false, error: "rate_limited", message: "Demasiados intentos. Prueba más tarde." },
      429,
      request,
      { "Retry-After": String(rl.retryAfterSec ?? 60) },
    );
  }

  let body: { email?: string; lang?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, request);
  }

  const ts = await verifyTurnstile(env, body.turnstileToken, ip);
  if (!ts.ok) {
    return json(
      { ok: false, error: ts.error || "turnstile_failed", message: "Verificación anti-bot fallida." },
      403,
      request,
    );
  }

  try {
    const { sub, action } = await upsertSubscribe(
      env.LIBRARY_BUCKET,
      String(body.email || ""),
      String(body.lang || "es"),
    );

    // No revelar si ya estaba activo de forma distinta en UX genérica
    if (action === "already_active") {
      return json(
        {
          ok: true,
          status: "already_active",
          message: "Este email ya está abonado a las novedades.",
        },
        200,
        request,
      );
    }

    const base = siteBaseFromRequest(request);
    const mail = buildConfirmEmail({
      confirmLink: confirmUrl(base, sub.token),
      lang: sub.lang,
    });
    const sent = await sendStudioMail(env, {
      to: [sub.email],
      subject: mail.subject,
      text: mail.text,
      from: "noreply@nimpo3dstudio.com",
    });

    if (!sent.ok) {
      console.warn("[newsletter] confirm mail", sent.error);
      return json(
        {
          ok: false,
          error: "mail_failed",
          message:
            "Guardamos el email, pero no pudimos enviar la confirmación. Reintenta en un rato o escríbenos a contacto@nimpo3dstudio.com.",
        },
        502,
        request,
      );
    }

    return json(
      {
        ok: true,
        status: "pending_confirm",
        message:
          "Te hemos enviado un email de confirmación. Ábrelo y pulsa el enlace para activar el abono.",
      },
      200,
      request,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "invalid_email") {
      return json(
        { ok: false, error: "invalid_email", message: "Email no válido." },
        400,
        request,
      );
    }
    console.error("[newsletter]", e);
    return json({ ok: false, error: "server_error" }, 500, request);
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
