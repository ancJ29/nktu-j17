import { Group, Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type AuthHeaderProps = {
  children: ReactNode;
  icon?: ReactNode;
  layout?: 'horizontal' | 'vertical';
};

export function AuthHeader({ children, icon, layout = 'horizontal' }: AuthHeaderProps) {
  if (!children) return null;

  const Wrapper = layout === 'vertical' ? Stack : Group;

  return (
    <Wrapper align="center" justify="center" gap="sm" mb="md">
      {icon}
      <Title order={3} fw={700} ta="center">
        {children}
      </Title>
    </Wrapper>
  );
}
