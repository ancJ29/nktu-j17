import { useMemo } from 'react';
import { Badge, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MaterialInventoryRow } from '@/types';
import { ListDataTable } from '@/components/ListDataTable';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';

type Props = {
  readonly rows: MaterialInventoryRow[];
  
  readonly names: ReadonlyMap<string, string>;
  
  readonly lowStockCodes?: ReadonlySet<string>;
  readonly isLoading?: boolean;
  readonly onRowClick: (row: MaterialInventoryRow) => void;
};

export function MaterialInventoryDataTable({
  rows,
  names,
  lowStockCodes,
  isLoading,
  onRowClick,
}: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());

  const columns = useMemo(
    () => [
      {
        key: 'material',
        header: t('materialInventory.columns.material'),
        width: '320px',
        render: (row: MaterialInventoryRow) => (
          <Stack gap={2}>
            <Text fz="md" fw={600} lh={1.25}>
              {names.get(row.itemCode) ?? row.itemCode}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" fw={500}>
              {row.itemCode}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'onHand',
        header: t('common.labels.onHand'),
        render: (row: MaterialInventoryRow) => {
          const byUnit = row.extra?.onHandByUnit;
          const isLow = lowStockCodes?.has(row.itemCode) ?? false;
          return (
            <Stack gap={4} align="flex-end">
              <Text fw={600} c={row.onHand < 0 ? 'red' : isLow ? 'orange' : undefined}>
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
          );
        },
      },
    ],
    [t, names, unitLabels, lowStockCodes],
  );

  
  const getRowBg = useMemo(
    () => (row: MaterialInventoryRow) =>
      row.onHand < 0 ? 'red.1' : lowStockCodes?.has(row.itemCode) ? 'orange.1' : undefined,
    [lowStockCodes],
  );

  return (
    <ListDataTable
      data={rows}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('materialInventory.emptyTitle')}
      onRowClick={onRowClick}
      getRowBg={getRowBg}
    />
  );
}
