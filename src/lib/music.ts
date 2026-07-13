import rawReleases from "../data/music.json";

export type MusicReleaseType = "single" | "ep" | "album" | "pack";

export type MusicStatus = "published" | "draft" | "coming-soon";

export type MusicTrack = {
  slug: string;
  title: string;
  duration: string;
  previewAudio: string | null;
  description: string;
  stems?: Array<{
    id: string;
    label: string;
    src: string;
  }>;
};

export type MusicRelease = {
  slug: string;
  name: string;
  type: MusicReleaseType;
  status: MusicStatus;
  year: number;
  shortDescription: string;
  description: string;
  cover: string;
  tags: string[];
  featured?: boolean;
  tracks: MusicTrack[];
};

import type { Locale } from "../i18n/translations";
import { getTranslation } from "../i18n/translations";

export function getReleaseTypeLabels(lang: Locale = "es") {
  return {
    single: getTranslation(lang, "single"),
    ep: getTranslation(lang, "ep"),
    album: getTranslation(lang, "album"),
    pack: getTranslation(lang, "pack"),
  } as const;
}

// Legacy default
export const releaseTypeLabels = getReleaseTypeLabels("es");

const allReleases = rawReleases as MusicRelease[];

export function getPublishedReleases(): MusicRelease[] {
  return allReleases.filter(
    (release) => release.status === "published" || release.status === "coming-soon",
  );
}

export function getFeaturedReleases(): MusicRelease[] {
  return getPublishedReleases().filter((release) => release.featured);
}

export function getReleaseBySlug(slug: string): MusicRelease | undefined {
  const release = allReleases.find((item) => item.slug === slug);
  if (!release || release.status === "draft") return undefined;
  return release;
}

export function getStaticMusicPaths(): { params: { slug: string } }[] {
  return getPublishedReleases().map((release) => ({
    params: { slug: release.slug },
  }));
}

export function getTrackCount(release: MusicRelease): number {
  return release.tracks.length;
}