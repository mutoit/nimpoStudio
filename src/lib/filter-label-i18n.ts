/**
 * Traducción de etiquetas de filtro (moods/tags) para la UI.
 * Fuente: MyMemory (gratis, sin clave; límite diario). Cache en memoria + sessionStorage.
 * Si falla → devuelve el original (normalmente ES).
 */

const mem = new Map<string, string>();

function cacheKey(text: string, to: string) {
  return `${to}::${text}`;
}

function fromSession(key: string): string | null {
  try {
    return sessionStorage.getItem(`ft:${key}`);
  } catch {
    return null;
  }
}

function toSession(key: string, value: string) {
  try {
    sessionStorage.setItem(`ft:${key}`, value);
  } catch {
    /* quota */
  }
}

/**
 * @param text etiqueta original (p. ej. "oscuro")
 * @param lang "es" | "en" | "fr"
 */
export async function translateFilterLabel(
  text: string,
  lang: string,
): Promise<string> {
  const t = String(text || "").trim();
  if (!t) return t;
  if (!lang || lang === "es") return t;

  const key = cacheKey(t, lang);
  if (mem.has(key)) return mem.get(key)!;
  const sess = fromSession(key);
  if (sess) {
    mem.set(key, sess);
    return sess;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=es|${lang}`;
    const res = await fetch(url);
    if (!res.ok) return t;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const out = String(data.responseData?.translatedText || "").trim();
    // MyMemory a veces devuelve el mismo texto o "QUERY LENGTH LIMIT..."
    if (!out || out === t || /QUERY LENGTH|MYMEMORY WARNING/i.test(out)) {
      return t;
    }
    mem.set(key, out);
    toSession(key, out);
    return out;
  } catch {
    return t;
  }
}

export async function translateFilterLabels(
  labels: string[],
  lang: string,
): Promise<string[]> {
  if (!lang || lang === "es" || !labels.length) return labels;
  // En serie suave para no saturar free API
  const out: string[] = [];
  for (const l of labels) {
    out.push(await translateFilterLabel(l, lang));
  }
  return out;
}
