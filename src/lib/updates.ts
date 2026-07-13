import rawUpdates from "../data/updates.json";

export type UpdateTag = "nuevo" | "mejora" | "fix" | "proximo";

export type Update = {
  date: string;
  title: string;
  tag: UpdateTag;
  summary: string;
};

import type { Locale } from "../i18n/translations";
import { getTranslation } from "../i18n/translations";

export function getTagLabels(lang: Locale = "es") {
  return {
    nuevo: getTranslation(lang, "tagNew"),
    mejora: getTranslation(lang, "tagImprovement"),
    fix: getTranslation(lang, "tagFix"),
    proximo: getTranslation(lang, "tagNext"),
  } as const;
}

export const tagLabels = getTagLabels("es");

const allUpdates = rawUpdates as Update[];

export function getUpdates(limit?: number): Update[] {
  const sorted = [...allUpdates].sort((a, b) => b.date.localeCompare(a.date));
  return limit ? sorted.slice(0, limit) : sorted;
}