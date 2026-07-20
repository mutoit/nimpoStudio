/**
 * Preview de mezcla audio + ruido en el panel admin (antes de publicar).
 * P: files de audio y/o elemento video + gains 0–1
 * Q: play/stop con Web Audio (música + ruido blanco)
 */

function makeNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export class AdminMixPreview {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseSrc: AudioBufferSourceNode | null = null;
  private layers: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  private mediaEl: HTMLMediaElement | null = null;
  private mediaNode: MediaElementAudioSourceNode | null = null;
  private playing = false;
  private music01 = 1;
  private noise01 = 0.12;

  get isPlaying() {
    return this.playing;
  }

  private ensure() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.noiseGain = this.ctx.createGain();
      this.musicGain.gain.value = this.music01;
      this.noiseGain.gain.value = this.noise01 * 0.22;
      this.musicGain.connect(this.ctx.destination);
      this.noiseGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  setGains(music01: number, noise01: number) {
    this.music01 = Math.max(0, Math.min(1, music01));
    this.noise01 = Math.max(0, Math.min(1, noise01));
    if (this.musicGain) this.musicGain.gain.value = this.music01;
    if (this.noiseGain) this.noiseGain.gain.value = this.noise01 * 0.22;
    if (this.mediaEl && !this.mediaNode) {
      this.mediaEl.volume = this.music01;
    }
  }

  private stopInternal() {
    for (const l of this.layers) {
      try {
        l.source.stop();
      } catch {
        /* */
      }
      try {
        l.source.disconnect();
      } catch {
        /* */
      }
      try {
        l.gain.disconnect();
      } catch {
        /* */
      }
    }
    this.layers = [];
    if (this.noiseSrc) {
      try {
        this.noiseSrc.stop();
      } catch {
        /* */
      }
      try {
        this.noiseSrc.disconnect();
      } catch {
        /* */
      }
      this.noiseSrc = null;
    }
    if (this.mediaEl) {
      this.mediaEl.pause();
      try {
        this.mediaEl.currentTime = 0;
      } catch {
        /* */
      }
    }
    this.playing = false;
  }

  stop() {
    this.stopInternal();
  }

  /**
   * Reproduce stems (File[]) mezclados + ruido.
   */
  async playStems(files: File[]) {
    this.stopInternal();
    const list = files.filter(Boolean);
    if (!list.length) throw new Error("No hay audio para previsualizar");

    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();

    const buffers = await Promise.all(
      list.map(async (f) => {
        const raw = await f.arrayBuffer();
        return ctx.decodeAudioData(raw.slice(0));
      }),
    );

    for (const buffer of buffers) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 1;
      src.connect(g);
      g.connect(this.musicGain!);
      src.start(0);
      this.layers.push({ source: src, gain: g });
    }

    this.startNoise(ctx);
    this.setGains(this.music01, this.noise01);
    this.playing = true;
  }

  /**
   * Reproduce un <video> o <audio> del DOM + capa de ruido.
   */
  async playMediaElement(el: HTMLMediaElement) {
    this.stopInternal();
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();

    this.mediaEl = el;
    // Un MediaElementSource solo se puede crear una vez por elemento
    if (!this.mediaNode) {
      try {
        this.mediaNode = ctx.createMediaElementSource(el);
        this.mediaNode.connect(this.musicGain!);
      } catch {
        // Ya conectado en otra instancia: volumen nativo + ruido
        this.mediaNode = null;
      }
    } else {
      try {
        this.mediaNode.connect(this.musicGain!);
      } catch {
        /* */
      }
    }

    el.loop = true;
    el.muted = false;
    if (!this.mediaNode) el.volume = this.music01;
    else el.volume = 1;

    await el.play();
    this.startNoise(ctx);
    this.setGains(this.music01, this.noise01);
    this.playing = true;
  }

  private startNoise(ctx: AudioContext) {
    if (!this.noiseGain) return;
    const buf = makeNoiseBuffer(ctx, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.noiseGain);
    src.start(0);
    this.noiseSrc = src;
  }
}
