/**
 * Admin tickets:
 * GET  /admin/tickets → list
 * POST /admin/tickets { action: "set_status", id, status }
 */

import {
  listTickets,
  setTicketStatus,
  type CommerceEnv,
  type TicketStatus,
} from "../lib/commerce";
import { adminJson as json, requireAdmin } from "../lib/require-admin";
import type { AdminEnv } from "../lib/admin-auth";
import type { RateLimitKv } from "../lib/rate-limit";
import { checkRateLimitAsync, clientIp } from "../lib/rate-limit";

type Env = AdminEnv & CommerceEnv & { RATE_LIMIT_KV?: RateLimitKv };

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
    const channel = url.searchParams.get("channel") || "";
    const buyer = url.searchParams.get("buyer");
    const status = url.searchParams.get("status") || "";
    let tickets = await listTickets(bucket);
    if (channel) tickets = tickets.filter((t) => t.channel === channel);
    if (buyer === "1" || buyer === "true") tickets = tickets.filter((t) => t.buyer);
    if (buyer === "0" || buyer === "false") tickets = tickets.filter((t) => !t.buyer);
    if (status) tickets = tickets.filter((t) => t.status === status);
    return json({ ok: true, tickets, count: tickets.length });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const ip = clientIp(request);
  const rl = await checkRateLimitAsync(
    `admin-tickets:${ip}`,
    { limit: 60, windowSec: 3600 },
    env.RATE_LIMIT_KV,
  );
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429);

  let body: { action?: string; id?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (body.action === "set_status") {
    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim() as TicketStatus;
    if (!id || !status) return json({ ok: false, error: "missing_fields" }, 400);
    const t = await setTicketStatus(bucket, id, status);
    if (!t) return json({ ok: false, error: "not_found_or_bad_status" }, 404);
    return json({ ok: true, ticket: t });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
}
