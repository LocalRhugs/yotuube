/**
 * Browser-side image compressor + smart resizer.
 * Uses canvas to resize/re-encode images so they fit platform limits.
 *
 * Platform presets:
 *  - twitter:    max 5 MB, max 4096px any side, JPEG q 0.85
 *  - facebook:   max 4 MB, max 2048px,         JPEG q 0.85
 *  - instagram:  max 4 MB, max 1080px square-ish, JPEG q 0.85
 *  - threads:    max 8 MB, max 1440px, JPEG q 0.85
 *  - generic:    max 5 MB, max 2048px, JPEG q 0.85
 */

export type CompressPreset = "twitter" | "facebook" | "instagram" | "threads" | "generic";

interface PresetCfg {
  maxBytes: number;
  maxDim: number;
  quality: number;
}

const PRESETS: Record<CompressPreset, PresetCfg> = {
  twitter:   { maxBytes: 5 * 1024 * 1024, maxDim: 4096, quality: 0.85 },
  facebook:  { maxBytes: 4 * 1024 * 1024, maxDim: 2048, quality: 0.85 },
  instagram: { maxBytes: 4 * 1024 * 1024, maxDim: 1440, quality: 0.85 },
  threads:   { maxBytes: 8 * 1024 * 1024, maxDim: 1440, quality: 0.85 },
  generic:   { maxBytes: 5 * 1024 * 1024, maxDim: 2048, quality: 0.85 },
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), type, quality);
  });

/**
 * Compress + smart-resize an image for a target platform.
 * Returns the original file if it already fits the preset.
 */
export async function compressImage(file: File, preset: CompressPreset = "generic"): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // skip animated GIFs
  const cfg = PRESETS[preset];

  // Already small enough? Skip.
  if (file.size <= cfg.maxBytes) {
    // Still check dimensions
    try {
      const img = await loadImage(file);
      if (img.width <= cfg.maxDim && img.height <= cfg.maxDim) return file;
      return await resizeAndEncode(img, file.name, cfg);
    } catch { return file; }
  }

  const img = await loadImage(file);
  return resizeAndEncode(img, file.name, cfg);
}

async function resizeAndEncode(img: HTMLImageElement, name: string, cfg: PresetCfg): Promise<File> {
  let { width, height } = img;
  const scale = Math.min(1, cfg.maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  // Iteratively reduce quality if still too large.
  let q = cfg.quality;
  let blob = await canvasToBlob(canvas, "image/jpeg", q);
  while (blob.size > cfg.maxBytes && q > 0.4) {
    q -= 0.1;
    blob = await canvasToBlob(canvas, "image/jpeg", q);
  }

  // If still too large, resize down further.
  let curW = width, curH = height;
  while (blob.size > cfg.maxBytes && Math.max(curW, curH) > 480) {
    curW = Math.round(curW * 0.85);
    curH = Math.round(curH * 0.85);
    canvas.width = curW;
    canvas.height = curH;
    ctx.drawImage(img, 0, 0, curW, curH);
    blob = await canvasToBlob(canvas, "image/jpeg", q);
  }

  const base = name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/** Compute a SHA-256 hash of a file (hex). Used for duplicate-upload guard. */
export async function fileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
