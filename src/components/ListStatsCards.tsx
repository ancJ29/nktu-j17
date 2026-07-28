import type { ReactNode } from 'react';
import { Card, type MantineColor, SimpleGrid, Text } from '@mantine/core';
import { FieldLabel } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { isStatsEnabled } from '@/utils/permission';

const isMobile = device.isMobile;

const statsEnabled = isStatsEnabled();

export type ListStatCell = {
  readonly key: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly color?: MantineColor;
};

type ListStatsCardsProps = {
  readonly cells: readonly ListStatCell[];

  readonly visible?: boolean;

  readonly cols?: { base: number; sm: number };
};

export function ListStatsCards({
  cells,
  visible = true,
  cols = { base: 2, sm: 4 },
}: ListStatsCardsProps) {
  if (!statsEnabled || isMobile || !visible || cells.length === 0) return null;

  return (
    <SimpleGrid cols={cols}>
      {cells.map((cell) => (
        <Card withBorder p="sm" key={cell.key}>
          <FieldLabel>{cell.label}</FieldLabel>
          <Text size="xl" fw={700} c={cell.color}>
            {cell.value}
          </Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}
