import type { MantineColor } from '@mantine/core';
import type { ComponentType } from 'react';

export type IconComponent = ComponentType<{
  color?: string;
  size?: number | string;
}>;

export type ErrorThemeConfig = {
  layout: {
    bgGradientStart: MantineColor;
    bgGradientEnd: MantineColor;
  };
  card: {
    borderColor: MantineColor;
    topGradientStart: MantineColor;
    topGradientEnd: MantineColor;
  };
  button: {
    gradientStart: MantineColor;
    gradientEnd: MantineColor;
  };
  link: {
    color: MantineColor;
  };
};
