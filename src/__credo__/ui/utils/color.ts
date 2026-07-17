import { hashString } from '@credo/kits/crypt';
import type { MantineColor, MantineTheme } from '@mantine/core';
import type { CredoThemeConfig } from '../types';

export function getThemeColor(theme: MantineTheme, color: MantineColor) {
  if (typeof color === 'string' && color.includes('.')) {
    const [colorName, shade] = color.split('.');
    return theme.colors[colorName]?.[parseInt(shade)] || color;
  }
  return color;
}

export function buildThemeConfig(mainColor: string): CredoThemeConfig {
  return {
    mainColor,

    auth: {
      layout: {
        bgGradientStart: 'neutral.0',
        bgGradientEnd: 'neutral.1',
      },
      button: {
        color: `var(--mantine-color-${mainColor}-7)`,
        borderColor: `var(--mantine-color-${mainColor}-7)`,
        gradientStart: `${mainColor}.7`,
        gradientEnd: `${mainColor}.9`,
      },
      link: {
        color: `${mainColor}.7`,
      },
      card: {
        borderColor: 'neutral.3',
        topGradientStart: `${mainColor}.7`,
        topGradientEnd: `${mainColor}.9`,
      },
      success: {
        iconColor: 'success.7',
      },
    },

    app: {
      header: {
        gradientStart: `${mainColor}.7`,
        gradientEnd: `${mainColor}.9`,
      },
      navbar: {
        backgroundColor: 'neutral.0',
        borderColor: 'neutral.3',
        activeGradientStart: `${mainColor}.0`,
        activeGradientEnd: `${mainColor}.1`,
        activeAccentStart: `${mainColor}.7`,
        activeAccentEnd: `${mainColor}.9`,
        activeTextColor: `${mainColor}.9`,
        iconColor: 'neutral.7',
        activeIconColor: `${mainColor}.7`,
        hoverBgColor: 'neutral.1',
      },
      main: {
        backgroundColor: 'neutral.0',
      },
    },
  };
}
export const COLORS = [
  '#158D65',
  '#B87333',
  '#C05746',
  '#9B59B6',
  '#884EA0',
  '#26619C',
  '#0A822A',
  '#6F4E37',
  '#6A0DAD',
  '#702963',
  '#8E44AD',
  '#797D45',
  '#1560BD',
  '#3FB0AC',
  '#0000FF',
  '#9A463D',
  '#E26D0E',
  '#80461B',
  '#CC7722',
  '#A31621',
  '#88540B',
  '#B68D00',
  '#0077B6',
  '#B33951',
  '#4B0082',
  '#7F1B9F',
  '#007FFF',
  '#2A9D8F',
  '#10529E',
  '#3F51B5',
  '#E67E22',
  '#2196F3',
  '#6C3483',
  '#A52A2A',
  '#4682B4',
  '#4F7942',
  '#B7410E',
  '#0B6623',
  '#635147',
  '#546E7A',
  '#673AB7',
  '#2ECC71',
  '#2BAE66',
  '#AF002A',
  '#708238',
  '#2E5BFF',
  '#40826D',
  '#3B7A57',
  '#228B22',
  '#5DADE2',
];

const colorMap = new Map<string, string>();
export function getDeterministicColor(key: string): string {
  let color = colorMap.get(key) ?? undefined;
  if (color !== undefined) return color;
  const hash = hashString(key);
  const index = parseInt(hash.slice(0, 2), 16) % COLORS.length;
  color = COLORS[index];
  colorMap.set(key, color);
  return color;
}
