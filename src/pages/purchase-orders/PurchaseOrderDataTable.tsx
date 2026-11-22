import { useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { ActionIcon, Badge, Box, Group, Stack, Text } from '@mantine/core';
import { IconCopy, IconListDetails } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { PurchaseOrder } from '@/types';
import { DataTable } from '@credo/base-ui/components';
import { formatDate } from '@/utils/dateFormat';
import {
  isLocationsEnabled,
  isPricingManagementEnabled,
  perms,
  tableDensity,
} from '@/utils/permission';
import { findPurchaseOrderStatus } from './purchaseOrderStatuses';
import { ArrivalText } from './ArrivalText';
import { NO_CLAMP, PurchaseOrderPaymentState } from './PurchaseOrderPaymentState';
import { arrivalFor, type ArrivalsState } from './purchaseOrderArrivals';
import {
  formatMoney,
  poCurrency,
  poExtra,
  plannedArrivalIso,
  poCustomer,
  poOrderDateIso,
  poStatus,
  orderTotal,
} from './purchaseOrderModel';
import { useColumnWidths } from '@/hooks/useColumnWidths';

const locationsEnabled = isLocationsEnabled();
const showPrice = isPricingManagementEnabled() && perms.purchaseOrder.canViewPrice();

type Props = {
  readonly orders: PurchaseOrder[];

  readonly arrivals: ArrivalsState;

  readonly employeeNameById: ReadonlyMap<string, string>;
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;

  readonly onShowItems?: (order: PurchaseOrder) => void;
};

export function PurchaseOrderDataTable({
  orders,
  arrivals,
  employeeNameById,
  isLoading,
  viewportRef,
  onShowItems,
}: Props) {
  const { t } = useTranslation();
  const resizableColumns = useColumnWidths('purchase-orders');
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: t('purchaseOrders.columns.orderNumber'),
        width: '140px',
        render: (item: PurchaseOrder) => (
          <Stack gap={2}>
            <Group gap={6} wrap="nowrap" align="center">
              <Text fz="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
                {item.orderNumber || '—'}
              </Text>
              {poExtra(item).copyFromId && (
                <IconCopy size={12} color="var(--mantine-color-dimmed)" />
              )}
            </Group>
            {item.reference && (
              <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                {item.reference}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'vendor',
        header: t('common.labels.vendor'),
        width: '13%',
        render: (item: PurchaseOrder) => (
          <Stack gap={2}>
            <Text fz="sm" fw={500} lh={1.25}>
              {item.vendorName || '—'}
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
        key: 'customer',
        header: t('purchaseOrders.form.customerLabel'),
        width: '11%',
        render: (item: PurchaseOrder) => (
          <Text fz="sm">{poCustomer(item)?.name || poCustomer(item)?.code || '—'}</Text>
        ),
      },
      ...(showPrice
        ? [
            {
              key: 'total',
              header: t('purchaseOrders.columns.total'),
              width: '110px',
              ta: 'right' as const,
              render: (item: PurchaseOrder) => (
                <Text fz="sm" fw={500} ta="right">
                  {formatMoney(orderTotal(item), poCurrency(item))} {poCurrency(item)}
                </Text>
              ),
            },
          ]
        : []),
      {
        key: 'paid',
        header: t('purchaseOrders.columns.payment'),
        width: '170px',
        render: (item: PurchaseOrder) => <PurchaseOrderPaymentState order={item} />,
      },
      {
        key: 'orderDate',
        header: t('purchaseOrders.form.orderDateLabel'),
        width: '95px',
        render: (item: PurchaseOrder) => (
          <Text fz="sm">{poOrderDateIso(item) ? formatDate(poOrderDateIso(item)) : '—'}</Text>
        ),
      },
      {
        key: 'plannedArrival',
        header: t('purchaseOrders.form.plannedArrivalLabel'),
        width: '95px',
        render: (item: PurchaseOrder) => (
          <Text fz="sm">{plannedArrivalIso(item) ? formatDate(plannedArrivalIso(item)) : '—'}</Text>
        ),
      },
      {
        key: 'actualArrival',
        header: t('purchaseOrders.form.actualArrivalLabel'),
        width: '95px',
        render: (item: PurchaseOrder) => <ArrivalText arrival={arrivalFor(arrivals, item)} />,
      },
      {
        key: 'pic',
        header: t('common.labels.assignedTo'),
        width: '100px',
        render: (item: PurchaseOrder) => {
          const id = poExtra(item).assignedTo;
          return <Text fz="sm">{(id && employeeNameById.get(id)) || '—'}</Text>;
        },
      },
      {
        key: 'requestedBy',
        header: t('purchaseOrders.form.requestedByLabel'),
        width: '100px',
        render: (item: PurchaseOrder) => {
          const id = poExtra(item).requestedBy;
          return <Text fz="sm">{(id && employeeNameById.get(id)) || '—'}</Text>;
        },
      },
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        ta: 'center' as const,
        width: '110px',
        render: (item: PurchaseOrder) => {
          const status = findPurchaseOrderStatus(poStatus(item));
          return (
            <Box ta="center" pr="sm">
              <Badge color={status.color} variant="light" styles={NO_CLAMP}>
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
              render: (item: PurchaseOrder) => (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={t('purchaseOrders.detail.viewItems')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowItems(item);
                  }}
                >
                  <IconListDetails size={18} />
                </ActionIcon>
              ),
            },
          ]
        : []),
    ],
    [t, onShowItems, arrivals, employeeNameById],
  );

  return (
    <DataTable
      resizableColumns={resizableColumns}
      withIndex
      noActions
      density={tableDensity()}
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      data={orders as (PurchaseOrder & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('purchaseOrders.noItems')}
      onRowClick={(item) => navigate(ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', item.id))}
    />
  );
}
