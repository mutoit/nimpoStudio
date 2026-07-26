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

/**
 * Mezcla N stems (ya con ruido) en **un** preview mono @ 22.05 kHz.
 * Preferido: **MP3** (lamejs). Fallback: WAV si encode falla.
 * P: files decodificables. Q: 1 File (audio/mpeg o audio/wav).
 */
export async function bakeMixPreview(files: File[]): Promise<File> {
  const list = files.filter((f) => f instanceof File && f.size > 0);
  if (!list.length) throw new Error("bake_mix_empty");

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decoded: AudioBuffer[] = [];
    for (const f of list) {
      const raw = await f.arrayBuffer();
      decoded.push(await ctx.decodeAudioData(raw.slice(0)));
    }
    const duration = Math.max(...decoded.map((b) => b.duration), 0.05);
    const targetRate = PREVIEW_SAMPLE_RATE;
    const frames = Math.max(1, Math.ceil(duration * targetRate));
    const offline = new OfflineAudioContext(1, frames, targetRate);
    const gainVal = 1 / Math.sqrt(decoded.length);
    for (const buf of decoded) {
      const src = offline.createBufferSource();
      src.buffer = buf;
      const g = offline.createGain();
      g.gain.value = gainVal;
      src.connect(g);
      g.connect(offline.destination);
      src.start(0);
    }
    const mixed = await offline.startRendering();
    const data = mixed.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
    if (peak > 0.01 && peak > 0.95) {
      const scale = 0.95 / peak;
      for (let i = 0; i < data.length; i++) data[i]! *= scale;
    }
    try {
      const { encodeMp3FromAudioBuffer } = await import("./preview-mp3-encode");
      return await encodeMp3FromAudioBuffer(mixed, {
        kbps: 128,
        fileName: "mix-preview.mp3",
      });
    } catch (e) {
      console.warn("[bakeMixPreview] mp3 encode fail → wav", e);
      const blob = encodeWavMono(mixed);
      return new File([blob], "mix-preview.wav", { type: "audio/wav" });
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * Igual que bakeMixPreview pero desde URLs (rebuild de obras ya publicadas).
 */
export async function bakeMixPreviewFromUrls(
  urls: string[],
  fetchInit?: RequestInit,
): Promise<File> {
  const files: File[] = [];
  let i = 0;
  for (const u of urls) {
    const res = await fetch(u, fetchInit);
    if (!res.ok) throw new Error(`mix_fetch_${res.status}`);
    const blob = await res.blob();
    files.push(new File([blob], `stem-${i++}.wav`, { type: blob.type || "audio/wav" }));
  }
  return bakeMixPreview(files);
}
