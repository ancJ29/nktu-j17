import { useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { TransportOrder } from '@/types';
import { ColorBadge, DataTable } from '@credo/base-ui/components';
import { formatDate, formatTime } from '@/utils/dateFormat';
import { SortHeader } from '@/components/SortHeader';
import { findStatus } from './transportOrderStatuses';
import { useShipmentTypeLabel } from './shipmentType';
import { orderPlanAt, orderPlanDate } from './planDate';
import { TransportRouteCell } from './TransportRouteCell';
import { TransportDriverCell } from './TransportDriverCell';

export function TransportOrderDataTable({
  orders,
  isLoading,
  viewportRef,
  sortField,
  onSortChange,
}: {
  readonly orders: TransportOrder[];
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;

  readonly sortField?: string;
  readonly onSortChange?: (field: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const shipmentTypeLabel = useShipmentTypeLabel();

  const columns = useMemo(
    () => [
      {
        key: 'planDate',
        header: (
          <SortHeader
            label={t('transportOrders.columns.date')}
            field="entryDate"
            current={sortField}
            onChange={onSortChange}
          />
        ),
        width: '135px',
        render: (item: TransportOrder) => {
          const time = formatTime(orderPlanAt(item));
          return (
            <Stack gap={2} align="flex-start">
              <Group gap={6} wrap="nowrap" align="baseline">
                <Text fz="sm" fw={500}>
                  {formatDate(orderPlanDate(item))}
                </Text>
                {time && (
                  <Text fz="xs" c="dimmed" ff="monospace">
                    {time}
                  </Text>
                )}
              </Group>
              <Text fz="xs" c="dimmed" ff="monospace">
                {item.orderNumber}
              </Text>
            </Stack>
          );
        },
      },
      {
        key: 'customer',
        header: t('common.labels.customer'),
        width: '150px',
        render: (item: TransportOrder) => (
          <Text fz="sm" lineClamp={2}>
            {item.customerName || '—'}
          </Text>
        ),
      },
      {
        key: 'shipmentType',
        header: t('transportOrders.form.shipmentType'),
        width: '110px',

        render: (item: TransportOrder) =>
          item.shipmentType ? (
            <ColorBadge size="sm" label={shipmentTypeLabel(item.shipmentType)} />
          ) : null,
      },
      {
        key: 'driver',
        header: t('transportOrders.columns.driver'),
        width: '185px',
        render: (item: TransportOrder) => <TransportDriverCell order={item} />,
      },
      {
        key: 'containerBill',
        header: t('transportOrders.columns.containerBill'),
        width: '155px',
        render: (item: TransportOrder) => (
          <Stack gap={2}>
            <Text fz="sm" ff="monospace" fw="bold" lineClamp={1}>
              {item.containerNumber || '—'}
            </Text>
            {item.billNumber && (
              <Text fz="xs" c="dimmed" ff="monospace" fw="bold" lineClamp={1}>
                {item.billNumber}
              </Text>
            )}
          </Stack>
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

        width: '165px',
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

    [t, i18n.language, sortField, onSortChange, shipmentTypeLabel],
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
