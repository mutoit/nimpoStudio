/**
 * Compartir URL: Web Share API si existe; si no, copiar al portapapeles.
 * P: url no vacía. Q: resuelve con "shared" | "copied" | "cancelled" | "failed".
 */
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export type SharePayload = {
  url: string;
  title?: string;
  text?: string;
};

export async function shareUrl(payload: SharePayload): Promise<ShareResult> {
  const url = String(payload.url || "").trim();
  if (!url) return "failed";

  const title = (payload.title || "").trim();
  const text = (payload.text || "").trim();

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const data: ShareData = { url };
      if (title) data.title = title;
      if (text) data.text = text;
      // Algunos navegadores fallan si canShare rechaza el payload
      if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
        // sigue a clipboard
      } else {
        await navigator.share(data);
        return "shared";
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "AbortError") return "cancelled";
      // fallback a clipboard
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    /* fallback manual */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? "copied" : "failed";
  } catch {
    return "failed";
  }
}

/** URL absoluta canónica de una ruta (pathname o path relativo). */
export function absoluteShareUrl(pathOrUrl: string, origin = typeof location !== "undefined" ? location.origin : ""): string {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return origin || "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${origin.replace(/\/$/, "")}${path}`;
}

/** URL de ficha musical localizada. */
export function musicReleaseSharePath(slug: string, lang: string): string {
  const s = String(slug || "").trim();
  const l = String(lang || "es").trim() || "es";
  return `/${l}/musica/${encodeURIComponent(s)}`;
}

/** URL de biblioteca con deep-link a una publicación. */
export function libraryItemSharePath(slug: string, lang: string): string {
  const s = String(slug || "").trim();
  const l = String(lang || "es").trim() || "es";
  return `/${l}/biblioteca/?p=${encodeURIComponent(s)}`;
}
