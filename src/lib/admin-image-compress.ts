/**
 * Comprime imágenes en el navegador ANTES de subir a admin (biblioteca / productos / feed).
 * Objetivo: peso mínimo para grid/web, sin depender de sharp en el Worker.
 *
 * - maxEdge 480 (covers) / 720 (galería producto)
 * - JPEG o WebP q~0.78
 * - GIF se deja (animación)
 * - Si el resultado no es más pequeño, se conserva el original
 */

export type CompressImageOpts = {
  /** Lado mayor en px (default 480). */
  maxEdge?: number;
  /** 0–1 (default 0.78). */
  quality?: number;
  /** Preferir webp si el navegador lo soporta (default true). */
  preferWebp?: boolean;
  /** No tocar GIF (default true). */
  preserveGif?: boolean;
  /** Si el archivo ya es ≤ este tamaño y cabe en maxEdge, no re-encodar (default 48_000). */
  skipIfUnderBytes?: number;
};

function isGif(file: File): boolean {
  return file.type === "image/gif" || /\.gif$/i.test(file.name);
}

async function blobSupportsType(type: string): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 2;
  return new Promise((resolve) => {
    c.toBlob((b) => resolve(!!b && b.type === type), type, 0.5);
  });
}

/**
 * P: file es imagen. Q: File optimizado (o el mismo si GIF / ya ligero / fallo).
 */
export async function compressImageForUpload(
  file: File,
  opts: CompressImageOpts = {},
): Promise<File> {
  if (!(file instanceof File) || !file.size) return file;
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return file;
  }

  const maxEdge = opts.maxEdge ?? 360;
  const quality = opts.quality ?? 0.72;
  const preserveGif = opts.preserveGif !== false;
  const skipIfUnder = opts.skipIfUnderBytes ?? 48_000;
  const preferWebp = opts.preferWebp !== false;

  if (preserveGif && isGif(file)) return file;

  try {
    const bmp = await createImageBitmap(file);
    const srcW = bmp.width;
    const srcH = bmp.height;
    const long = Math.max(srcW, srcH);

    // Ya es mini y ligero
    if (long <= maxEdge && file.size <= skipIfUnder) {
      bmp.close?.();
      return file;
    }

    const scale = Math.min(1, maxEdge / long);
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close?.();
      return file;
    }
    // Fondo opaco (JPEG no tiene alpha) — evita basura negra rara en PNG
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();

    let mime = "image/jpeg";
    let ext = "jpg";
    if (preferWebp && (await blobSupportsType("image/webp"))) {
      mime = "image/webp";
      ext = "webp";
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality),
    );
    if (!blob || blob.size === 0) return file;

    // Si no mejora, no empeorar (p.ej. PNG minúsculo → JPEG más gordo)
    if (blob.size >= file.size * 0.98 && long <= maxEdge) return file;
    if (blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Varias imágenes (galería producto). */
export async function compressImagesForUpload(
  files: File[],
  opts?: CompressImageOpts,
): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    out.push(await compressImageForUpload(f, opts));
  }
  return out;
}
