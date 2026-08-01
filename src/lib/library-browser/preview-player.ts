/**
 * Preview de biblioteca: **un** stream (HTMLAudioElement).
 * Eventos de carga + buffer + tiempo para barra de progreso UX.
 */

export type PreviewProgress = {
  current: number;
  duration: number;
  /** 0–1 bytes/buffer listos */
  buffered: number;
  phase: "idle" | "loading" | "playing" | "paused" | "ended" | "error";
  error?: string;
};

export class LibraryPreviewPlayer {
  private audio: HTMLAudioElement | null = null;
  private itemId: string | null = null;
  private phase: PreviewProgress["phase"] = "idle";
  private lastError: string | null = null;
  private onUpdate: ((p: PreviewProgress) => void) | null = null;
  private raf = 0;

  get loadedItemId() {
    return this.itemId;
  }

  get isPlaying() {
    const a = this.audio;
    // Tiempo real del elemento: no depender solo de phase (waiting → loading rompía el loop)
    return !!(a && a.src && !a.paused && !a.ended);
  }

  /** Hay src cargado (aunque esté en pause). */
  get hasSource() {
    return !!(this.audio && this.audio.src);
  }

  get phasePublic(): PreviewProgress["phase"] {
    return this.phase;
  }

  get currentTime() {
    const t = this.audio?.currentTime;
    return t != null && Number.isFinite(t) ? t : 0;
  }

  get duration() {
    const a = this.audio;
    if (!a) return 0;
    const d = a.duration;
    if (d && Number.isFinite(d) && d > 0 && d !== Infinity) return d;
    // WAV a veces tarda: usar fin del buffer como aproximación
    try {
      if (a.buffered && a.buffered.length > 0) {
        const end = a.buffered.end(a.buffered.length - 1);
        if (end > 0 && Number.isFinite(end)) return end;
      }
    } catch {
      /* ignore */
    }
    return 0;
  }

  get bufferedRatio() {
    const a = this.audio;
    if (!a || !a.buffered || a.buffered.length === 0) return 0;
    const d = this.duration;
    try {
      const end = a.buffered.end(a.buffered.length - 1);
      if (d > 0) return Math.min(1, end / d);
      return end > 0 ? 0.5 : 0;
    } catch {
      return 0;
    }
  }

  setHandlers(opts: { onUpdate?: (p: PreviewProgress) => void }) {
    this.onUpdate = opts.onUpdate ?? null;
  }

  private emit(partial?: Partial<PreviewProgress>) {
    this.onUpdate?.({
      current: this.currentTime,
      duration: this.duration,
      buffered: this.bufferedRatio,
      phase: this.phase,
      error: this.lastError || undefined,
      ...partial,
    });
  }

  private ensureAudio() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.addEventListener("loadstart", () => {
        this.phase = "loading";
        this.emit();
      });
      this.audio.addEventListener("progress", () => this.emit());
      this.audio.addEventListener("waiting", () => {
        if (this.phase === "playing") {
          this.phase = "loading";
          this.emit();
        }
      });
      this.audio.addEventListener("canplay", () => this.emit());
      this.audio.addEventListener("playing", () => {
        this.phase = "playing";
        this.lastError = null;
        this.startProgress();
        this.emit();
      });
      this.audio.addEventListener("pause", () => {
        if (this.phase === "playing") {
          this.phase = "paused";
          this.stopProgress();
          this.emit();
        }
      });
      this.audio.addEventListener("timeupdate", () => this.emit());
      this.audio.addEventListener("ended", () => {
        this.phase = "ended";
        this.stopProgress();
        this.emit();
      });
      this.audio.addEventListener("error", () => {
        this.phase = "error";
        this.lastError = "No se pudo cargar o reproducir el audio";
        this.stopProgress();
        this.emit({ error: this.lastError });
      });
    }
    return this.audio;
  }

  private startProgress() {
    this.stopProgress();
    const tick = () => {
      this.emit();
      // Seguir emitiendo mientras el audio corre o está bufferizando
      if (this.isPlaying || this.phase === "loading" || this.phase === "playing") {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = 0;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopProgress() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  async play(itemId: string, src: string): Promise<void> {
    const url = String(src || "").trim();
    if (!url) {
      this.phase = "error";
      this.lastError = "Sin URL de preview";
      this.emit();
      throw new Error("preview_sin_url");
    }
    const a = this.ensureAudio();
    const base = url.split("?")[0] || url;
    const same = this.itemId === itemId && a.src && a.src.includes(base);
    this.itemId = itemId;
    this.lastError = null;
    this.phase = "loading";
    this.emit();
    this.startProgress();

    if (!same) {
      a.pause();
      a.src = url;
      a.load();
    }

    try {
      await a.play();
      this.phase = "playing";
      this.emit();
      this.startProgress();
    } catch {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("preview_timeout"));
        }, 45000);
        const onCan = () => {
          cleanup();
          a.play().then(() => resolve()).catch(reject);
        };
        const onErr = () => {
          cleanup();
          reject(new Error("preview_load_failed"));
        };
        const cleanup = () => {
          window.clearTimeout(timeout);
          a.removeEventListener("canplay", onCan);
          a.removeEventListener("canplaythrough", onCan);
          a.removeEventListener("error", onErr);
        };
        a.addEventListener("canplay", onCan, { once: true });
        a.addEventListener("canplaythrough", onCan, { once: true });
        a.addEventListener("error", onErr, { once: true });
      });
      this.phase = "playing";
      this.emit();
      this.startProgress();
    }
  }

  pause() {
    this.audio?.pause();
    if (this.phase === "playing") this.phase = "paused";
    this.stopProgress();
    this.emit();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    this.phase = "idle";
    this.stopProgress();
    this.emit();
  }

  seek(seconds: number) {
    if (!this.audio) return;
    const d = this.duration;
    const t =
      d > 0 ? Math.min(Math.max(0, seconds), Math.max(0, d - 0.05)) : Math.max(0, seconds);
    try {
      this.audio.currentTime = t;
    } catch {
      /* ignore */
    }
    // Re-emit en el siguiente frame por si el browser aún no actualizó currentTime
    this.emit();
    requestAnimationFrame(() => this.emit());
  }

  dispose() {
    this.stop();
    if (this.audio) {
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    this.audio = null;
    this.itemId = null;
    this.phase = "idle";
  }
}
