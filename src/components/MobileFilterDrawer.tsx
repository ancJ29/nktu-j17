import { Drawer, rem } from '@mantine/core';
import type { ReactNode } from 'react';

type MobileFilterDrawerProps = {
  opened: boolean;
  onClose: () => void;
  title?: string | ReactNode;
  children: ReactNode;
  
  height?: string;
};

export function MobileFilterDrawer({
  opened,
  onClose,
  title,
  children,
  height = '50vh',
}: MobileFilterDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="bottom"
      size={height}
      padding="md"
      styles={{
        content: {
          borderTopLeftRadius: rem(16),
          borderTopRightRadius: rem(16),
        },
        header: {
          borderTopLeftRadius: rem(16),
          borderTopRightRadius: rem(16),
        },
        body: {
          paddingBottom: rem(24),
          flex: 1,
          overflow: 'hidden',
        },
      }}
    >
      {children}
    </Drawer>
  );
}
