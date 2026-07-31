/**
 * Play biblioteca: solo preview único (mix ligero).
 * Stems HQ no se cargan en el visitante (entrega / licencia).
 */

import { safeMediaUrl } from "../dom-escape";
import type { LibraryItem } from "./catalog-client";
import type { LibraryPreviewPlayer } from "./preview-player";

export type PlaySessionDeps = {
  previewPlayer: LibraryPreviewPlayer;
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
};

export function createPlaySession(deps: PlaySessionDeps) {
  const playPreview = async (item: LibraryItem, playId: string, signal?: AbortSignal) => {
    const previewUrl = safeMediaUrl(item.preview);
    if (!previewUrl) {
      deps.setPlayerStatus({
        msg: item.hasStems
          ? "Sin preview web. Re-publica desde admin (genera el mix)."
          : "Sin audio de preview en esta obra.",
        kind: "err",
        playPct: 0,
      });
      deps.resetPlayButtons();
      return;
    }
    if (deps.isLoading()) return;
    deps.setLoading(true);
    deps.hideStemError();
    deps.setPlayingId(playId);
    deps.markPlayingButtons(playId);
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
      if (signal?.aborted) return;
      deps.setPlayingId(playId);
      deps.setTransportPlaying(true);
      deps.markPlayingButtons(playId);
      deps.startProgressLoop();
      deps.updateProgressUI();
      deps.hideStemError();
      deps.setPlayerStatus({
        msg: `▶ ${item.title || "Audio"}`,
        kind: "play",
        playPct: 0,
        time: "0:00 / …",
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "No se pudo cargar el preview";
      console.warn("[lb] preview fail", e);
      deps.setPlayerStatus({
        msg: `Error: ${msg}`,
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

  /** Compat: preferStems ignorado — siempre preview único. */
  const playPreviewOrStems = async (
    item: LibraryItem,
    playId: string,
    _preferStems?: boolean,
  ) => {
    deps.abortPlay();
    const ac = new AbortController();
    deps.setPlayAbort(ac);
    await playPreview(item, playId, ac.signal);
  };

  return {
    playPreview,
    playPreviewOrStems,
    /** @deprecated multi-stem eliminado */
    playStems: playPreview,
  };
}
