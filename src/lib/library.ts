import raw from "../data/library.json";

export type LibraryKind = "video" | "stems" | "audio";
export type LibraryAspect = "1:1" | "9:16" | "16:9" | "audio";

export type LibraryStem = {
  id: string;
  label: string;
  src: string;
};

export type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  kind: LibraryKind;
  aspect: LibraryAspect;
  cover?: string | null;
  video?: string | null;
  audio?: string | null;
  stems?: LibraryStem[];
  tags: string[];
  moods: string[];
  description?: string;
  /** Texto extra del panel (comentarios del estudio). */
  notes?: string;
  year?: number;
  provisional?: boolean;
  licenseEnabled?: boolean;
};

const items = raw as LibraryItem[];

export function getLibraryItems(): LibraryItem[] {
  return items;
}

export function getLibraryItemBySlug(slug: string): LibraryItem | undefined {
  return items.find((i) => i.slug === slug);
}

export function getLibraryMoods(): string[] {
  return [...new Set(items.flatMap((i) => i.moods))].sort();
}

export function getLibraryTags(): string[] {
  return [...new Set(items.flatMap((i) => i.tags))].sort();
}

export function isProvisionalLibraryItem(item: LibraryItem): boolean {
  return item.provisional !== false && item.slug !== "deep-in-the-forest";
}
