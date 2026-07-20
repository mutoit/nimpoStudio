/**
 * Incrusta ruido blanco en un archivo de audio de preview (solo admin, al publicar).
 * Devuelve WAV PCM 16-bit (decode en navegador; sin dependencia MP3).
 *
 * P: noise01 en [0,1], file decodificable
 * Q: File .wav con música + ruido mezclado (o original si noise≈0)
 */

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i]!));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

/**
 * @param noise01 0 = sin ruido, 0.12 típico, 1 = solo ruido
 */
export async function bakePreviewNoise(file: File, noise01: number): Promise<File> {
  const level = Math.max(0, Math.min(1, noise01));
  if (level < 0.005) return file;

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const raw = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(raw.slice(0));
    const offline = new OfflineAudioContext(
      decoded.numberOfChannels,
      decoded.length,
      decoded.sampleRate,
    );

    const src = offline.createBufferSource();
    src.buffer = decoded;
    const musicGain = offline.createGain();
    musicGain.gain.value = 1;
    src.connect(musicGain);
    musicGain.connect(offline.destination);

    // Ruido blanco en buffer del mismo length
    const noiseBuf = offline.createBuffer(1, decoded.length, decoded.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noiseSrc = offline.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseGain = offline.createGain();
    // Escala percibida: ruido a full es muy fuerte
    noiseGain.gain.value = level * 0.22;
    noiseSrc.connect(noiseGain);
    noiseGain.connect(offline.destination);

    src.start(0);
    noiseSrc.start(0);
    const mixed = await offline.startRendering();
    const blob = encodeWav(mixed);
    const base = file.name.replace(/\.[^.]+$/, "") || "preview";
    return new File([blob], `${base}-preview.wav`, { type: "audio/wav" });
  } finally {
    await ctx.close().catch(() => {});
  }
}
