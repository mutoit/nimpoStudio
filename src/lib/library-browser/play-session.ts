/**
 * Sesión de play biblioteca: preview MP3 (preferido) o stems Web Audio.
 */

import type { StemTransport } from "../stem-transport";
import { safeMediaUrl } from "../dom-escape";
import type { LibraryItem } from "./catalog-client";
import type { LibraryPreviewPlayer } from "./preview-player";

export type PlaySessionDeps = {
  previewPlayer: LibraryPreviewPlayer;
  stemsTx: StemTransport;
  abortPlay: () => void;
  getPlayAbort: () => AbortController | null;
  setPlayAbort: (c: AbortController | null) => void;
  setLoading: (v: boolean) => void;
  isLoading: () => boolean;
  setPlayingId: (id: string | null) => void;
  setTransportPlaying: (v: boolean) => void;
  markPlayingButtons: (id: string) => void;
  resetPlayButtons: () => void;
  setPlayLoading: (playId: string, text: string) => void;
  startProgressLoop: () => void;
  updateProgressUI: () => void;
  setPlayerStatus: (opts: {
    msg: string;
    kind?: "info" | "load" | "play" | "ok" | "err";
    playPct?: number;
    bufPct?: number;
    time?: string;
    autoHideMs?: number;
  }) => void;
  hideStemError: () => void;
  applyStemMixFromUi: () => void;
};

export function createPlaySession(deps: PlaySessionDeps) {
  const playStems = async (
    item: LibraryItem,
    playId: string,
    signal?: AbortSignal,
  ) => {
    if (!item.stems?.length) {
      deps.setPlayerStatus({
        msg: "Sin capas de audio en esta obra.",
        kind: "err",
        playPct: 0,
      });
      return;
    }
    if (deps.isLoading()) return;
    deps.setLoading(true);
    deps.hideStemError();
    deps.previewPlayer.stop();
    deps.setPlayingId(playId);
    deps.markPlayingButtons(playId);
    deps.setPlayLoading(playId, "…");
    deps.setPlayerStatus({
      msg: `Cargando capas 0/${item.stems.length}…`,
      kind: "load",
      playPct: 5,
      time: "…",
    });
    try {
      await deps.stemsTx.resumeCtx();
      const stems = item.stems
        .map((s) => ({
          ...s,
          src: safeMediaUrl(s.src) || s.src,
        }))
        .filter((s) => s.src);
      if (!stems.length) throw new Error("URLs de stems vacías tras sanitizar");
      const bust = item.updatedAt || item.slug || item.id;
      await deps.stemsTx.load(item.id, stems, {
        cacheBust: bust,
        forceReload: false,
        signal,
        onProgress: ({ loaded, total }) => {
          deps.setPlayLoading(playId, `${loaded}/${total}`);
          const pct = total > 0 ? (loaded / total) * 100 : 0;
          deps.setPlayerStatus({
            msg: `Cargando capas ${loaded}/${total}…`,
            kind: "load",
            playPct: Math.max(8, pct),
            bufPct: pct,
            time: `${loaded}/${total}`,
          });
        },
      });
      if (signal?.aborted) return;
      deps.applyStemMixFromUi();
      await deps.stemsTx.resumeCtx();
      deps.stemsTx.play();
      deps.setPlayingId(playId);
      deps.setTransportPlaying(true);
      deps.markPlayingButtons(playId);
      deps.startProgressLoop();
      deps.updateProgressUI();
      deps.hideStemError();
      deps.setPlayerStatus({
        msg: `▶ ${item.title || "Audio"} (capas)`,
        kind: "play",
        playPct: 0,
        time: "0:00 / …",
      });
      if (deps.stemsTx.lastError) {
        deps.setPlayerStatus({
          msg: deps.stemsTx.lastError,
          kind: "err",
          playPct: 0,
        });
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los stems";
      console.warn("[lb] stems load/play fail", e);
      deps.setPlayerStatus({
        msg: `Error: ${msg}. En admin usa 🎧 Previews para play rápido.`,
        kind: "err",
        playPct: 0,
      });
      deps.setPlayingId(null);
      deps.setTransportPlaying(false);
      deps.resetPlayButtons();
    } finally {
      deps.setLoading(false);
    }
  };

  const playPreviewOrStems = async (
    item: LibraryItem,
    playId: string,
    preferStems: boolean,
  ) => {
    deps.abortPlay();
    const ac = new AbortController();
    deps.setPlayAbort(ac);
    const signal = ac.signal;
    const previewUrl = safeMediaUrl(item.preview);
    if (previewUrl && !preferStems) {
      deps.setLoading(true);
      deps.setPlayLoading(playId, "…");
      deps.setPlayerStatus({
        msg: `Cargando «${item.title || "preview"}»…`,
        kind: "load",
        playPct: 5,
        bufPct: 0,
        time: "…",
      });
      try {
        await deps.previewPlayer.play(item.id, previewUrl);
        if (signal.aborted) return;
        deps.setPlayingId(playId);
        deps.setTransportPlaying(true);
        deps.markPlayingButtons(playId);
        deps.startProgressLoop();
        deps.updateProgressUI();
        deps.hideStemError();
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        console.warn("[lb] preview fail, fallback stems", e);
        if (item.stems?.length) {
          deps.setPlayerStatus({
            msg: "Preview falló · cargando capas…",
            kind: "load",
            playPct: 0,
          });
          await playStems(item, playId, signal);
        } else {
          deps.setPlayerStatus({
            msg: "No se pudo cargar el preview de audio.",
            kind: "err",
            playPct: 0,
          });
          deps.resetPlayButtons();
        }
      } finally {
        deps.setLoading(false);
      }
      return;
    }
    if (item.stems?.length) {
      await playStems(item, playId, signal);
      return;
    }
    deps.setPlayerStatus({
      msg: preferStems
        ? "Sin stems. Re-publica desde admin (genera preview)."
        : "Sin preview ni stems. Re-publica la obra desde admin.",
      kind: "err",
      playPct: 0,
    });
    deps.resetPlayButtons();
  };

  return { playStems, playPreviewOrStems };
}
