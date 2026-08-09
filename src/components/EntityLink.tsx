import { Anchor, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export type LinkSize = 'xs' | 'sm' | 'md';

export const LINK_ICON_SIZE: Record<LinkSize, number> = { xs: 12, sm: 14, md: 16 };

export function EntityDash({ size }: { size: LinkSize }) {
  return <Text size={size}>-</Text>;
}

type EntityChipProps = {
  size: LinkSize;

  lead?: ReactNode;
  label: ReactNode;

  color?: string;

  gap?: number;

  monospace?: boolean;
};

export function EntityChip({ size, lead, label, color, gap = 6, monospace }: EntityChipProps) {
  return (
    <Group c={color} gap={gap} wrap="nowrap" component="span" style={{ display: 'inline-flex' }}>
      {lead}
      <Text size={size} fw={600} ff={monospace ? 'monospace' : undefined}>
        {label}
      </Text>
    </Group>
  );
}

type EntityAnchorProps = {
  to: string;
  size: LinkSize;

  anchorColor?: string;
  children: ReactNode;
};

export function EntityAnchor({ to, size, anchorColor = 'inherit', children }: EntityAnchorProps) {
  return (
    <Anchor
      component={Link}
      to={to}
      size={size}
      underline="hover"
      c={anchorColor}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
    </Anchor>
  );
}
