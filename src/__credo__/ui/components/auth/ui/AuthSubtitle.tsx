import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

type AuthSubtitleProps = {
  children: ReactNode;
};

export function AuthSubtitle({ children }: AuthSubtitleProps) {
  if (!children) return null;

  return (
    <Text c="dimmed" size="sm" ta="center" mb={32}>
      {children}
    </Text>
  );
}
