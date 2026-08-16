/**
 * Filtro servidor de tráfico interno (estudio) para no contar en
 * contadores/analytics descargas ni interacciones propias.
 *
 * Fuentes que identifica:
 *  1. Cookie `nimpo_no_stats=1` — la setea el opt-out del navegador
 *     (?nimpo_no_stats=1 → src/lib/analytics/opt-out.ts). Cubre descargas
 *     full y eventos desde ese navegador, aunque sea incógnito mientras
 *     persista la cookie.
 *  2. Query param `nimpo_no_stats=1` / `nimpo_no_analytics=1`.
 *  3. IP en `NIMPO_INTERNAL_IPS` (env server-side, NUNCA PUBLIC_):
 *     comas separadas, IPv4/IPv6 exactos. Cubre cualquier navegador,
 *     incógnito y clientes no-browser que salgan por esa IP.
 *
 * Contrato: devuelve true → NO contar (pero NO bloquear la petición).
 */

import { clientIp } from "./rate-limit";

export type StatsFilterEnv = {
  NIMPO_INTERNAL_IPS?: string;
};

function hasOptOutCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie) return false;
  for (const part of cookie.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === "nimpo_no_stats" && v === "1") return true;
  }
  return false;
}

function ipMatches(ip: string, candidates: string[]): boolean {
  if (!ip || ip === "unknown") return false;
  const needle = ip.trim().toLowerCase();
  return candidates.some((c) => {
    const cand = c.trim().toLowerCase();
    return cand.length > 0 && cand === needle;
  });
}

export function isInternalTraffic(
  request: Request,
  env: StatsFilterEnv,
): boolean {
  try {
    const q = new URL(request.url).searchParams;
    if (
      q.get("nimpo_no_stats") === "1" ||
      q.get("nimpo_no_analytics") === "1"
    ) {
      return true;
    }
  } catch {
    /* URL inválida → seguir normal */
  }

  if (hasOptOutCookie(request)) return true;

  const raw = String(env?.NIMPO_INTERNAL_IPS || "").trim();
  if (raw) {
    const candidates = raw.split(",");
    if (ipMatches(clientIp(request), candidates)) return true;
  }

  return false;
}
