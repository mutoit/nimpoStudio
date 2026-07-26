/**
 * Preview de biblioteca: **un** stream (HTMLAudioElement).
 * Industria: play ≠ cargar N stems en Web Audio.
 *
 * P: URL same-origin o absoluta del sitio. Q: play/pause/seek/stop con progreso.
 */

export type PreviewProgress = { current: number; duration: number };

export class LibraryPreviewPlayer {
  private audio: HTMLAudioElement | null = null;
  private itemId: string | null = null;
  private onTime: ((p: PreviewProgress) => void) | null = null;
  private onEnd: (() => void) | null = null;
  private raf = 0;

  get loadedItemId() {
    return this.itemId;
  }

  get isPlaying() {
    const a = this.audio;
    return !!(a && !a.paused && !a.ended);
  }

  get currentTime() {
    return this.audio?.currentTime ?? 0;
  }

  get duration() {
    const d = this.audio?.duration;
    return d && Number.isFinite(d) ? d : 0;
  }

  setHandlers(opts: {
    onTime?: (p: PreviewProgress) => void;
    onEnd?: () => void;
  }) {
    this.onTime = opts.onTime ?? null;
    this.onEnd = opts.onEnd ?? null;
  }

  private ensureAudio() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.addEventListener("ended", () => {
        this.stopProgress();
        this.onEnd?.();
      });
      this.audio.addEventListener("timeupdate", () => this.emitTime());
    }
    return this.audio;
  }

  private emitTime() {
    this.onTime?.({ current: this.currentTime, duration: this.duration });
  }

  private startProgress() {
    this.stopProgress();
    const tick = () => {
      this.emitTime();
      if (this.isPlaying) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopProgress() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /**
   * Carga y reproduce. Reusa el elemento si es la misma URL+item.
   */
  async play(itemId: string, src: string): Promise<void> {
    const url = String(src || "").trim();
    if (!url) throw new Error("preview_sin_url");
    const a = this.ensureAudio();
    const same = this.itemId === itemId && a.src && a.src.includes(url.split("?")[0] || url);
    this.itemId = itemId;
    if (!same) {
      a.pause();
      a.src = url;
      a.load();
    }
    try {
      await a.play();
    } catch (e) {
      // Reintento tras load
      await new Promise<void>((resolve, reject) => {
        const onCan = () => {
          a.removeEventListener("canplay", onCan);
          a.removeEventListener("error", onErr);
          a.play().then(() => resolve()).catch(reject);
        };
        const onErr = () => {
          a.removeEventListener("canplay", onCan);
          a.removeEventListener("error", onErr);
          reject(new Error("preview_load_failed"));
        };
        a.addEventListener("canplay", onCan, { once: true });
        a.addEventListener("error", onErr, { once: true });
      });
    }
    this.startProgress();
    this.emitTime();
  }

  pause() {
    this.audio?.pause();
    this.stopProgress();
    this.emitTime();
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
    this.stopProgress();
    this.emitTime();
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
    this.emitTime();
  }

  dispose() {
    this.stop();
    if (this.audio) {
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    this.audio = null;
    this.itemId = null;
  }
}
