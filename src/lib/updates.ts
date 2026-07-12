import rawUpdates from "../data/updates.json";

export type UpdateTag = "nuevo" | "mejora" | "fix" | "proximo";

export type Update = {
  date: string;
  title: string;
  tag: UpdateTag;
  summary: string;
};

export const tagLabels: Record<UpdateTag, string> = {
  nuevo: "Nuevo",
  mejora: "Mejora",
  fix: "Fix",
  proximo: "Próximo",
};

const allUpdates = rawUpdates as Update[];

export function getUpdates(limit?: number): Update[] {
  const sorted = [...allUpdates].sort((a, b) => b.date.localeCompare(a.date));
  return limit ? sorted.slice(0, limit) : sorted;
}