/**
 * Catálogo vivo de productos software en R2 (catalog/products.json).
 * Media: library/products/{slug}/...
 */

import { clipStringList, clipText, safeName, safeSlug } from "./media-upload";

export const PRODUCTS_KEY = "catalog/products.json";

export type ProductsBucket = {
  get: (key: string) => Promise<{
    text: () => Promise<string>;
    json: <T>() => Promise<T>;
  } | null>;
  put: (
    key: string,
    value: string | ArrayBuffer,
    opts?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  list?: (opts: {
    prefix: string;
    cursor?: string;
    limit?: number;
  }) => Promise<{
    objects: { key: string }[];
    truncated: boolean;
    cursor?: string;
  }>;
  delete?: (key: string) => Promise<void>;
};

export type ProductStatus = "published" | "draft" | "coming-soon";

/** Cómo se ofrece la demo (ola 1: meta + URL; full binary = ola 2). */
export type ProductDemoKind = "none" | "download" | "web" | "request";

export type ProductDemo = {
  kind: ProductDemoKind;
  /** URL pública o path /api/media/... (demo only — never full/) */
  url?: string | null;
  notes?: string;
};

export type ProductPlan = {
  id: string;
  name: string;
  /** Precio público en EUR (display). Stripe ids solo ola 2. */
  priceEur: number | null;
  /** CTA compra ola 1: Payment Link o vacío → mailto */
  buyUrl?: string | null;
};

export type SoftwareProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  images: string[];
  video: string | null;
  tags: string[];
  formats: string[];
  featured: boolean;
  /** Demo pública (download/web/request). */
  demo?: ProductDemo;
  /** Planes / precios públicos (sin secrets). */
  pricing?: ProductPlan[];
  version?: string;
  updatedAt?: string;
};

const STATUSES = new Set(["published", "draft", "coming-soon"]);
const DEMO_KINDS = new Set(["none", "download", "web", "request"]);

function sanitizeDemo(raw: unknown, existing?: ProductDemo): ProductDemo {
  const base: ProductDemo = existing || { kind: "none", url: null, notes: "" };
  if (raw == null || raw === "") return base;
  if (typeof raw === "string") {
    // form field demoKind alone
    const kind = DEMO_KINDS.has(raw) ? (raw as ProductDemoKind) : base.kind;
    return { ...base, kind };
  }
  if (typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const kindRaw = String(o.kind || base.kind || "none");
  const kind = DEMO_KINDS.has(kindRaw) ? (kindRaw as ProductDemoKind) : "none";
  let url = rewriteProductMediaUrl(String(o.url || base.url || ""));
  // Never expose full/ prefix as public demo
  if (url.includes("/full/") || url.includes("library/products/") && url.includes("/full/")) {
    url = "";
  }
  if (url.includes("/full/")) url = "";
  return {
    kind,
    url: url || null,
    notes: clipText(o.notes ?? base.notes, 500),
  };
}

function sanitizePricing(raw: unknown, existing?: ProductPlan[]): ProductPlan[] {
  const list = Array.isArray(raw) ? raw : existing || [];
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 8)
    .map((p, i) => {
      if (!p || typeof p !== "object") return null;
      const o = p as Record<string, unknown>;
      const name = clipText(o.name || `Plan ${i + 1}`, 80);
      if (!name) return null;
      const id =
        safeName(String(o.id || name)).slice(0, 40) || `plan-${i + 1}`;
      const priceRaw = o.priceEur ?? o.price;
      const priceEur =
        priceRaw == null || priceRaw === ""
          ? null
          : Number.isFinite(Number(priceRaw))
            ? Math.max(0, Number(priceRaw))
            : null;
      let buyUrl = String(o.buyUrl || o.url || "").trim().slice(0, 500);
      if (buyUrl && !/^https:\/\//i.test(buyUrl) && !buyUrl.startsWith("mailto:")) {
        buyUrl = "";
      }
      return {
        id,
        name,
        priceEur,
        buyUrl: buyUrl || null,
      } satisfies ProductPlan;
    })
    .filter((x): x is ProductPlan => x != null);
}

/** Reescribe r2.dev → /api/media/... */
export function rewriteProductMediaUrl(url: string): string {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("/api/media/")) return u;
  if (u.startsWith("library/")) return `/api/media/${u}`;
  try {
    if (u.includes(".r2.dev/")) {
      const parsed = new URL(u);
      if (parsed.hostname.endsWith(".r2.dev")) {
        const key = parsed.pathname.replace(/^\/+/, "");
        if (key.startsWith("library/")) return `/api/media/${key}`;
      }
    }
  } catch {
    /* ignore */
  }
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  return "";
}

export function sanitizeSoftwareProduct(raw: unknown): SoftwareProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = clipText(o.name || o.title, 160);
  if (!name) return null;
  const slug = safeSlug(String(o.slug || ""), name);
  const id = clipText(o.id, 80) || `prod-${slug}`;
  let status = String(o.status || "published");
  if (!STATUSES.has(status)) status = "published";

  const imagesRaw = Array.isArray(o.images) ? o.images : [];
  const images = imagesRaw
    .map((x) => rewriteProductMediaUrl(String(x)))
    .filter(Boolean)
    .slice(0, 12);

  const video = rewriteProductMediaUrl(String(o.video || "")) || null;
  const category =
    clipText(o.category, 48).toLowerCase().replace(/\s+/g, "-") || "other";

  const existingDemo =
    o.demo && typeof o.demo === "object" ? (o.demo as ProductDemo) : undefined;
  const demo = sanitizeDemo(o.demo ?? o.demoKind, existingDemo);
  // Allow form flat fields
  if (o.demoUrl != null || o.demoNotes != null || o.demoKind != null) {
    const kindRaw = String(o.demoKind || demo.kind || "none");
    const kind = DEMO_KINDS.has(kindRaw) ? (kindRaw as ProductDemoKind) : demo.kind;
    let url = rewriteProductMediaUrl(String(o.demoUrl ?? demo.url ?? ""));
    if (url.includes("/full/")) url = "";
    demo.kind = kind;
    demo.url = url || null;
    demo.notes = clipText(o.demoNotes ?? demo.notes, 500);
  }

  let pricing = sanitizePricing(o.pricing);
  // Flat form: priceEur + planName + buyUrl → single plan
  if (o.priceEur != null || o.planName || o.buyUrl) {
    const fromFlat = sanitizePricing([
      {
        id: o.planId || "standard",
        name: o.planName || "Standard",
        priceEur: o.priceEur,
        buyUrl: o.buyUrl,
      },
    ]);
    if (fromFlat.length) pricing = fromFlat;
  }

  return {
    id,
    slug,
    name,
    category,
    status: status as ProductStatus,
    shortDescription: clipText(o.shortDescription || o.short, 280),
    description: clipText(o.description || o.body, 4000),
    images,
    video,
    tags: clipStringList(o.tags, 16, 40),
    formats: clipStringList(o.formats, 12, 32),
    featured: Boolean(o.featured),
    demo,
    pricing,
    version: clipText(o.version, 40) || undefined,
    updatedAt:
      typeof o.updatedAt === "string" ? o.updatedAt.slice(0, 40) : undefined,
  };
}

export function sanitizeProductsList(
  raw: unknown,
  opts?: { includeDraft?: boolean },
): SoftwareProduct[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeSoftwareProduct)
    .filter((x): x is SoftwareProduct => x != null)
    .filter((p) => (opts?.includeDraft ? true : p.status !== "draft"))
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name, "es");
    });
}

export async function readProducts(
  bucket: ProductsBucket | undefined,
): Promise<SoftwareProduct[] | null> {
  if (!bucket) return null;
  const obj = await bucket.get(PRODUCTS_KEY);
  if (!obj) return null;
  try {
    const data = await obj.json<unknown>();
    if (!Array.isArray(data)) return null;
    return sanitizeProductsList(data, { includeDraft: true });
  } catch {
    return null;
  }
}

export async function writeProducts(
  bucket: ProductsBucket,
  items: SoftwareProduct[],
): Promise<void> {
  await bucket.put(PRODUCTS_KEY, JSON.stringify(items, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  // Dual-write per product (detail O(1) futuro)
  for (const p of items) {
    if (!p.slug) continue;
    await bucket.put(
      `catalog/products/${p.slug}.json`,
      JSON.stringify(p, null, 2),
      { httpMetadata: { contentType: "application/json; charset=utf-8" } },
    );
  }
}

export async function upsertProduct(
  bucket: ProductsBucket,
  item: SoftwareProduct,
): Promise<SoftwareProduct[]> {
  const current = (await readProducts(bucket)) || [];
  const next = current.filter((p) => p.slug !== item.slug);
  next.unshift({ ...item, updatedAt: new Date().toISOString() });
  await writeProducts(bucket, next);
  return next;
}

export async function deleteProduct(
  bucket: ProductsBucket,
  slug: string,
): Promise<{ items: SoftwareProduct[]; removed: boolean }> {
  const s = safeSlug(slug, "");
  const current = (await readProducts(bucket)) || [];
  const next = current.filter((p) => p.slug !== s);
  const removed = next.length !== current.length;
  if (removed) await writeProducts(bucket, next);
  return { items: next, removed };
}

export async function findProduct(
  bucket: ProductsBucket,
  slug: string,
): Promise<SoftwareProduct | null> {
  const s = safeSlug(slug, "");
  const list = (await readProducts(bucket)) || [];
  return list.find((p) => p.slug === s) || null;
}

/** Borra objetos R2 bajo library/products/{slug}/ */
export async function deleteProductMedia(
  bucket: ProductsBucket,
  slug: string,
): Promise<number> {
  if (!bucket.list || !bucket.delete) return 0;
  const prefix = `library/products/${safeName(slug) || slug}/`;
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 100 });
    for (const obj of page.objects) {
      await bucket.delete(obj.key);
      deleted++;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return deleted;
}

export function productIdFromSlug(slug: string): string {
  const s = safeName(slug).slice(0, 80) || "item";
  return `prod-${s}`;
}
