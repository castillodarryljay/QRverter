import QRCode from 'qrcode';
import { QRConfig } from '../types/index.ts';

// Helper: draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  config: QRConfig,
  customLogoImg?: HTMLImageElement | null
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const qrSize = config.size;
  const padding = Math.max(16, Math.round(qrSize * 0.06));
  const bannerH = config.includeBanner && config.bannerText.trim() ? Math.round(qrSize * 0.16) : 0;
  const totalW = qrSize + padding * 2;
  const totalH = qrSize + padding * 2 + bannerH;

  // Use scale for crisp rendering
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = totalW * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width = `${totalW}px`;
  canvas.style.height = `${totalH}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Generate QR code raw offscreen canvas
  const offscreen = document.createElement('canvas');
  await QRCode.toCanvas(offscreen, text || 'https://vidqr.studio', {
    errorCorrectionLevel: config.errorCorrectionLevel,
    margin: 1,
    width: qrSize,
    color: {
      dark: config.fgColor,
      light: config.bgColor,
    },
  });

  // 1. Fill card background
  ctx.clearRect(0, 0, totalW, totalH);
  ctx.fillStyle = config.bgColor;
  drawRoundedRect(ctx, 0, 0, totalW, totalH, 20);
  ctx.fill();

  // 2. Draw QR code
  ctx.drawImage(offscreen, padding, padding, qrSize, qrSize);

  // 3. Draw Center Logo / Overlay
  if (config.logoMode !== 'none') {
    const cx = padding + qrSize / 2;
    const cy = padding + qrSize / 2;
    const logoBox = Math.round(qrSize * 0.22);
    const half = logoBox / 2;

    ctx.save();
    // Background cushion
    ctx.fillStyle = config.bgColor;
    drawRoundedRect(ctx, cx - half - 4, cy - half - 4, logoBox + 8, logoBox + 8, 14);
    ctx.fill();

    if (config.logoMode === 'play') {
      // Accent play badge
      ctx.fillStyle = config.fgColor;
      drawRoundedRect(ctx, cx - half, cy - half, logoBox, logoBox, 10);
      ctx.fill();

      // Play triangle
      ctx.fillStyle = config.bgColor;
      ctx.beginPath();
      const t = logoBox * 0.26;
      ctx.moveTo(cx - t * 0.6, cy - t);
      ctx.lineTo(cx - t * 0.6, cy + t);
      ctx.lineTo(cx + t * 1.1, cy);
      ctx.closePath();
      ctx.fill();
    } else if (config.logoMode === 'youtube') {
      // YouTube pill
      ctx.fillStyle = '#ef4444';
      const pillH = logoBox * 0.8;
      drawRoundedRect(ctx, cx - half, cy - pillH / 2, logoBox, pillH, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const t = logoBox * 0.22;
      ctx.moveTo(cx - t * 0.6, cy - t);
      ctx.lineTo(cx - t * 0.6, cy + t);
      ctx.lineTo(cx + t, cy);
      ctx.closePath();
      ctx.fill();
    } else if (config.logoMode === 'video') {
      // Camera icon badge
      ctx.fillStyle = config.fgColor;
      drawRoundedRect(ctx, cx - half, cy - half, logoBox, logoBox, 10);
      ctx.fill();

      ctx.fillStyle = config.bgColor;
      const camW = logoBox * 0.44;
      const camH = logoBox * 0.36;
      drawRoundedRect(ctx, cx - camW * 0.72, cy - camH / 2, camW, camH, 4);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + camW * 0.32, cy);
      ctx.lineTo(cx + camW * 0.78, cy - camH * 0.45);
      ctx.lineTo(cx + camW * 0.78, cy + camH * 0.45);
      ctx.closePath();
      ctx.fill();
    } else if (config.logoMode === 'custom' && customLogoImg) {
      drawRoundedRect(ctx, cx - half, cy - half, logoBox, logoBox, 10);
      ctx.clip();
      ctx.drawImage(customLogoImg, cx - half, cy - half, logoBox, logoBox);
    }
    ctx.restore();
  }

  // 4. Draw Call-to-Action Banner if enabled
  if (config.includeBanner && config.bannerText.trim()) {
    const pillX = padding + 4;
    const pillY = padding + qrSize + 4;
    const pillW = totalW - pillX * 2;
    const pillH = bannerH - 8;

    ctx.save();
    ctx.fillStyle = config.fgColor;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 10);
    ctx.fill();

    ctx.fillStyle = config.bgColor;
    const fontSize = Math.max(12, Math.round(qrSize * 0.046));
    ctx.font = `700 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.bannerText.trim().toUpperCase(), totalW / 2, pillY + pillH / 2 + 1);
    ctx.restore();
  }
}

export async function exportQRAsSVG(text: string, config: QRConfig): Promise<string> {
  const qrData = QRCode.create(text || 'https://vidqr.studio', {
    errorCorrectionLevel: config.errorCorrectionLevel,
  });

  const moduleCount = qrData.modules.size;
  const size = config.size;
  const padding = Math.max(16, Math.round(size * 0.06));
  const bannerH = config.includeBanner && config.bannerText.trim() ? Math.round(size * 0.16) : 0;
  const totalW = size + padding * 2;
  const totalH = size + padding * 2 + bannerH;
  const cellSize = size / moduleCount;

  let rects = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qrData.modules.get(r, c)) {
        const x = (padding + c * cellSize).toFixed(2);
        const y = (padding + r * cellSize).toFixed(2);
        const w = (cellSize + 0.35).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${config.fgColor}"/>`;
      }
    }
  }

  let centerLogoSvg = '';
  if (config.logoMode === 'play' || config.logoMode === 'youtube') {
    const cx = totalW / 2;
    const cy = padding + size / 2;
    const box = Math.round(size * 0.22);
    const badgeFill = config.logoMode === 'youtube' ? '#ef4444' : config.fgColor;
    const triFill = config.logoMode === 'youtube' ? '#ffffff' : config.bgColor;
    const t = box * 0.25;

    centerLogoSvg = `
      <rect x="${cx - box / 2 - 4}" y="${cy - box / 2 - 4}" width="${box + 8}" height="${box + 8}" rx="14" fill="${config.bgColor}"/>
      <rect x="${cx - box / 2}" y="${cy - box / 2}" width="${box}" height="${box}" rx="10" fill="${badgeFill}"/>
      <polygon points="${cx - t * 0.6},${cy - t} ${cx - t * 0.6},${cy + t} ${cx + t},${cy}" fill="${triFill}"/>
    `;
  }

  let bannerSvg = '';
  if (config.includeBanner && config.bannerText.trim()) {
    const pillX = padding + 4;
    const pillY = padding + size + 4;
    const pillW = totalW - pillX * 2;
    const pillH = bannerH - 8;
    const fontSize = Math.max(12, Math.round(size * 0.046));

    bannerSvg = `
      <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="10" fill="${config.fgColor}"/>
      <text x="${totalW / 2}" y="${pillY + pillH / 2 + fontSize * 0.35}" text-anchor="middle" fill="${config.bgColor}" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="${fontSize}">
        ${config.bannerText.trim().toUpperCase().replace(/[<>&"']/g, '')}
      </text>
    `;
  }

  return `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="100%" height="100%" rx="20" fill="${config.bgColor}"/>
  ${rects}
  ${centerLogoSvg}
  ${bannerSvg}
</svg>`;
}
