import { useMemo } from 'react';
import { Badge, Box, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { WarehouseDocRow } from '@/types';
import { ListDataTable } from '@/components/ListDataTable';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { formatUnitTotals, totalsByUnit } from './kinds';

type Props = {
  readonly docs: WarehouseDocRow[];
  readonly isLoading?: boolean;
  readonly detailRoute: string;
  readonly showStatus?: boolean;
};

export function WarehouseDocDataTable({ docs, isLoading, detailRoute, showStatus }: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const employees = useEmployeeStore((s) => s.items);
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const columns = useMemo(
    () => [
      {
        key: 'code',
        header: t('common.labels.code'),
        width: '220px',
        render: (d: WarehouseDocRow) => (
          <Stack gap={2}>
            <Text fz="md" fw={600} ff="monospace">
              {d.extra.code}
            </Text>
            {d.extra.reference && (
              <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                {d.extra.reference}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'items',
        header: t('warehouseDoc.columns.lines'),
        render: (d: WarehouseDocRow) => (
          <Stack gap={2}>
            <Text fz="sm" fw={500}>
              {t('warehouseDoc.columns.itemsCount', { count: d.extra.lines?.length ?? 0 })}
            </Text>
            {(d.extra.lines?.length ?? 0) > 0 && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {formatUnitTotals(totalsByUnit(d.extra.lines), (u) =>
                  lookupLabelOf(unitLabels, u, u),
                )}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'date',
        header: t('warehouseDoc.columns.date'),
        width: '200px',
        render: (d: WarehouseDocRow) => (
          <Stack gap={2}>
            <Text size="sm">{formatDate(d.recordDate)}</Text>
            <Text size="xs" c="dimmed">
              {formatDateTime(d.createdAt)}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'assignedTo',
        header: t('common.labels.assignedTo'),
        width: '220px',
        render: (d: WarehouseDocRow) => (
          <Text fz="sm">
            {(d.extra.assignedTo && employeeById.get(d.extra.assignedTo)?.name) || '-'}
          </Text>
        ),
      },
      ...(showStatus
        ? [
            {
              key: 'status',
              header: t('__new__.01-common.labels.status'),
              ta: 'center' as const,
              width: '150px',
              render: (d: WarehouseDocRow) => {
                const confirmed = (d.extra.status ?? 'draft') === 'confirmed';
                return (
                  <Box ta="center" pr="sm">
                    <Badge
                      color={confirmed ? 'green' : 'gray'}
                      variant={confirmed ? 'filled' : 'light'}
                    >
                      {t(`warehouseDoc.status.${confirmed ? 'confirmed' : 'draft'}`)}
                    </Badge>
                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [t, unitLabels, employeeById, showStatus],
  );

  return (
    <ListDataTable
      data={docs}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('warehouseDoc.emptyTitle')}
      detailRoute={detailRoute}
    />
  );
}
