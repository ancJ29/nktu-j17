import QRCode from 'qrcode';
import { theme } from '@/theme';
import type { MantineTheme } from '@mantine/core';
import { DEFAULT_THEME } from '@mantine/core';
import { getThemeColor } from '@credo/base-ui/utils';

export async function generateQRCodeWithLogo(link: string) {
  const mergedTheme = {
    ...DEFAULT_THEME,
    colors: { ...DEFAULT_THEME.colors, ...theme.colors },
  } as MantineTheme;
  const brandColor = getThemeColor(mergedTheme, 'primary.8');

  const qrDataUrl = await QRCode.toDataURL(link, {
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: brandColor,
      light: '#ffffff',
    },
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  const qrImage = document.createElement('img');
  qrImage.src = qrDataUrl;
  await new Promise<void>((resolve) => {
    qrImage.addEventListener('load', () => {
      resolve();
    });
  });

  canvas.width = qrImage.width;
  canvas.height = qrImage.height;

  ctx.drawImage(qrImage, 0, 0);

  const logoSize = Math.floor(canvas.width * 0.2);
  const logoX = (canvas.width - logoSize) / 2;
  const logoY = (canvas.height - logoSize) / 2;

  ctx.fillStyle = 'white';
  ctx.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);

  const logoSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"`,
    ` fill="none" stroke="${brandColor}" stroke-width="1.5"`,
    ` stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M4 7v-1a2 2 0 0 1 2 -2h2"/>`,
    `<path d="M4 17v1a2 2 0 0 0 2 2h2"/>`,
    `<path d="M16 4h2a2 2 0 0 1 2 2v1"/>`,
    `<path d="M16 20h2a2 2 0 0 0 2 -2v-1"/>`,
    `<path d="M5 12l14 0"/>`,
    `</svg>`,
  ].join('');
  const logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`;
  const logoImage = document.createElement('img');
  logoImage.src = logoDataUrl;
  await new Promise<void>((resolve, reject) => {
    logoImage.addEventListener('load', () => resolve());
    logoImage.addEventListener('error', () => reject(new Error('Failed to render logo SVG')));
  });
  ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

  return canvas.toDataURL();
}
