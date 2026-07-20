/**
 * Validación de subidas admin → R2 (allowlist ext/MIME, cuotas, names seguros).
 */

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB / archivo
export const MAX_TOTAL_BYTES = 250 * 1024 * 1024; // 250 MB / publish
export const MAX_STEMS = 24;
export const MAX_TEXT = 4000;

const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);
const AUDIO_EXT = new Set(["mp3", "wav", "m4a", "ogg", "aac"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  aac: "audio/aac",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type MediaRole = "video" | "audio" | "image";

export function safeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

/** Extensión limpia (sin path) o null. */
export function extractExt(fileName: string): string {
  const base = String(fileName || "").split(/[/\\]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return safeName(base.slice(dot + 1)).replace(/\./g, "");
}

export function allowedExts(role: MediaRole): Set<string> {
  if (role === "video") return VIDEO_EXT;
  if (role === "audio") return AUDIO_EXT;
  return IMAGE_EXT;
}

export function resolveExt(fileName: string, role: MediaRole): string | null {
  const ext = extractExt(fileName);
  if (!ext || !allowedExts(role).has(ext)) return null;
  return ext;
}

/** Content-Type canónico; ignora el del cliente. */
export function contentTypeForExt(ext: string): string {
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export function safeAspect(raw: string): "1:1" | "9:16" | "16:9" {
  const a = String(raw || "").trim();
  if (a === "9:16" || a === "16:9" || a === "1:1") return a;
  return "1:1";
}

export function safeSlug(raw: string, fallback: string): string {
  return safeName(raw) || safeName(fallback) || `item-${Date.now()}`;
}

export function safeItemId(slug: string): string {
  const s = safeName(slug).slice(0, 80) || "item";
  return `lib-${s}`;
}

export function clipText(raw: unknown, max = MAX_TEXT): string {
  return String(raw ?? "")
    .trim()
    .slice(0, max);
}

export function clipStringList(arr: unknown, maxItems = 24, maxLen = 48): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => clipText(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export type FileCheckError =
  | "file_too_large"
  | "total_too_large"
  | "bad_extension"
  | "too_many_stems";

export function checkFileSize(size: number): FileCheckError | null {
  if (size > MAX_FILE_BYTES) return "file_too_large";
  return null;
}

export function checkTotalSize(total: number): FileCheckError | null {
  if (total > MAX_TOTAL_BYTES) return "total_too_large";
  return null;
}
