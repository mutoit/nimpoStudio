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

function normSrc(s: string) {
  try {
    return decodeURIComponent(s).replace(/\\/g, "/");
  } catch {
    return s.replace(/\\/g, "/");
  }
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

  async load(itemId: string, stems: StemDef[]) {
    // Mismo ítem ya cargado con capas
    if (this.itemId === itemId && this.layers.length > 0) return;

    this.stopSources();
    this.layers = [];
    this.itemId = itemId;
    this.pauseAt = 0;
    this.playing = false;
    this.duration = 0;
    this.lastError = null;

    const ctx = this.ensureCtx();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
    }

    const list = stems.filter((s) => s?.src);
    if (!list.length) {
      this.lastError = "Sin stems con URL";
      throw new Error(this.lastError);
    }

    // Carga en serie (evita saturar Functions con 9 fetch paralelos)
    const loaded: Layer[] = [];
    const errors: string[] = [];

    for (const s of list) {
      const url = resolveStemUrl(s.src);
      try {
        const res = await fetch(url, { credentials: "same-origin", cache: "force-cache" });
        if (!res.ok) {
          errors.push(`${res.status} ${url}`);
          continue;
        }
        const raw = await res.arrayBuffer();
        if (raw.byteLength < 64) {
          errors.push(`vacío ${url}`);
          continue;
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
      }
    }

    if (!loaded.length) {
      this.lastError =
        errors.slice(0, 3).join(" · ") || "No se pudo cargar ningún stem";
      this.itemId = null;
      throw new Error(this.lastError);
    }

    if (errors.length) {
      console.warn("[stems] partial load", errors);
      this.lastError = `OK ${loaded.length}/${list.length}. Fallos: ${errors[0]}`;
    }

    this.layers = loaded;
    this.duration = loaded.reduce((m, l) => Math.max(m, l.buffer.duration), 0);
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
    this.duration = 0;
  }
}
