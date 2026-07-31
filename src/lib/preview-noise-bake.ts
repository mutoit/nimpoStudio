/**
 * Preview de biblioteca: UNA copia de trabajo (mix) a partir de stems HQ locales.
 * Los originales no se modifican en disco/R2 — solo se leen para generar el mix.
 *
 * Salida: mono @ 22.05 kHz, MP3 preferido (ligero para grid/modal).
 * Ruido: un solo bus (como admin Escuchar), no por capa.
 */

/** Sample rate del preview público (no de los stems de entrega). */
const PREVIEW_SAMPLE_RATE = 22050;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWavMono(buffer: AudioBuffer): Blob {
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const ch0 = buffer.getChannelData(0);
  const dataSize = numFrames * 2;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    let s = ch0[i] ?? 0;
    s = Math.max(-1, Math.min(1, s));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}

/** Mid multi-canal → mono (solo en la copia de trabajo del preview). */
function toMonoBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const n = buffer.length;
  const nCh = buffer.numberOfChannels;
  const mono = ctx.createBuffer(1, n, buffer.sampleRate);
  const out = mono.getChannelData(0);
  if (nCh === 1) {
    out.set(buffer.getChannelData(0));
    return mono;
  }
  const chans: Float32Array[] = [];
  for (let c = 0; c < nCh; c++) chans.push(buffer.getChannelData(c));
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let c = 0; c < nCh; c++) sum += chans[c]![i] ?? 0;
    out[i] = sum / nCh;
  }
  return mono;
}

/**
 * Genera el único audio de biblioteca: mezcla de stems + ruido opcional → MP3/WAV ligero.
 * P: files HQ decodificables (no se mutan).
 * Q: 1 File preview (audio/mpeg o audio/wav).
 */
export async function bakeLibraryPreview(
  files: File[],
  noise01 = 0.12,
  music01 = 1,
): Promise<File> {
  const list = files.filter((f) => f instanceof File && f.size > 0);
  if (!list.length) throw new Error("bake_preview_empty");

  const nLevel = Math.max(0, Math.min(1, noise01));
  const mLevel = Math.max(0, Math.min(1, music01));

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

    for (const buf of decoded) {
      const mono = toMonoBuffer(offline, buf);
      const src = offline.createBufferSource();
      src.buffer = mono;
      const g = offline.createGain();
      g.gain.value = mLevel;
      src.connect(g);
      g.connect(offline.destination);
      src.start(0);
    }

    if (nLevel >= 0.005) {
      const noiseBuf = offline.createBuffer(1, frames, targetRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noiseSrc = offline.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const noiseGain = offline.createGain();
      // Un bus de ruido (igual que admin Escuchar), no por stem
      noiseGain.gain.value = nLevel * 0.22;
      noiseSrc.connect(noiseGain);
      noiseGain.connect(offline.destination);
      noiseSrc.start(0);
    }

    const mixed = await offline.startRendering();
    const data = mixed.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
    if (peak > 0.01) {
      const scale = 0.95 / peak;
      for (let i = 0; i < data.length; i++) data[i]! *= scale;
    }

    try {
      const { encodeMp3FromAudioBuffer } = await import("./preview-mp3-encode");
      return await encodeMp3FromAudioBuffer(mixed, {
        kbps: 128,
        fileName: "library-preview.mp3",
      });
    } catch (e) {
      console.warn("[bakeLibraryPreview] mp3 → wav", e);
      return new File([encodeWavMono(mixed)], "library-preview.wav", {
        type: "audio/wav",
      });
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** @deprecated alias — usar bakeLibraryPreview */
export async function bakeMixPreview(files: File[]): Promise<File> {
  return bakeLibraryPreview(files, 0, 1);
}

/**
 * Mix preview desde URLs (rebuild admin). Preferir /admin/media?key= para stems privados.
 */
export async function bakeLibraryPreviewFromUrls(
  urls: string[],
  opts?: { noise01?: number; music01?: number; fetchInit?: RequestInit },
): Promise<File> {
  const files: File[] = [];
  let i = 0;
  for (const u of urls) {
    const res = await fetch(u, opts?.fetchInit);
    if (!res.ok) throw new Error(`mix_fetch_${res.status}`);
    const blob = await res.blob();
    files.push(new File([blob], `stem-${i++}.wav`, { type: blob.type || "audio/wav" }));
  }
  return bakeLibraryPreview(files, opts?.noise01 ?? 0.12, opts?.music01 ?? 1);
}

/** @deprecated */
export async function bakeMixPreviewFromUrls(
  urls: string[],
  fetchInit?: RequestInit,
): Promise<File> {
  return bakeLibraryPreviewFromUrls(urls, { noise01: 0, music01: 1, fetchInit });
}

/**
 * @deprecated Ya no se bakea por stem. Se mantiene stub por si hay imports residuales.
 * Preferir bakeLibraryPreview.
 */
export async function bakePreviewNoise(
  file: File,
  _noise01: number,
  _music01 = 1,
  _layerCount = 1,
): Promise<File> {
  console.warn("[bakePreviewNoise] deprecated — use bakeLibraryPreview");
  return bakeLibraryPreview([file], 0, 1);
}
