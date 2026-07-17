import type { ReactNode } from 'react';
import { Badge, CloseButton, type MantineColor } from '@mantine/core';

type FilterPillProps = {
  readonly children: ReactNode;
  readonly color?: MantineColor;
  readonly onClose?: () => void;
};

export function FilterPill({ children, color, onClose }: FilterPillProps) {
  return (
    <Badge
      variant="light"
      color={color}
      rightSection={onClose ? <CloseButton size="xs" onClick={onClose} /> : undefined}
    >
      {children}
    </Badge>
  );
}
