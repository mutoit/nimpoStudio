/**
 * Worker de envío de email (Cloudflare Email Sending binding).
 * POST JSON: { to, subject, text, replyTo?, from?, fromName? }
 * Header: X-Mail-Secret (debe coincidir con env.MAIL_SECRET)
 */

type SendBody = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from?: string;
  fromName?: string;
};

type Env = {
  EMAIL: {
    send: (msg: {
      to: string | string[];
      from: { email: string; name?: string };
      subject: string;
      text: string;
      html?: string;
      replyTo?: string;
    }) => Promise<{ messageId?: string }>;
  };
  MAIL_SECRET?: string;
};

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === "GET") {
      return Response.json({ ok: true, service: "nimpo-mail" });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const secret = (request.headers.get("X-Mail-Secret") || "").trim();
    const expected = String(env.MAIL_SECRET ?? "").replace(/^\uFEFF/, "").trim();
    if (!expected) {
      return Response.json(
        { ok: false, error: "mail_secret_not_configured" },
        { status: 500 },
      );
    }
    if (secret !== expected) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body: SendBody;
    try {
      body = (await request.json()) as SendBody;
    } catch {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const to = body.to;
    const subject = String(body.subject || "").trim();
    const text = String(body.text || "");
    if (!to || !subject || !text) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const fromEmail = body.from || "licencias@nimpo3dstudio.com";
    const fromName = body.fromName || "Nimpo 3D Studio";

    try {
      const result = await env.EMAIL.send({
        to,
        from: { email: fromEmail, name: fromName },
        subject,
        text,
        html:
          body.html ||
          `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        replyTo: body.replyTo,
      });
      return Response.json({ ok: true, result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[nimpo-mail]", msg);
      return Response.json({ ok: false, error: msg }, { status: 500 });
    }
  },
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
