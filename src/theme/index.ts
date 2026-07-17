import { themeConfig } from '@/config';
import { buildMantineTheme } from '@credo/base-ui/utils';
import {
  Accordion,
  Button,
  Drawer,
  Modal,
  rem,
  createTheme,
  PasswordInput,
  TextInput,
  Badge,
} from '@mantine/core';

const inputStyles = {
  input: {
    border: 'none',
    borderBottom: '1px solid var(--mantine-color-default-border)',
    borderRadius: '0',
    padding: '0',
  },
};

const baseTheme = buildMantineTheme(themeConfig, {
  Accordion: Accordion.extend({
    styles: {
      label: {
        fontWeight: 550,
      },
    },
  }),
  Modal: Modal.extend({
    defaultProps: {
      centered: true,
    },
    styles: {
      header: {
        padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
      },
      title: {
        fontSize: 'var(--mantine-font-size-lg)',
        fontWeight: 550,
      },
    },
  }),
  Drawer: Drawer.extend({
    styles: {
      header: {
        padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
      },
      title: {
        fontSize: 'var(--mantine-font-size-lg)',
        fontWeight: 550,
      },
    },
  }),
  Badge: Badge.extend({
    styles: {
      root: {
        borderRadius: 'var(--mantine-radius-sm)',
      },
    },
  }),
  TextInput: TextInput.extend({
    styles(_theme, props) {
      const styles = {
        input: {
          border: 'none',
          borderBottom: '1px solid var(--mantine-color-primary-6)',
          borderRadius: 0,
          padding: '0',
        },
      };
      if (props.leftSection) {
        styles.input.padding = '.5rem 2rem';
      }

      return styles;
    },
  }),
  PasswordInput: PasswordInput.extend({
    styles(_theme, props) {
      const base = {
        ...inputStyles,
        innerInput: { padding: '0' },
      };
      if (props.leftSection) {
        base.innerInput.padding = '0.5rem 2rem';
      }
      return base;
    },
  }),
  Button: Button.extend({
    styles(_theme, props) {
      if (props.variant === 'auth-form') {
        return {
          root: {
            transition: 'all 0.2s ease',
            height: rem(55),
            fontSize: 'h4',
            fontWeight: '400',
          },
        };
      }

      return {};
    },
  }),
});

export const theme = createTheme({
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    tomato: [
      '#fff3e0',
      '#ffe6ca',
      '#ffcb99',
      '#ffaf63',
      '#ff922b',
      '#ff8818',
      '#ff8005',
      '#e46e00',
      '#cc6000',
      '#b15100',
    ],
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  
  fontFamily: '"Noto Sans", sans-serif',
  headings: {
    fontFamily: '"Noto Sans", sans-serif',
  },
});
