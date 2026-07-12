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

export const categoryLabels: Record<ProductCategory, string> = {
  "sample-packs": "Sample Packs",
  presets: "Presets",
  loops: "Loops",
  licencias: "Licencias",
  bundles: "Bundles",
  servicios: "Servicios",
};

export const licenseLabels: Record<LicenseType, string> = {
  personal: "Uso personal",
  commercial: "Uso comercial",
  exclusive: "Exclusiva",
  custom: "Bajo consulta",
};

const allProducts = rawProducts as Product[];

export function getPublishedProducts(): Product[] {
  return allProducts.filter(
    (product) => product.status === "published" || product.status === "coming-soon",
  );
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