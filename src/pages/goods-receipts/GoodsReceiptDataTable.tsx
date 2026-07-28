import { useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { ActionIcon, Badge, Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCopy, IconListDetails } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { GoodsReceipt, GoodsReceiptExtra } from '@/types';
import { DataTable } from '@credo/base-ui/components';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { findStatus } from './goodsReceiptStatuses';
import { isLocationsEnabled } from '@/utils/permission';
import { useEmployeeStore } from '@/stores/useEmployeeStore';

const locationsEnabled = isLocationsEnabled();

type Props = {
  readonly receipts: GoodsReceipt[];
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;

  readonly onShowItems?: (receipt: GoodsReceipt) => void;
};

export function GoodsReceiptDataTable({ receipts, isLoading, viewportRef, onShowItems }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const employeeById = useEmployeeStore((s) => s.mapById);

  const columns = useMemo(
    () => [
      {
        key: 'receiptNumber',
        header: t('goodsReceipts.columns.receiptNumber'),
        width: '250px',
        render: (item: GoodsReceipt) => (
          <Stack gap={2}>
            <Group gap={6} wrap="nowrap" align="center">
              <Text fz="md">{item.receiptNumber}</Text>
              {item.extra?.copyFromId && <IconCopy size={12} color="var(--mantine-color-dimmed)" />}
            </Group>
            {item.reference && (
              <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                {item.reference}
                {/* xxx */}
              </Text>
            )}
            {item.notes && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {t('__new__.01-common.labels.note')}: {item.notes}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'vendor',
        header: t('common.labels.vendor'),
        width: '20%',
        render: (item: GoodsReceipt) => (
          <Stack gap={2}>
            <Text fz="md" fw={500} lh={1.25} lineClamp={1}>
              {item.vendorName}
            </Text>
            {locationsEnabled && item.locationName && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.locationName}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'items',
        header: t('goodsReceipts.columns.items'),
        render: (item: GoodsReceipt) => {
          const totalQuantity = item.items.reduce((acc, curr) => acc + curr.quantity, 0);
          return (
            <Stack gap={2}>
              <Text fz="sm" fw={500}>
                {t('goodsReceipts.columns.itemsCount', { count: item.items.length })}
              </Text>
              {totalQuantity > 0 && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {totalQuantity.toLocaleString()} {t('common.labels.units')}
                </Text>
              )}
            </Stack>
          );
        },
      },
      {
        key: 'date',
        header: t('goodsReceipts.columns.date'),
        width: '200px',
        render: (item: GoodsReceipt) => {
          const hasReceivedAt = !!item.receivedAt;
          return (
            <Stack gap={2}>
              <Text fz="sm">
                {!hasReceivedAt && <>{t('goodsReceipts.columns.dateLabelExpected')}: </>}
                {hasReceivedAt ? formatDateTime(item.receivedAt!) : formatDate(item.receivedDate)}
              </Text>
            </Stack>
          );
        },
      },
      {
        key: 'assignedTo',
        header: t('goodsReceipts.columns.assignedTo'),
        width: '260px',
        render: (item: GoodsReceipt) => {
          const extra = (item.extra ?? {}) as GoodsReceiptExtra;
          const employee = extra.assignedTo ? employeeById.get(extra.assignedTo) : undefined;
          return <Text fz="sm">{employee?.name || '-'}</Text>;
        },
      },
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        ta: 'center' as const,
        width: '160px',
        render: (item: GoodsReceipt) => {
          const status = findStatus(item.status);
          return (
            <Box ta="center" pr="sm">
              <Badge color={status.color} variant="light">
                {t(status.labelKey)}
              </Badge>
            </Box>
          );
        },
      },

      ...(onShowItems
        ? [
            {
              key: '__items',
              header: '',
              width: '56px',
              ta: 'center' as const,
              render: (item: GoodsReceipt) => (
                <Tooltip label={t('goodsReceipts.detail.viewItems')} withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowItems(item);
                    }}
                  >
                    <IconListDetails size={18} />
                  </ActionIcon>
                </Tooltip>
              ),
            },
          ]
        : []),
    ],
    [t, employeeById, onShowItems],
  );

  const handleRowClick = (item: GoodsReceipt) => {
    navigate(ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', item.id));
  };

  return (
    <DataTable
      withIndex
      noActions
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      data={receipts as (GoodsReceipt & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('goodsReceipts.noItems')}
      onRowClick={handleRowClick}
    />
  );
}
