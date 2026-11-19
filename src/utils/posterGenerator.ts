import { ARStory } from '../types/story';
import { formatIndianNumber } from './i18n';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.replace(/\n/g, ' \n ').split(' ');
  let line = '';
  let y = startY;
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    if (words[i] === '\n') {
      ctx.fillText(line.trim(), x, y);
      line = '';
      y += lineHeight;
      if (++linesDrawn >= maxLines) return y;
      continue;
    }
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + ' ';
      y += lineHeight;
      if (++linesDrawn >= maxLines) return y;
    } else {
      line = testLine;
    }
  }
  if (line.trim() && linesDrawn < maxLines) {
    ctx.fillText(line.trim(), x, y);
    y += lineHeight;
  }
  return y;
}

export async function generateAndDownloadReelPoster(
  card: ARStory,
  mediaSrc: string | null,
  worldRecordCount: number,
  fallbackLat: number,
  fallbackLng: number
): Promise<'shared' | 'downloaded'> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, '#040814');
  bg.addColorStop(0.5, '#0b1a42');
  bg.addColorStop(1, '#03050c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255, 240, 175, ${Math.random() * 0.75 + 0.15})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 1080, Math.random() * 1920, Math.random() * 3 + 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 6;
  ctx.strokeRect(42, 42, 996, 1836);
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, 956, 1796);

  ctx.save();
  ctx.translate(540, 130);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -45);
  ctx.bezierCurveTo(35, -45, 42, -5, 0, 45);
  ctx.bezierCurveTo(-42, -5, -35, -45, 0, -45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-26, -8);
  ctx.quadraticCurveTo(0, -30, 26, -8);
  ctx.quadraticCurveTo(0, 14, -26, -8);
  ctx.stroke();
  ctx.fillStyle = '#fff0a8';
  ctx.beginPath();
  ctx.arc(0, -8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#fff1a8';
  ctx.font = 'bold 52px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE SECRET LENS', 540, 238);

  ctx.fillStyle = '#38e8ff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('दुनिया की बोलती हुई किताब · WORLD RECORD AR', 540, 288);

  ctx.fillStyle = 'rgba(245, 197, 66, 0.18)';
  ctx.fillRect(120, 326, 840, 68);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 2;
  ctx.strokeRect(120, 326, 840, 68);
  ctx.fillStyle = '#fff4b8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`🏆 ${formatIndianNumber(worldRecordCount)}+ AR Stories Across 195 Countries`, 540, 369);

  let nextY = 445;
  const visualSrc = mediaSrc && card.mediaType !== 'video' ? mediaSrc : card.drawingData || null;
  if (visualSrc) {
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = visualSrc;
      });
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(120, nextY, 840, 470, 28);
      ctx.clip();
      ctx.fillStyle = '#07122b';
      ctx.fillRect(120, nextY, 840, 470);
      ctx.drawImage(img, 120, nextY, 840, 470);

      // Overlay transparent Neon Air-Drawing if separate photo exists
      if (mediaSrc && card.mediaType !== 'video' && card.drawingData) {
        const drawImg = await new Promise<HTMLImageElement>((res, rej) => {
          const d = new Image();
          d.onload = () => res(d);
          d.onerror = rej;
          d.src = card.drawingData!;
        });
        ctx.drawImage(drawImg, 140, nextY + 20, 800, 430);
      }

      ctx.restore();
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 4;
      ctx.strokeRect(120, nextY, 840, 470);
      nextY += 535;
    } catch {
      nextY += 40;
    }
  } else {
    nextY += 45;
  }

  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 44px sans-serif';
  nextY = wrapCanvasText(ctx, card.headline, 540, nextY, 880, 56, 3);
  nextY += 32;

  ctx.fillStyle = '#f4f7ff';
  ctx.font = '34px sans-serif';
  const excerpt = `"${card.story.slice(0, 340)}${card.story.length > 340 ? '...' : ''}"`;
  wrapCanvasText(ctx, excerpt, 540, nextY, 860, 50, 8);

  ctx.fillStyle = '#38e8ff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`✍️ ${card.author}  ·  ${card.rankBadge || '🌱 Explorer'}`, 540, 1660);

  ctx.fillStyle = '#9eb0d6';
  ctx.font = '26px Orbitron, sans-serif';
  ctx.fillText(
    `GPS: ${(card.lat || fallbackLat).toFixed(4)}° N, ${(card.lng || fallbackLng).toFixed(4)}° E · 3M PORTAL`,
    540,
    1720
  );

  ctx.fillStyle = '#fff1a8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('100% FREE HUMANITY AR ARCHIVE · STEP WITHIN 3M TO REVEAL', 540, 1805);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Poster export failed');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `secret-lens-reel-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  const file = new File([blob], 'the-secret-lens-story.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: card.headline,
        text: 'Look what I unlocked inside a 3m AR Portal on THE SECRET LENS 🌍✨',
        files: [file],
      });
      return 'shared';
    } catch {
      return 'downloaded';
    }
  }
  return 'downloaded';
}
