/**
 * Encode AudioBuffer → File MP3 (browser, lamejs).
 * P: buffer con audio. Q: File audio/mpeg o null si falla.
 */

type LameNs = {
  Mp3Encoder: new (
    channels: number,
    sampleRate: number,
    kbps: number,
  ) => {
    encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
    flush: () => Int8Array;
  };
};

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
  }
  return out;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const n = buffer.length;
  const out = new Float32Array(n);
  const ch0 = buffer.getChannelData(0);
  if (buffer.numberOfChannels === 1) {
    out.set(ch0);
    return out;
  }
  const ch1 = buffer.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out[i] = ((ch0[i] ?? 0) + (ch1[i] ?? 0)) * 0.5;
  }
  return out;
}

async function loadLame(): Promise<LameNs> {
  // CJS / UMD
  const mod = await import("lamejs");
  const lame = (mod as { default?: LameNs }).default || (mod as unknown as LameNs);
  if (!lame?.Mp3Encoder) {
    // some builds export Mp3Encoder on root
    const any = mod as unknown as { Mp3Encoder?: LameNs["Mp3Encoder"] };
    if (any.Mp3Encoder) return { Mp3Encoder: any.Mp3Encoder };
    throw new Error("lamejs_no_encoder");
  }
  return lame;
}

/**
 * @param kbps 96–128 típico preview web
 */
export async function encodeMp3FromAudioBuffer(
  buffer: AudioBuffer,
  opts?: { kbps?: number; fileName?: string },
): Promise<File> {
  const kbps = opts?.kbps ?? 128;
  const sampleRate = buffer.sampleRate;
  const mono = mixToMono(buffer);
  const samples = floatTo16BitPCM(mono);
  const lame = await loadLame();
  const encoder = new lame.Mp3Encoder(1, sampleRate, kbps);
  const block = 1152;
  const parts: BlobPart[] = [];
  for (let i = 0; i < samples.length; i += block) {
    const chunk = samples.subarray(i, Math.min(i + block, samples.length));
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) parts.push(new Int8Array(mp3buf));
  }
  const end = encoder.flush();
  if (end.length > 0) parts.push(new Int8Array(end));
  const blob = new Blob(parts, { type: "audio/mpeg" });
  if (blob.size < 64) throw new Error("mp3_empty");
  const name = opts?.fileName || "mix-preview.mp3";
  return new File([blob], name.replace(/\.wav$/i, ".mp3"), { type: "audio/mpeg" });
}
