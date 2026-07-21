/**
 * Reproductor multi-stem con Web Audio (buffers en memoria).
 * El ruido de preview se incrusta al publicar (admin), no aquí.
 *
 * P⇒Q: load(stems) ⇒ play/pause/seek/mute; carga resiliente (no falla todo por 1 stem).
 */

export type StemDef = { src: string; label?: string };

type Layer = {
  src: string;
  buffer: AudioBuffer;
  gain: GainNode;
  source: AudioBufferSourceNode | null;
  on: boolean;
};

export type StemLoadProgress = {
  loaded: number;
  total: number;
  label?: string;
};

/** r2.dev / library/… → /api/media/… (same-origin). */
export function resolveStemUrl(src: string): string {
  let u = String(src || "").trim();
  if (!u) return "";
  try {
    if (u.startsWith("library/")) return `/api/media/${u}`;
    if (u.includes(".r2.dev")) {
      const parsed = new URL(u, "https://nimpo3dstudio.com");
      if (parsed.hostname.endsWith(".r2.dev")) {
        const key = parsed.pathname.replace(/^\/+/, "");
        if (key.startsWith("library/")) return `/api/media/${key}`;
      }
    }
  } catch {
    /* keep */
  }
  // encode solo segmentos con espacios (no romper /)
  try {
    return u
      .split("/")
      .map((seg, i) => (i === 0 && seg === "" ? "" : encodeURIComponent(decodeURIComponent(seg))))
      .join("/")
      .replace(/%2F/gi, "/");
  } catch {
    return encodeURI(u);
  }
}

/** Añade ?v= para invalidar caché del navegador tras re-publicar. */
export function withCacheBust(url: string, bust?: string | null): string {
  const u = String(url || "").trim();
  if (!u || !bust) return u;
  const v = encodeURIComponent(String(bust).slice(0, 40));
  return u.includes("?") ? `${u}&v=${v}` : `${u}?v=${v}`;
}

function normSrc(s: string) {
  try {
    return decodeURIComponent(s.split("?")[0] || s).replace(/\\/g, "/");
  } catch {
    return s.replace(/\\/g, "/").split("?")[0] || s;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}

export class StemTransport {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Layer[] = [];
  private itemId: string | null = null;
  private playing = false;
  private startCtx = 0;
  private startOffset = 0;
  private pauseAt = 0;
  /** Firma de la última carga (item + urls) para invalidar si re-publican. */
  private loadKey: string | null = null;
  duration = 0;
  /** Último error legible (UI). */
  lastError: string | null = null;

  get isPlaying() {
    return this.playing;
  }

  get loadedItemId() {
    return this.itemId;
  }

  get currentTime() {
    if (!this.ctx || !this.playing) return this.pauseAt;
    const t = this.startOffset + (this.ctx.currentTime - this.startCtx);
    if (this.duration > 0) {
      const mod = t % this.duration;
      return mod < 0 ? 0 : mod;
    }
    return Math.max(0, t);
  }

  private ensureCtx() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resumeCtx() {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  /**
   * @param cacheBust p.ej. updatedAt del ítem — fuerza re-fetch tras re-mezcla
   * @param onProgress progreso de capas (UI "Cargando 2/7…")
   */
  async load(
    itemId: string,
    stems: StemDef[],
    opts?: {
      cacheBust?: string | null;
      onProgress?: (p: StemLoadProgress) => void;
      /** Si true, ignora caché en memoria aunque sea el mismo itemId */
      forceReload?: boolean;
    },
  ) {
    const list = stems.filter((s) => s?.src);
    const key = `${itemId}::${list.map((s) => s.src).join("|")}::${opts?.cacheBust || ""}`;

    // Mismo ítem + mismas URLs ya cargadas
    if (!opts?.forceReload && this.loadKey === key && this.layers.length > 0) return;

    this.stopSources();
    this.layers = [];
    this.itemId = itemId;
    this.loadKey = null;
    this.pauseAt = 0;
    this.playing = false;
    this.duration = 0;
    this.lastError = null;

    const ctx = this.ensureCtx();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
    }

    if (!list.length) {
      this.lastError = "Sin stems con URL";
      throw new Error(this.lastError);
    }

    const loaded: Layer[] = [];
    const errors: string[] = [];
    let done = 0;

    // 3 en paralelo: más rápido que serie, sin saturar Functions
    await mapPool(list, 3, async (s) => {
      const url = withCacheBust(resolveStemUrl(s.src), opts?.cacheBust);
      try {
        const res = await fetch(url, {
          credentials: "same-origin",
          // no force-cache: tras re-publicar el mismo path debe verse el audio nuevo
          cache: "no-cache",
        });
        if (!res.ok) {
          errors.push(`${res.status} ${url}`);
          return;
        }
        const raw = await res.arrayBuffer();
        if (raw.byteLength < 64) {
          errors.push(`vacío ${url}`);
          return;
        }
        const buffer = await ctx.decodeAudioData(raw.slice(0));
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(this.master!);
        loaded.push({
          src: s.src,
          buffer,
          gain,
          source: null,
          on: true,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${msg} @ ${url}`);
      } finally {
        done++;
        opts?.onProgress?.({
          loaded: done,
          total: list.length,
          label: s.label,
        });
      }
    });

    if (!loaded.length) {
      this.lastError =
        errors.slice(0, 3).join(" · ") || "No se pudo cargar ningún stem";
      this.itemId = null;
      this.loadKey = null;
      throw new Error(this.lastError);
    }

    if (errors.length) {
      console.warn("[stems] partial load", errors);
      this.lastError = `OK ${loaded.length}/${list.length}. Fallos: ${errors[0]}`;
    }

    this.layers = loaded;
    this.duration = loaded.reduce((m, l) => Math.max(m, l.buffer.duration), 0);
    this.loadKey = key;
  }

  private stopSources() {
    for (const l of this.layers) {
      if (l.source) {
        try {
          l.source.stop();
        } catch {
          /* already stopped */
        }
        try {
          l.source.disconnect();
        } catch {
          /* ignore */
        }
        l.source = null;
      }
    }
  }

  play(offset?: number) {
    const ctx = this.ensureCtx();
    if (!this.layers.length) return;
    const off =
      offset != null && Number.isFinite(offset) ? Math.max(0, offset) : this.pauseAt;
    const o = this.duration > 0 ? off % this.duration : off;

    this.stopSources();
    for (const l of this.layers) {
      const src = ctx.createBufferSource();
      src.buffer = l.buffer;
      src.loop = true;
      src.connect(l.gain);
      l.gain.gain.value = l.on ? 1 : 0;
      src.start(0, o);
      l.source = src;
    }
    this.startCtx = ctx.currentTime;
    this.startOffset = o;
    this.pauseAt = o;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.pauseAt = this.currentTime;
    this.stopSources();
    this.playing = false;
  }

  stop() {
    this.stopSources();
    this.playing = false;
    this.pauseAt = 0;
    this.startOffset = 0;
  }

  seek(seconds: number) {
    const t =
      this.duration > 0
        ? Math.min(Math.max(0, seconds), Math.max(0, this.duration - 0.05))
        : Math.max(0, seconds);
    const was = this.playing;
    this.pauseAt = t;
    if (was) this.play(t);
    else {
      this.stopSources();
      this.playing = false;
    }
  }

  setLayerOn(src: string, on: boolean) {
    const n = normSrc(src);
    for (const l of this.layers) {
      if (normSrc(l.src) === n || normSrc(resolveStemUrl(l.src)) === n) {
        l.on = on;
        l.gain.gain.value = on ? 1 : 0;
      }
    }
  }

  applyMix(enabledSrcs: Set<string> | null) {
    for (const l of this.layers) {
      const candidates = [normSrc(l.src), normSrc(resolveStemUrl(l.src))];
      const on =
        enabledSrcs == null
          ? true
          : enabledSrcs.size === 0
            ? false
            : candidates.some((c) => enabledSrcs.has(c));
      l.on = on;
      l.gain.gain.value = on ? 1 : 0;
    }
  }

  dispose() {
    this.stop();
    for (const l of this.layers) {
      try {
        l.gain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.layers = [];
    this.itemId = null;
    this.loadKey = null;
    this.duration = 0;
  }
}
