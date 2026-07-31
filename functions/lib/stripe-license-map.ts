/**
 * Mapa código de línea del cotizador → Stripe Price id (live).
 * SSoT importes: license-prices.json · SSoT Stripe ids: stripe-license-prices.json
 */
import mapJson from "./stripe-license-prices.json";
import type { QuoteLine } from "./license-quote";

export type StripeLicenseMap = {
  version: number;
  currency: string;
  specialProductId: string;
  prices: Record<string, string>;
};

export const STRIPE_LICENSE_MAP = mapJson as StripeLicenseMap;

const PRICE_RE = /^price_[a-zA-Z0-9]+$/;

export function stripePriceForLineCode(code: string): string | null {
  const id = String(STRIPE_LICENSE_MAP.prices[code] || "").trim();
  return PRICE_RE.test(id) ? id : null;
}

/**
 * P: lineItems del calculateLicenseQuote (mode instant)
 * Q: lista de price_… en el mismo orden, o error con códigos faltantes
 */
export function stripePricesForQuoteLines(
  lineItems: QuoteLine[],
): { ok: true; priceIds: string[] } | { ok: false; missing: string[] } {
  const priceIds: string[] = [];
  const missing: string[] = [];
  for (const line of lineItems) {
    const id = stripePriceForLineCode(line.code);
    if (!id) missing.push(line.code);
    else priceIds.push(id);
  }
  if (missing.length) return { ok: false, missing };
  return { ok: true, priceIds };
}

export function isMusicCatalogCheckoutReady(): boolean {
  return Object.keys(STRIPE_LICENSE_MAP.prices).length > 0;
}
