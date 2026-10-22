import { type MantineThemeOverride } from '@mantine/core';
import type { CredoThemeConfig } from '../types';
import { colorPalettes, getColorPalette } from './palettes';

export function buildMantineTheme(
  themeConfig: CredoThemeConfig,
  componentOverrides?: MantineThemeOverride['components'],
): MantineThemeOverride {
  const primary = getColorPalette(themeConfig.mainColor);

  return {
    primaryColor: 'primary',
    colors: {
      primary,
      ...colorPalettes,

      green: colorPalettes.success,
      red: colorPalettes.danger,

      surface: colorPalettes.neutral,
      surfaceText: colorPalettes.neutralInv,
      onPrimary: colorPalettes.gray,
    },

    fontFamily: '-apple-system, Calibri, Segoe UI, Sans-Serif, Open Sans, Arial, Helvetica',
    fontFamilyMonospace:
      'Courier New, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    headings: {
      fontWeight: '600',
    },

    defaultRadius: 'sm',
    radius: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
    },

    spacing: {
      xs: '8px',
      sm: '12px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },

    shadows: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    },

    cursorType: 'pointer',
    focusRing: 'auto',

    components: {
      Button: {
        defaultProps: {
          size: 'sm',
        },
      },
      TextInput: {
        defaultProps: {
          size: 'sm',
        },
      },
      Select: {
        defaultProps: {
          size: 'sm',
        },
      },
      SegmentedControl: {
        defaultProps: {
          size: 'sm',
        },
      },
      Tabs: {
        defaultProps: {
          styles: {
            tab: {
              fontWeight: 600,
            },
          },
        },
      },
      Modal: {
        defaultProps: {
          centered: true,
        },
        styles: {
          title: {
            fontWeight: 700,
          },
        },
      },

      ...componentOverrides,
    },
  };
}
