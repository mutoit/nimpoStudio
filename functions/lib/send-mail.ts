/**
 * Envío de email compartido (quote / feedback / commerce).
 */

export type MailEnv = {
  RESEND_API_KEY?: string;
  QUOTE_TO_EMAIL?: string;
  QUOTE_FROM_EMAIL?: string;
  MAIL_SECRET?: string;
  MAIL_WORKER_URL?: string;
  MAIL?: { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> };
};

export async function sendStudioMail(
  env: MailEnv,
  opts: { to: string[]; subject: string; text: string; replyTo?: string; from?: string },
): Promise<{ ok: boolean; error?: string }> {
  const payload = JSON.stringify({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
    from: opts.from || "licencias@nimpo3dstudio.com",
    fromName: "Nimpo 3D Studio",
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.MAIL_SECRET) headers["X-Mail-Secret"] = env.MAIL_SECRET;

  if (env.MAIL) {
    try {
      const res = await env.MAIL.fetch("https://mail.internal/send", {
        method: "POST",
        headers,
        body: payload,
      });
      if (res.ok) return { ok: true };
    } catch {
      /* fallthrough */
    }
  }

  const url = env.MAIL_WORKER_URL || "https://nimpo-mail.nosinfantasia.workers.dev/";
  if (env.MAIL_SECRET) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: payload });
      if (res.ok) return { ok: true };
    } catch {
      /* fallthrough */
    }
  }

  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "no_email_provider" };
  const from = env.QUOTE_FROM_EMAIL || "Nimpo 3D Studio <onboarding@resend.dev>";
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
    if (!res.ok) return { ok: false, error: `resend_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "resend_network" };
  }
}
