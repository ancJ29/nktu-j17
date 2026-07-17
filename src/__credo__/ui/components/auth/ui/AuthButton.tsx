
import type { ButtonProps, MantineColor } from '@mantine/core';
import { Button, useMantineTheme } from '@mantine/core';
import type { ComponentPropsWithoutRef } from 'react';

type AuthButtonProps = ButtonProps &
  ComponentPropsWithoutRef<'button'> & {
    children?: React.ReactNode;
    gradientStart: MantineColor;
    gradientEnd: MantineColor;
  };

export function AuthButton({
  children,
  style,
  gradientStart,
  gradientEnd,
  ...props
}: AuthButtonProps) {
  const theme = useMantineTheme();

  const getColor = (color: MantineColor) => {
    if (typeof color === 'string' && color.includes('.')) {
      const [colorName, shade] = color.split('.');
      return theme.colors[colorName]?.[parseInt(shade)] || color;
    }
    return color;
  };

  return (
    <Button
      {...props}
      fullWidth
      size="md"
      radius="md"
      style={{
        background: `linear-gradient(135deg, ${getColor(gradientStart)} 0%, ${getColor(gradientEnd)} 100%)`,
        ...style,
      }}
    >
      {children}
    </Button>
  );
}
