import rawProducts from "../data/products.json";

export type ProductCategory =
  | "sample-packs"
  | "presets"
  | "loops"
  | "licencias"
  | "bundles"
  | "servicios";

export type ProductStatus = "published" | "draft" | "coming-soon";

export type LicenseType = "personal" | "commercial" | "exclusive" | "custom";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  images: string[];
  tags: string[];
  licenseType: LicenseType;
  formats: string[];
  previewAudio: string | null;
  price: number | null;
  featured?: boolean;
};

import type { Locale } from "../i18n/translations";
import { getTranslation } from "../i18n/translations";

export function getCategoryLabels(lang: Locale = "es") {
  return {
    "sample-packs": "Sample Packs",
    presets: "Presets",
    loops: "Loops",
    licencias: lang === "es" ? "Licencias" : getTranslation(lang, "cardCustom"), // fallback ok
    bundles: "Bundles",
    servicios: "Servicios",
  } as const;
}

export function getLicenseLabels(lang: Locale = "es") {
  return {
    personal: getTranslation(lang, "cardPersonal"),
    commercial: getTranslation(lang, "cardCommercial"),
    exclusive: getTranslation(lang, "cardExclusive"),
    custom: getTranslation(lang, "cardCustom"),
  } as const;
}

// Keep legacy exports for compatibility (default es)
export const categoryLabels = getCategoryLabels("es");
export const licenseLabels = getLicenseLabels("es");

const allProducts = rawProducts as Product[];

export function getPublishedProducts(): Product[] {
  return allProducts.filter(
    (product) => product.status === "published" || product.status === "coming-soon",
  );
}

export function getFeaturedProducts(): Product[] {
  return getPublishedProducts().filter((product) => product.featured);
}

export function getProductBySlug(slug: string): Product | undefined {
  const product = allProducts.find((item) => item.slug === slug);
  if (!product || product.status === "draft") return undefined;
  return product;
}

export function getAllCategories(): ProductCategory[] {
  const categories = new Set(getPublishedProducts().map((p) => p.category));
  return Array.from(categories);
}

export function getStaticProductPaths(): { params: { slug: string } }[] {
  return getPublishedProducts().map((product) => ({
    params: { slug: product.slug },
  }));
}