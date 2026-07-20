/**
 * Reproductor multi-stem con Web Audio (buffers en memoria).
 * Pages no sirve Range/partial content → HTMLAudioElement no scrubea.
 *
 * Incluye bus de música + ruido de preview (watermark ligero).
 * P⇒Q: load(stems) ⇒ play/pause/seek/mute + setPreviewMix(música, ruido).
 */

export type StemDef = { src: string; label?: string };

type Layer = {
  src: string;
  buffer: AudioBuffer;
  gain: GainNode;
  source: AudioBufferSourceNode | null;
  on: boolean;
};

function mediaSrc(src: string) {
  try {
    return encodeURI(src);
  } catch {
    return src;
  }
}

function normSrc(s: string) {
  try {
    return decodeURIComponent(s).replace(/\\/g, "/");
  } catch {
    return s.replace(/\\/g, "/");
  }
}

/** Ruido blanco en buffer corto (loop). */
function makeNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export class StemTransport {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Nivel global de las capas musicales (0–1). */
  private musicBus: GainNode | null = null;
  /** Nivel de ruido de preview (0–1). */
  private noiseBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private layers: Layer[] = [];
  private itemId: string | null = null;
  private playing = false;
  private startCtx = 0;
  private startOffset = 0;
  private pauseAt = 0;
  private musicLevel = 1;
  /** Default ~12 % ruido: preview no limpio sin quitar la pieza. */
  private noiseLevel = 0.12;
  duration = 0;

  get isPlaying() {
    return this.playing;
  }

  get loadedItemId() {
    return this.itemId;
  }

  get musicMix() {
    return this.musicLevel;
  }

  get noiseMix() {
    return this.noiseLevel;
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
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicLevel;
      this.musicBus.connect(this.master);

      this.noiseBus = this.ctx.createGain();
      this.noiseBus.gain.value = this.noiseLevel;
      this.noiseBus.connect(this.master);

      this.noiseBuffer = makeNoiseBuffer(this.ctx, 2);
    }
    return this.ctx;
  }

  async resumeCtx() {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  /**
   * Mezcla preview: música 0–1, ruido 0–1 (independientes).
   * Ej. music=1, noise=0.2 → pieza clara con capa de ruido.
   */
  setPreviewMix(music: number, noise: number) {
    this.musicLevel = Math.max(0, Math.min(1, music));
    this.noiseLevel = Math.max(0, Math.min(1, noise));
    this.ensureCtx();
    if (this.musicBus) this.musicBus.gain.value = this.musicLevel;
    if (this.noiseBus) this.noiseBus.gain.value = this.noiseLevel;
  }

  async load(itemId: string, stems: StemDef[]) {
    if (this.itemId === itemId && this.layers.length === stems.length) return;
    this.stopSources();
    this.layers = [];
    this.itemId = itemId;
    this.pauseAt = 0;
    this.playing = false;
    this.duration = 0;

    const ctx = this.ensureCtx();
    if (!this.musicBus || !this.master) {
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.noiseBus = ctx.createGain();
      this.noiseBus.connect(this.master);
    }
    this.musicBus.gain.value = this.musicLevel;
    if (this.noiseBus) this.noiseBus.gain.value = this.noiseLevel;

    const loaded = await Promise.all(
      stems.map(async (s) => {
        const url = mediaSrc(s.src);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`stem fetch ${res.status} ${url}`);
        const raw = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(raw.slice(0));
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(this.musicBus!);
        return {
          src: s.src,
          buffer,
          gain,
          source: null as AudioBufferSourceNode | null,
          on: true,
        };
      }),
    );
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
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {
        /* ignore */
      }
      try {
        this.noiseSource.disconnect();
      } catch {
        /* ignore */
      }
      this.noiseSource = null;
    }
  }

  private startNoise() {
    const ctx = this.ensureCtx();
    if (!this.noiseBuffer || !this.noiseBus) return;
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {
        /* ignore */
      }
      this.noiseSource = null;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.connect(this.noiseBus);
    src.start(0);
    this.noiseSource = src;
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
    this.startNoise();
    if (this.musicBus) this.musicBus.gain.value = this.musicLevel;
    if (this.noiseBus) this.noiseBus.gain.value = this.noiseLevel;

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
      if (normSrc(l.src) === n) {
        l.on = on;
        l.gain.gain.value = on ? 1 : 0;
      }
    }
  }

  /** enabledSrcs null = todas on; Set vacío = todas off. */
  applyMix(enabledSrcs: Set<string> | null) {
    for (const l of this.layers) {
      const on =
        enabledSrcs == null
          ? true
          : enabledSrcs.size === 0
            ? false
            : enabledSrcs.has(normSrc(l.src));
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
