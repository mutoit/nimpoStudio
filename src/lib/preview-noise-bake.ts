/**
 * Incrusta ruido blanco en un archivo de audio de preview (solo admin, al publicar).
 * Devuelve WAV PCM 16-bit mono @ ≤22.05 kHz (ligero para la biblioteca web).
 *
 * P: noise01 en [0,1], file decodificable
 * Q: File .wav con música + ruido mezclado (siempre mono preview; limpio va aparte)
 */

/** Sample rate de preview público: suficiente para oír la mezcla, ~4× más ligero que stereo 48k. */
const PREVIEW_SAMPLE_RATE = 22050;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWavMono(buffer: AudioBuffer): Blob {
  // Forzar mono (mezcla L/R si hace falta)
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const dataSize = numFrames * 2;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    let s = ch0[i] ?? 0;
    if (ch1) s = (s + (ch1[i] ?? 0)) * 0.5;
    s = Math.max(-1, Math.min(1, s));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}

/**
 * @param noise01 0 = sin ruido, 0.12 típico, 1 = solo ruido
 * @param music01 volumen de la música en la mezcla final (default 1)
 * @param layerCount nº de stems que se publican juntos. El ruido se reparte en √N
 *   para que, al sonar todas las capas, el ruido total ≈ el del preview admin
 *   (1 bus de ruido). Sin esto, 7 stems suenan a “ruido al máximo”.
 */
export async function bakePreviewNoise(
  file: File,
  noise01: number,
  music01 = 1,
  layerCount = 1,
): Promise<File> {
  const nLevel = Math.max(0, Math.min(1, noise01));
  const mLevel = Math.max(0, Math.min(1, music01));
  const layers = Math.max(1, Math.min(24, Math.floor(layerCount) || 1));

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const raw = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(raw.slice(0));

    // Preview público siempre mono @ 22.05 kHz (aunque noise≈0): peso bajo en R2 + Web Audio.
    const targetRate = PREVIEW_SAMPLE_RATE;
    const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, frames, targetRate);

    const src = offline.createBufferSource();
    src.buffer = decoded; // el contexto re-samplea si el buffer es 48k stereo
    const musicGain = offline.createGain();
    musicGain.gain.value = mLevel;
    src.connect(musicGain);
    musicGain.connect(offline.destination);

    if (nLevel >= 0.005) {
      const noiseBuf = offline.createBuffer(1, frames, targetRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noiseSrc = offline.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const noiseGain = offline.createGain();
      // Admin preview: 1× (noise01 × 0.22). Público: N stems → ÷ √N
      noiseGain.gain.value = (nLevel * 0.22) / Math.sqrt(layers);
      noiseSrc.connect(noiseGain);
      noiseGain.connect(offline.destination);
      noiseSrc.start(0);
    }

    src.start(0);
    const mixed = await offline.startRendering();
    const blob = encodeWavMono(mixed);
    const base = file.name.replace(/\.[^.]+$/, "") || "preview";
    return new File([blob], `${base}-preview.wav`, { type: "audio/wav" });
  } finally {
    await ctx.close().catch(() => {});
  }
}
