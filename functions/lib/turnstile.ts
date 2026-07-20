/**
 * Cloudflare Turnstile siteverify (opcional).
 * Si TURNSTILE_SECRET_KEY no está, se considera no configurado.
 */

export type TurnstileEnv = {
  TURNSTILE_SECRET_KEY?: string;
};

export async function verifyTurnstile(
  env: TurnstileEnv,
  token: string | undefined | null,
  ip?: string,
): Promise<{ ok: boolean; error?: string; required: boolean }> {
  const secret = String(env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) {
    return { ok: true, required: false };
  }
  const t = String(token || "").trim();
  if (!t) {
    return { ok: false, required: true, error: "turnstile_required" };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", t);
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return {
        ok: false,
        required: true,
        error: (data["error-codes"] || []).join(",") || "turnstile_failed",
      };
    }
    return { ok: true, required: true };
  } catch (e) {
    console.warn("[turnstile]", e);
    return { ok: false, required: true, error: "turnstile_network" };
  }
}
