import { brandPalettes, parsePalette, PALETTE_SHADE_COUNT } from '@credo/base-ui/utils';
import type { CredoAppConfig } from '../schema';

export type ThemeForm = {
  mainColor: string;

  palette: string;
};

export type PaletteState =
  | { kind: 'empty' }
  | { kind: 'bad-json'; reason: string }
  /** Parses, but not the ten hex shades the client requires. */
  | { kind: 'off-shape'; colors: string[] }
  | { kind: 'ok'; colors: string[] };

export const formatPalette = (colors: readonly string[]): string =>
  `[\n  ${colors
    .slice(0, 5)
    .map((c) => `"${c}"`)
    .join(', ')},\n  ${colors
    .slice(5)
    .map((c) => `"${c}"`)
    .join(', ')}\n]`;

export const readPaletteState = (text: string): PaletteState => {
  if (!text.trim()) return { kind: 'empty' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { kind: 'bad-json', reason: err instanceof Error ? err.message : 'Not valid JSON' };
  }
  if (!Array.isArray(raw) || !raw.every((c) => typeof c === 'string')) {
    return { kind: 'bad-json', reason: 'Expected an array of hex color strings' };
  }
  const colors = (raw as string[]).map((c) => c.trim());
  return parsePalette(colors) ? { kind: 'ok', colors } : { kind: 'off-shape', colors };
};

export const resolvePalette = (form: ThemeForm): readonly string[] | undefined => {
  const palette = readPaletteState(form.palette);
  return palette.kind === 'ok' ? palette.colors : brandPalettes[form.mainColor];
};

export const readTheme = (config: CredoAppConfig | null): ThemeForm => ({
  mainColor: config?.themeConfig?.mainColor ?? '',
  palette: config?.themeConfig?.customPalette
    ? formatPalette(config.themeConfig.customPalette)
    : '',
});

export const applyTheme = (
  storedTheme: CredoAppConfig['themeConfig'],
  form: ThemeForm,
): CredoAppConfig['themeConfig'] => {
  const theme = { ...(storedTheme ?? {}) };
  delete theme.mainColor;

  const palette = readPaletteState(form.palette);
  if (palette.kind === 'empty') delete theme.customPalette;
  else if (palette.kind !== 'bad-json') theme.customPalette = palette.colors;

  if (!form.mainColor) return Object.keys(theme).length > 0 ? theme : undefined;
  theme.mainColor = form.mainColor;
  return theme;
};

export const themeRejection = (form: ThemeForm): string | null => {
  if (!form.mainColor) return null;
  if (!brandPalettes[form.mainColor]) {
    return `"${form.mainColor}" is not one of the app's palettes.`;
  }
  if (readPaletteState(form.palette).kind === 'off-shape') {
    return `The custom palette needs exactly ${PALETTE_SHADE_COUNT} hex shades.`;
  }
  return null;
};
