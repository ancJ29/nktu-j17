import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBox } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ListCardList } from '@/components/ListCardList';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import type { MaterialInventoryRow } from '@/types';

type Props = {
  readonly rows: MaterialInventoryRow[];
  readonly names: ReadonlyMap<string, string>;
  
  readonly lowStockCodes?: ReadonlySet<string>;
  readonly isLoading?: boolean;
  readonly onRowClick: (row: MaterialInventoryRow) => void;
};

function RowSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="30%" />
      </Stack>
    </Card>
  );
}

export function MaterialInventoryCardList({
  rows,
  names,
  lowStockCodes,
  isLoading,
  onRowClick,
}: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());

  return (
    <ListCardList
      data={rows}
      isLoading={isLoading}
      onRowClick={onRowClick}
      getRowBg={(row) =>
        row.onHand < 0 ? 'red.1' : lowStockCodes?.has(row.itemCode) ? 'orange.1' : undefined
      }
      renderSkeleton={() => <RowSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconBox size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('materialInventory.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('materialInventory.emptyMessage')}
            </Text>
          </Stack>
        </Card>
      }
      renderCard={(row) => {
        const byUnit = row.extra?.onHandByUnit;
        const isLow = lowStockCodes?.has(row.itemCode) ?? false;
        return (
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" lh={1.25} truncate>
                {names.get(row.itemCode) ?? row.itemCode}
              </Text>
              <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" fw={500}>
                {row.itemCode}
              </Text>
            </Stack>
            <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
              <Text fw={700} c={row.onHand < 0 ? 'red' : isLow ? 'orange' : undefined}>
                {row.onHand.toLocaleString()}
              </Text>
              {byUnit && Object.keys(byUnit).length > 0 && (
                <Group gap={4} justify="flex-end" wrap="wrap">
                  {Object.entries(byUnit).map(([u, q]) => (
                    <Badge key={u} variant="light" color="gray" size="xs" radius="sm" tt="none">
                      {q.toLocaleString()} {lookupLabelOf(unitLabels, u, u)}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </Group>
        );
      }}
    />
  );
}
