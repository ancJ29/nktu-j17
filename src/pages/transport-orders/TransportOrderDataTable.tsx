import { useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Box, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { TransportOrder } from '@/types';
import { DataTable } from '@credo/base-ui/components';
import { formatDate } from '@/utils/dateFormat';
import { SortHeader } from '@/components/SortHeader';
import { findStatus } from './transportOrderStatuses';
import { TransportRouteCell } from './TransportRouteCell';

type Props = {
  readonly orders: TransportOrder[];
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;

  readonly sortField?: string;
  readonly onSortChange?: (field: string) => void;
};

export function TransportOrderDataTable({
  orders,
  isLoading,
  viewportRef,
  sortField,
  onSortChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: t('transportOrders.columns.orderNumber'),
        width: '150px',
        render: (item: TransportOrder) => (
          <Text fz="md" fw={500}>
            {item.orderNumber}
          </Text>
        ),
      },
      {
        key: 'entryDate',
        header: (
          <SortHeader
            label={t('transportOrders.columns.date')}
            field="entryDate"
            current={sortField}
            onChange={onSortChange}
          />
        ),
        width: '120px',
        render: (item: TransportOrder) => <Text fz="sm">{formatDate(item.entryDate)}</Text>,
      },
      {
        key: 'billContainer',
        header: t('transportOrders.columns.billContainer'),
        width: '160px',

        render: (item: TransportOrder) => (
          <Stack gap={2}>
            <Text fz="sm" lineClamp={1}>
              {item.billNumber || '—'}
            </Text>
            {item.containerNumber && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.containerNumber}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'customer',
        header: t('common.labels.customer'),
        width: '200px',
        render: (item: TransportOrder) => (
          <Text fz="md" lineClamp={2}>
            {item.customerName || '—'}
          </Text>
        ),
      },
      {
        key: 'route',
        header: t('transportOrders.columns.route'),

        render: (item: TransportOrder) => <TransportRouteCell order={item} />,
      },
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        ta: 'center' as const,
        width: '150px',
        render: (item: TransportOrder) => {
          const status = findStatus(item.status);
          return (
            <Box ta="center" pr="sm">
              {item.extra?.cancellation ? (
                <Badge color="red" variant="light">
                  {t('transportOrders.cancel.statusBadge')}
                </Badge>
              ) : (
                <Badge color={status.color} variant="light">
                  {status.label}
                </Badge>
              )}
            </Box>
          );
        },
      },
    ],

    [t, i18n.language, sortField, onSortChange],
  );

  const handleRowClick = (item: TransportOrder) => {
    navigate(ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', item.id));
  };

  return (
    <DataTable
      withIndex
      noActions
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      data={orders as (TransportOrder & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('transportOrders.noResults')}
      onRowClick={handleRowClick}
    />
  );
}
