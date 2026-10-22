import type { CredoAppConfig } from '../schema';

export const LOGO_FIELDS = [
  {
    key: 'logoUrl',
    label: 'Logo (light background)',
    hint: 'Auth pages; the header too when no dark variant is set.',
  },
  {
    key: 'logoDarkBgUrl',
    label: 'Logo (dark background)',
    hint: 'Header / navbar. Falls back to the light logo, then /logo-white.svg.',
  },
  {
    key: 'faviconUrl',
    label: 'Favicon',
    hint: 'Browser tab. Empty ⇒ generated from the brand palette.',
  },
  {
    key: 'pwaIcon192Url',
    label: 'PWA icon 192',
    hint: 'Manifest 192x192, also the apple-touch-icon.',
  },
  { key: 'pwaIcon512Url', label: 'PWA icon 512', hint: 'Manifest 512x512, purpose "any".' },
  {
    key: 'pwaIconMaskableUrl',
    label: 'PWA icon maskable',
    hint: 'Manifest 512x512, purpose "maskable".',
  },
] as const satisfies readonly { key: keyof CredoAppConfig['app']; label: string; hint: string }[];

export type LogoField = (typeof LOGO_FIELDS)[number]['key'];

export const emptyLogos = (): Record<LogoField, string> =>
  Object.fromEntries(LOGO_FIELDS.map((f) => [f.key, ''])) as Record<LogoField, string>;

export const readLogos = (config: CredoAppConfig | null): Record<LogoField, string> =>
  Object.fromEntries(LOGO_FIELDS.map((f) => [f.key, config?.app?.[f.key] ?? ''])) as Record<
    LogoField,
    string
  >;

export const applyLogos = (
  storedApp: CredoAppConfig['app'] | undefined,
  logos: Record<LogoField, string>,
  fallbackName: string,
): CredoAppConfig['app'] => {
  const app = {
    ...(storedApp ?? {}),

    name: storedApp?.name ?? fallbackName,
  } satisfies CredoAppConfig['app'];
  for (const field of LOGO_FIELDS) {
    const value = logos[field.key].trim();
    if (value) app[field.key] = value;
    else delete app[field.key];
  }
  return app;
};
