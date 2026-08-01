/**
 * Admin abonados newsletter:
 * GET  /admin/newsletter?status=active|pending|unsubscribed|all
 * POST /admin/newsletter { action: "unsubscribe"|"delete", email }
 */

import {
  deleteSubscriber,
  publicAdminSub,
  readNewsletter,
  unsubscribeByEmail,
  type NewsletterBucket,
} from "../lib/newsletter";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import type { AdminEnv } from "../lib/admin-auth";
import { checkRateLimitAsync, clientIp, type RateLimitKv } from "../lib/rate-limit";

type Env = AdminEnv & {
  LIBRARY_BUCKET?: NewsletterBucket;
  RATE_LIMIT_KV?: RateLimitKv;
};

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const auth = await requireAdmin(env, request);
  if ("error" in auth && auth.error) return auth.error;
  const bucket = auth.bucket!;

  if (request.method === "GET") {
    const url = new URL(request.url);
    const status = String(url.searchParams.get("status") || "all").trim();
    const store = await readNewsletter(bucket);
    let list = store.subscribers;
    if (status === "active" || status === "pending" || status === "unsubscribed") {
      list = list.filter((s) => s.status === status);
    }
    list = [...list].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
    const counts = {
      active: store.subscribers.filter((s) => s.status === "active").length,
      pending: store.subscribers.filter((s) => s.status === "pending").length,
      unsubscribed: store.subscribers.filter((s) => s.status === "unsubscribed").length,
      total: store.subscribers.length,
    };
    return json({
      ok: true,
      subscribers: list.map(publicAdminSub),
      count: list.length,
      counts,
      updatedAt: store.updatedAt || null,
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-newsletter:${ip}`,
    { limit: 60, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let body: { action?: string; email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const action = String(body.action || "").trim();
  const email = String(body.email || "").trim();

  if (action === "unsubscribe") {
    const sub = await unsubscribeByEmail(bucket, email);
    if (!sub) return json({ ok: false, error: "not_found", message: "Email no en la lista" }, 404);
    return json({
      ok: true,
      subscriber: publicAdminSub(sub),
      message: `Baja: ${sub.email}`,
    });
  }

  if (action === "delete") {
    const ok = await deleteSubscriber(bucket, email);
    if (!ok) return json({ ok: false, error: "not_found", message: "Email no en la lista" }, 404);
    return json({ ok: true, message: `Eliminado de la lista: ${email}` });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
