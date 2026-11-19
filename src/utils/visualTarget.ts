import { VisualTargetSignature } from '../types/story';

const SAMPLE_W = 16;
const SAMPLE_H = 16;

let sharedSampleCanvas: HTMLCanvasElement | null = null;
let sharedThumbCanvas: HTMLCanvasElement | null = null;

function getSampleCanvas(): HTMLCanvasElement {
  if (!sharedSampleCanvas) {
    sharedSampleCanvas = document.createElement('canvas');
    sharedSampleCanvas.width = SAMPLE_W;
    sharedSampleCanvas.height = SAMPLE_H;
  }
  return sharedSampleCanvas;
}

function getThumbCanvas(): HTMLCanvasElement {
  if (!sharedThumbCanvas) {
    sharedThumbCanvas = document.createElement('canvas');
    sharedThumbCanvas.width = 56;
    sharedThumbCanvas.height = 56;
  }
  return sharedThumbCanvas;
}

/**
 * Extracts a 4x4 downsampled RGB patch + 12-bin color/chroma histogram
 * from a square crop centered at (normX, normY) on the live camera video frame.
 */
function extractSignatureAt(
  video: HTMLVideoElement,
  normX: number,
  normY: number,
  mirrorX: boolean
): { gridRgb: number[]; colorHist: number[] } | null {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropSize = Math.max(24, Math.min(vw, vh) * 0.24);

  const effectiveNormX = mirrorX ? 1 - normX : normX;
  const cx = Math.max(cropSize * 0.5, Math.min(vw - cropSize * 0.5, effectiveNormX * vw));
  const cy = Math.max(cropSize * 0.5, Math.min(vh - cropSize * 0.5, normY * vh));
  const sx = cx - cropSize * 0.5;
  const sy = cy - cropSize * 0.5;

  const canvas = getSampleCanvas();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, SAMPLE_W, SAMPLE_H);
  if (mirrorX) {
    ctx.save();
    ctx.translate(SAMPLE_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, SAMPLE_W, SAMPLE_H);
    ctx.restore();
  } else {
    ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, SAMPLE_W, SAMPLE_H);
  }

  const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

  // 4x4 spatial average RGB cells (16 cells * 3 channels = 48 ints)
  const gridRgb = new Array<number>(48).fill(0);
  const cellCounts = new Array<number>(16).fill(0);
  // 12 bins: 6 hue/color bins + 3 luminance bins + 3 R/G/B dominance ratios
  const hist = new Array<number>(12).fill(0);

  for (let y = 0; y < SAMPLE_H; y++) {
    const gy = Math.min(3, Math.floor(y / 4));
    for (let x = 0; x < SAMPLE_W; x++) {
      const gx = Math.min(3, Math.floor(x / 4));
      const idx = (y * SAMPLE_W + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const cellIdx = gy * 4 + gx;
      gridRgb[cellIdx * 3] += r;
      gridRgb[cellIdx * 3 + 1] += g;
      gridRgb[cellIdx * 3 + 2] += b;
      cellCounts[cellIdx] += 1;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const delta = maxC - minC;
      const lum = (r + g + b) / 3;

      if (delta < 18) {
        // Low saturation: map to luminance bins (6, 7, 8)
        const lBin = lum < 85 ? 6 : lum < 170 ? 7 : 8;
        hist[lBin] += 1;
      } else {
        // Compute hue 0..6
        let hue = 0;
        if (maxC === r) hue = ((g - b) / delta + 6) % 6;
        else if (maxC === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        const hBin = Math.min(5, Math.max(0, Math.floor(hue)));
        hist[hBin] += 1;
      }

      const sumC = r + g + b + 1;
      hist[9] += r / sumC;
      hist[10] += g / sumC;
      hist[11] += b / sumC;
    }
  }

  for (let c = 0; c < 16; c++) {
    const cnt = cellCounts[c] || 1;
    gridRgb[c * 3] = Math.round(gridRgb[c * 3] / cnt);
    gridRgb[c * 3 + 1] = Math.round(gridRgb[c * 3 + 1] / cnt);
    gridRgb[c * 3 + 2] = Math.round(gridRgb[c * 3 + 2] / cnt);
  }

  const totalPx = SAMPLE_W * SAMPLE_H;
  for (let i = 0; i < 12; i++) {
    hist[i] = Math.round((hist[i] / totalPx) * 1000) / 1000;
  }

  return { gridRgb, colorHist: hist };
}

/**
 * Captures the center-reticle visual signature + crisp 56x56 thumbnail
 * when the user pins a message at an exact leaf/object/wall spot.
 */
export function captureCenterTargetSignature(
  video: HTMLVideoElement | null,
  mirrorX = false
): VisualTargetSignature | null {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  const sig = extractSignatureAt(video, 0.5, 0.5, mirrorX);
  if (!sig) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropSize = Math.max(32, Math.min(vw, vh) * 0.24);
  const sx = vw * 0.5 - cropSize * 0.5;
  const sy = vh * 0.5 - cropSize * 0.5;

  const tCanvas = getThumbCanvas();
  const tCtx = tCanvas.getContext('2d', { willReadFrequently: true });
  let thumbnailDataUrl: string | undefined;
  let ghostOutlineDataUrl: string | undefined;
  if (tCtx) {
    tCtx.clearRect(0, 0, 56, 56);
    if (mirrorX) {
      tCtx.save();
      tCtx.translate(56, 0);
      tCtx.scale(-1, 1);
      tCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 56, 56);
      tCtx.restore();
    } else {
      tCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 56, 56);
    }
    thumbnailDataUrl = tCanvas.toDataURL('image/jpeg', 0.62);

    // Extract translucent Wall Ghost Edge Outline via lightweight Sobel gradient
    try {
      const srcImg = tCtx.getImageData(0, 0, 56, 56);
      const sd = srcImg.data;
      const gCanvas = document.createElement('canvas');
      gCanvas.width = 56;
      gCanvas.height = 56;
      const gCtx = gCanvas.getContext('2d');
      if (gCtx) {
        const outImg = gCtx.createImageData(56, 56);
        const od = outImg.data;
        const luma = (x: number, y: number) => {
          const i = (y * 56 + x) * 4;
          return sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114;
        };
        for (let y = 1; y < 55; y++) {
          for (let x = 1; x < 55; x++) {
            const gx =
              -luma(x - 1, y - 1) -
              2 * luma(x - 1, y) -
              luma(x - 1, y + 1) +
              luma(x + 1, y - 1) +
              2 * luma(x + 1, y) +
              luma(x + 1, y + 1);
            const gy =
              -luma(x - 1, y - 1) -
              2 * luma(x, y - 1) -
              luma(x + 1, y - 1) +
              luma(x - 1, y + 1) +
              2 * luma(x, y + 1) +
              luma(x + 1, y + 1);
            const mag = Math.sqrt(gx * gx + gy * gy);
            const idx = (y * 56 + x) * 4;
            if (mag > 68) {
              const alpha = Math.min(220, Math.round((mag - 68) * 1.45));
              od[idx] = 245;
              od[idx + 1] = 205;
              od[idx + 2] = 88;
              od[idx + 3] = alpha;
            }
          }
        }
        gCtx.putImageData(outImg, 0, 0);
        ghostOutlineDataUrl = gCanvas.toDataURL('image/png');
      }
    } catch {
      // ignore if canvas pixel read unavailable
    }
  }

  return {
    thumbnailDataUrl,
    ghostOutlineDataUrl,
    gridRgb: sig.gridRgb,
    colorHist: sig.colorHist,
  };
}

/**
 * Samples the live camera frame at a projected normalized screen position (0..1, 0..1)
 * and compares it against the stored target signature. Returns a score in [0, 1].
 */
export function matchVisualTargetAt(
  video: HTMLVideoElement | null,
  stored: VisualTargetSignature,
  normX: number,
  normY: number,
  mirrorX = false
): number {
  if (!video || video.readyState < 2) return 0;
  if (normX < 0.05 || normX > 0.95 || normY < 0.05 || normY > 0.95) return 0;

  const live = extractSignatureAt(video, normX, normY, mirrorX);
  if (!live) return 0;

  // 1. Histogram intersection / cosine similarity (bins 0..8) + RGB channel ratios (bins 9..11)
  let histDot = 0;
  let histNormA = 0;
  let histNormB = 0;
  for (let i = 0; i < 12; i++) {
    const a = stored.colorHist[i] || 0;
    const b = live.colorHist[i] || 0;
    histDot += a * b;
    histNormA += a * a;
    histNormB += b * b;
  }
  const histSim =
    histNormA > 0 && histNormB > 0 ? histDot / Math.sqrt(histNormA * histNormB) : 0;

  // 2. Brightness-compensated 4x4 spatial RGB similarity
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < 48; i++) {
    meanA += stored.gridRgb[i] || 0;
    meanB += live.gridRgb[i] || 0;
  }
  meanA /= 48;
  meanB /= 48;
  const scale = meanB > 8 ? meanA / meanB : 1;

  let diffSum = 0;
  for (let i = 0; i < 48; i++) {
    const a = stored.gridRgb[i] || 0;
    const b = Math.min(255, (live.gridRgb[i] || 0) * scale);
    diffSum += Math.abs(a - b);
  }
  const patchSim = Math.max(0, 1 - diffSum / (48 * 140));

  return Math.max(0, Math.min(1, 0.56 * histSim + 0.44 * patchSim));
}

let ghostWorkCanvas: HTMLCanvasElement | null = null;

/**
 * Renders a subtle translucent golden-cyan Sobel edge outline of whatever wall/temple/object
 * sits directly behind the center golden dot in Pin Mode (no boxes, pure organic wall contours).
 */
export function renderCenterGhostOutline(
  video: HTMLVideoElement | null,
  destCanvas: HTMLCanvasElement | null,
  mirrorX = false
): void {
  if (!video || !destCanvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return;
  }
  const size = 64;
  if (!ghostWorkCanvas) {
    ghostWorkCanvas = document.createElement('canvas');
    ghostWorkCanvas.width = size;
    ghostWorkCanvas.height = size;
  }
  const wCtx = ghostWorkCanvas.getContext('2d', { willReadFrequently: true });
  const dCtx = destCanvas.getContext('2d');
  if (!wCtx || !dCtx) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const crop = Math.max(40, Math.min(vw, vh) * 0.28);
  const sx = vw * 0.5 - crop * 0.5;
  const sy = vh * 0.5 - crop * 0.5;

  wCtx.clearRect(0, 0, size, size);
  if (mirrorX) {
    wCtx.save();
    wCtx.translate(size, 0);
    wCtx.scale(-1, 1);
    wCtx.drawImage(video, sx, sy, crop, crop, 0, 0, size, size);
    wCtx.restore();
  } else {
    wCtx.drawImage(video, sx, sy, crop, crop, 0, 0, size, size);
  }

  const src = wCtx.getImageData(0, 0, size, size).data;
  const out = dCtx.createImageData(size, size);
  const od = out.data;

  const luma = (x: number, y: number) => {
    const idx = (y * size + x) * 4;
    return src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114;
  };

  const half = size * 0.5;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      // Radial soft circular mask so edges fade organically with zero square corners
      const distNorm = Math.hypot(x - half, y - half) / (half - 2);
      if (distNorm >= 1) continue;
      const radialFade = Math.max(0, 1 - distNorm * distNorm);

      const gx =
        -luma(x - 1, y - 1) -
        2 * luma(x - 1, y) -
        luma(x - 1, y + 1) +
        luma(x + 1, y - 1) +
        2 * luma(x + 1, y) +
        luma(x + 1, y + 1);
      const gy =
        -luma(x - 1, y - 1) -
        2 * luma(x, y - 1) -
        luma(x + 1, y - 1) +
        luma(x - 1, y + 1) +
        2 * luma(x, y + 1) +
        luma(x + 1, y + 1);
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 64) {
        const idx = (y * size + x) * 4;
        const alpha = Math.min(200, Math.round((mag - 64) * 1.35 * radialFade));
        od[idx] = 245;
        od[idx + 1] = 204;
        od[idx + 2] = 82;
        od[idx + 3] = alpha;
      }
    }
  }
  dCtx.putImageData(out, 0, 0);
}
