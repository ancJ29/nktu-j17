import type { ReactNode } from 'react';
import { Box, Stack } from '@mantine/core';
import { device } from '@credo/base-ui/utils';

const APP_BAR_HEIGHT = 56;
const isMobile = device.isMobile;

export function StickyListChrome({ children }: { children: ReactNode }) {
  if (!isMobile) return <>{children}</>;
  return (
    <Box
      style={{
        position: 'sticky',
        top: APP_BAR_HEIGHT,
        zIndex: 3,
        background: 'var(--mantine-color-body)',
      }}
    >
      <Stack gap="md">{children}</Stack>
    </Box>
  );
}
