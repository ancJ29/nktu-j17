import type { MantineColor } from '@mantine/core';
import { Stack, useMantineTheme } from '@mantine/core';
import type { ReactNode } from 'react';
import { Icon } from '../../common/Icon';
import { IconName } from '../../types/icon';
import { AuthHeader } from './AuthHeader';
import { AuthSubtitle } from './AuthSubtitle';

type AuthSuccessViewProps = {
  title: string;
  message: string;
  iconColor?: MantineColor;
  children?: ReactNode;
};

export function AuthSuccessView({
  title,
  message,
  iconColor = 'green.6',
  children,
}: AuthSuccessViewProps) {
  const theme = useMantineTheme();

  const getColor = (color: MantineColor) => {
    if (typeof color === 'string' && color.includes('.')) {
      const [colorName, shade] = color.split('.');
      return theme.colors[colorName]?.[parseInt(shade)] || color;
    }
    return color;
  };

  return (
    <Stack>
      <AuthHeader
        icon={<Icon name={IconName.Check} size={48} color={getColor(iconColor)} />}
        layout="vertical"
      >
        {title}
      </AuthHeader>
      <AuthSubtitle>{message}</AuthSubtitle>
      {children}
    </Stack>
  );
}
