import type { MantineColorsTuple } from '@mantine/core';
import { getColorPalette } from './palettes';

function buildFaviconSvg(palette: MantineColorsTuple): string {
  const bg = palette[8];
  const fg = palette[0];
  const accent = palette[9];
  const line = palette[7];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="1" y="1" width="30" height="30" rx="7" fill="${bg}"/>
  <rect x="8" y="9" width="16" height="18" rx="2" fill="${fg}" opacity="0.95"/>
  <rect x="12" y="6" width="8" height="5" rx="1.5" fill="${accent}"/>
  <rect x="13.5" y="7.5" width="5" height="2" rx="1" fill="${fg}"/>
  <rect x="11" y="14" width="2.5" height="2.5" rx="0.5" fill="${bg}"/>
  <path d="M11.3 15.4 L12 16 L13.2 14.5" stroke="${fg}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="15" y="14.5" width="6.5" height="1.5" rx="0.75" fill="${line}" opacity="0.5"/>
  <rect x="11" y="18" width="2.5" height="2.5" rx="0.5" fill="${bg}"/>
  <path d="M11.3 19.4 L12 20 L13.2 18.5" stroke="${fg}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="15" y="18.5" width="5" height="1.5" rx="0.75" fill="${line}" opacity="0.5"/>
  <rect x="11" y="22" width="2.5" height="2.5" rx="0.5" stroke="${bg}" stroke-width="0.6" fill="none"/>
  <rect x="15" y="22.5" width="7" height="1.5" rx="0.75" fill="${line}" opacity="0.3"/>
</svg>`;
}

export function setDynamicFavicon(mainColor: string, faviconUrl?: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }

  if (faviconUrl) {
    link.href = faviconUrl;
  } else {
    const palette = getColorPalette(mainColor);
    const svg = buildFaviconSvg(palette);
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}

export function setDynamicDocumentTitle(appName?: string): void {
  if (appName) {
    document.title = appName;
  }
}

export function setDynamicThemeColor(mainColor: string): void {
  const palette = getColorPalette(mainColor);
  const color = palette[8];

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function setDynamicManifest(options: {
  name: string;
  description?: string;
  mainColor: string;

  pwaIcon192Url?: string;

  pwaIcon512Url?: string;

  pwaIconMaskableUrl?: string;
}): void {
  const palette = getColorPalette(options.mainColor);
  const themeColor = palette[8];
  const backgroundColor = palette[0];

  const origin = window.location.origin;
  const toAbsolute = (path: string) =>
    path.startsWith('http') ? path : `${origin}/${path.replace(/^\//, '')}`;

  const icon192 = toAbsolute(options.pwaIcon192Url || 'pwa-192x192.png');
  const icon512 = toAbsolute(options.pwaIcon512Url || 'pwa-512x512.png');
  const iconMaskable = toAbsolute(options.pwaIconMaskableUrl || 'maskable-icon-512x512.png');

  const manifest: Record<string, unknown> = {
    name: options.name,
    short_name: options.name,
    description: options.description || options.name,
    start_url: origin + '/',
    display: 'standalone',
    orientation: 'portrait',
    scope: origin + '/',
    lang: 'en',
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      { src: toAbsolute('pwa-64x64.png'), sizes: '64x64', type: 'image/png' },
      { src: icon192, sizes: '192x192', type: 'image/png' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconMaskable, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const existingLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (existingLink) {
    if (existingLink.href.startsWith('blob:')) {
      URL.revokeObjectURL(existingLink.href);
    }
    existingLink.href = url;
  } else {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  }

  let appleTitleMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  );
  if (!appleTitleMeta) {
    appleTitleMeta = document.createElement('meta');
    appleTitleMeta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(appleTitleMeta);
  }
  appleTitleMeta.content = options.name;

  let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.setAttribute('sizes', '180x180');
    document.head.appendChild(appleIcon);
  }
  if (options.pwaIcon192Url) {
    appleIcon.href = options.pwaIcon192Url;
  }
}
