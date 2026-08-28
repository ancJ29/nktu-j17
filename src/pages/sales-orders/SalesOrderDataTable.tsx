import { useCallback, useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { ActionIcon, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconListDetails, IconRobot } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { SalesOrder, Employee } from '@/types';
import { DataTable } from '@credo/base-ui/components';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type { ResolvedStatusOption, ResolvedTagOption } from '@/utils/permission';
import {
  getPricingVatRate,
  isPricingManagementEnabled,
  perms,
  tableDensity,
} from '@/utils/permission';
import { SalesOrderStatusBadgeBase } from '@/components/sales-orders/SalesOrderStatusBadgeBase';
import { SortHeader } from '@/components/SortHeader';
import { selectionColumn } from '@/components/selectionColumn';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { getSalesOrderReadyDate } from '@/utils/salesOrderReadyDate';
import { isCheatCompletedSalesOrder } from '@/utils/salesOrderCheatMarker';
import {
  computeSalesOrderTotals,
  isSalesOrderMissingMoneyInfo,
  resolveSalesOrderPaymentState,
} from '@/utils/salesOrderPricing';
import { resolveSalesOrderRowBg } from './urgencyRowBg';
import type { SalesOrderStatusBadgeVariant } from '@/components/sales-orders/salesOrderStatusBadgeVariant';
import type { SalesOrderListVariant } from './salesOrderListVariant';

const showPrice = isPricingManagementEnabled() && perms.salesOrder.canViewPrice();
const vatRate = getPricingVatRate();

function getDeliveryDateColor(order: SalesOrder): string | undefined {
  if (order.isClosed || order.extra?.cancellation != null) return undefined;
  const deliveryDate = order.extra?.deliveryDate;
  if (!deliveryDate) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(deliveryDate);
  dd.setHours(0, 0, 0, 0);
  if (dd < today) return 'red';
  if (dd.getTime() === today.getTime()) return 'orange';
  return undefined;
}

type SalesOrderDataTableProps = {
  readonly orders: SalesOrder[];
  readonly isLoading?: boolean;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  readonly resolveDeliveryMethod: (value: string | undefined | null) => string;
  readonly employees: Employee[];
  readonly tagOptions: ResolvedTagOption[];
  readonly sortField?: string;
  readonly onSortChange?: (field: string) => void;

  readonly selectable?: boolean;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onToggleRow?: (id: string) => void;
  readonly onToggleAll?: () => void;

  readonly allSelected?: boolean;
  readonly someSelected?: boolean;

  readonly disabledIds?: ReadonlySet<string>;

  readonly onShowItems?: (order: SalesOrder) => void;

  readonly financeMode?: boolean;

  readonly showCheatMarker?: boolean;

  readonly vacuousCompletionIds?: ReadonlySet<string>;
  readonly viewportRef?: Ref<HTMLDivElement>;

  readonly dateColumns: SalesOrderListVariant['dateColumns'];

  readonly showPaymentColumns: boolean;

  readonly statusBadgeVariant: SalesOrderStatusBadgeVariant;
};

export function SalesOrderDataTable({
  orders,
  isLoading,
  resolveStatus,
  resolveDeliveryMethod,
  employees,
  tagOptions,
  sortField,
  onSortChange,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allSelected = false,
  someSelected = false,
  disabledIds,
  onShowItems,
  financeMode = false,
  showCheatMarker = false,
  vacuousCompletionIds,
  viewportRef,
  dateColumns,
  showPaymentColumns,
  statusBadgeVariant,
}: SalesOrderDataTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getByCode: getCustomerByCode } = useCustomerStore();

  const employeeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const columns = useMemo(
    () =>
      [
        ...(selectable
          ? [
              selectionColumn<SalesOrder>({
                keyOf: (o) => o.id,
                isSelected: (id) => selectedIds?.has(id) ?? false,
                onToggleRow: (id) => onToggleRow?.(id),
                onToggleAll: () => onToggleAll?.(),
                allSelected,
                someSelected,
                selectAllLabel: t('deliveryRequests.bulkCreate.openButton'),
                rowLabel: (o) => o.orderNumber,
                isDisabled: (o) => disabledIds?.has(o.id) ?? false,
                disabledTooltip: t('deliveryRequests.bulkCreate.alreadyHasDR'),
              }),
            ]
          : []),
        {
          key: 'orderNumber',
          header: t('salesOrders.columns.orderNumber'),
          width: '200px',
          render: (item: SalesOrder) => (
            <Stack gap={2}>
              <Group gap={6} wrap="nowrap">
                <Text fz="md" fw={500}>
                  {item.orderNumber}
                </Text>
                {showCheatMarker && isCheatCompletedSalesOrder(item) && (
                  <Tooltip
                    label={t('salesOrders.cheatMarker.tooltip')}
                    withArrow
                    multiline
                    maw={260}
                  >
                    <Badge
                      color="grape"
                      variant="light"
                      size="xs"
                      leftSection={<IconRobot size={10} aria-hidden />}
                    >
                      {t('salesOrders.cheatMarker.label')}
                    </Badge>
                  </Tooltip>
                )}
                {vacuousCompletionIds?.has(item.id) && (
                  <Tooltip
                    label={t('salesOrders.vacuousCompletion.tooltip')}
                    withArrow
                    multiline
                    maw={280}
                  >
                    <Badge
                      color="red"
                      variant="light"
                      size="xs"
                      leftSection={<IconAlertTriangle size={10} aria-hidden />}
                    >
                      {t('salesOrders.vacuousCompletion.label')}
                    </Badge>
                  </Tooltip>
                )}
                {financeMode && isSalesOrderMissingMoneyInfo(item, vatRate) && (
                  <Badge
                    color="orange"
                    variant="light"
                    size="xs"
                    leftSection={<IconAlertTriangle size={10} aria-hidden />}
                  >
                    {t('salesOrders.finance.missingLabel')}
                  </Badge>
                )}
              </Group>
              {item.extra?.customerPONumber && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.extra.customerPONumber}
                </Text>
              )}
              {item.extra?.deliveryPackageSize && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {t('salesOrders.detail.deliveryPackageSize')}: {item.extra.deliveryPackageSize}
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
          key: 'customerName',
          width: '200px',
          header: t('common.labels.customer'),
          render: (item: SalesOrder) => (
            <Text fz="md">{resolveSalesOrderCustomerName(item, getCustomerByCode) ?? '-'}</Text>
          ),
        },
        ...(financeMode
          ? [
              {
                key: 'financeDate',

                header: t('__new__.01-common.labels.orderDate'),
                width: '120px',
                render: (item: SalesOrder) => (
                  <Text size="sm">{formatDate(getSalesOrderReadyDate(item))}</Text>
                ),
              },
              {
                key: 'financeSubtotal',
                header: t('salesOrders.finance.subtotalLabel'),
                ta: 'right' as const,
                width: '140px',
                render: (item: SalesOrder) => (
                  <Text size="sm" ta="right">
                    {computeSalesOrderTotals(item, vatRate).subtotal.toLocaleString()}
                  </Text>
                ),
              },
              {
                key: 'financeVat',
                header: t('salesOrders.finance.vatLabel'),
                ta: 'right' as const,
                width: '130px',
                render: (item: SalesOrder) => (
                  <Text size="sm" ta="right">
                    {computeSalesOrderTotals(item, vatRate).vat.toLocaleString()}
                  </Text>
                ),
              },
              {
                key: 'financeGrandTotal',
                header: t('salesOrders.finance.grandTotalLabel'),
                ta: 'right' as const,
                width: '150px',
                render: (item: SalesOrder) => (
                  <Text size="sm" fw={600} ta="right">
                    {computeSalesOrderTotals(item, vatRate).grandTotal.toLocaleString()}
                  </Text>
                ),
              },
              {
                key: 'financeInvoice',
                header: t('salesOrders.billing.invoiceLabel'),
                width: '120px',
                render: (item: SalesOrder) =>
                  item.extra?.invoiceIssued ? (
                    <Badge variant="light" size="sm" radius="sm" color="blue">
                      {t('salesOrders.billing.invoiceIssued')}
                    </Badge>
                  ) : (
                    <Text size="sm" ta="center">
                      -
                    </Text>
                  ),
              },
            ]
          : [
              {
                key: 'assignedStaff',
                width: '150px',
                header: t('salesOrders.columns.assignedStaff'),
                render: (item: SalesOrder) => {
                  const staffId = item.extra?.assignedStaff;
                  return <Text size="sm">{staffId ? (employeeMap.get(staffId) ?? '-') : '-'}</Text>;
                },
              },
              ...(dateColumns === 'combinedReady'
                ? [
                    {
                      key: 'dates',

                      header: t('__new__.01-common.labels.orderDate'),
                      width: '200px',
                      render: (item: SalesOrder) => {
                        const dd = item.extra?.deliveryDate;
                        const color = getDeliveryDateColor(item);
                        const readyAt = getSalesOrderReadyDate(item);
                        return (
                          <Stack gap={0}>
                            <Text size="sm">{formatDateTime(readyAt)}</Text>
                            {dd && (
                              <Group>
                                {t('salesOrders.columns.deliveryDate')}:{' '}
                                <Text size="sm" c={color} fw={color ? 600 : undefined}>
                                  {formatDate(dd)}
                                </Text>
                              </Group>
                            )}
                          </Stack>
                        );
                      },
                    },
                  ]
                : [
                    {
                      key: 'orderDate',
                      header: (
                        <SortHeader
                          label={t('salesOrders.columns.orderDate')}
                          field="createdAt"
                          current={sortField}
                          onChange={onSortChange}
                        />
                      ),
                      render: (item: SalesOrder) => (
                        <Text size="sm">{formatDateTime(item.createdAt)}</Text>
                      ),
                    },
                    {
                      key: 'deliveryDate',
                      header: (
                        <SortHeader
                          label={t('salesOrders.columns.deliveryDate')}
                          field="deliveryDate"
                          current={sortField}
                          onChange={onSortChange}
                        />
                      ),
                      render: (item: SalesOrder) => {
                        const dd = item.extra?.deliveryDate;
                        const color = getDeliveryDateColor(item);
                        return (
                          <Text size="sm" c={color} fw={color ? 600 : undefined}>
                            {dd ? formatDate(dd) : '-'}
                          </Text>
                        );
                      },
                    },
                  ]),

              ...(showPrice
                ? [
                    {
                      key: 'totalIncl',
                      header: t('salesOrders.billing.totalInclLabel'),
                      ta: 'right' as const,
                      width: '150px',
                      render: (item: SalesOrder) => (
                        <Text size="sm" fw={500} ta="right">
                          {computeSalesOrderTotals(item, vatRate).grandTotal.toLocaleString()}
                        </Text>
                      ),
                    },
                    {
                      key: 'isPaid',
                      hidden: !showPaymentColumns,
                      header: t('salesOrders.billing.paidLabel'),
                      width: '150px',
                      render: (item: SalesOrder) => {
                        const grandTotal = computeSalesOrderTotals(item, vatRate).grandTotal;
                        const payment = resolveSalesOrderPaymentState(item.extra, grandTotal);
                        if (payment.state === 'unpaid') {
                          return (
                            <Text size="sm" fw={500} ta="center">
                              -
                            </Text>
                          );
                        }
                        if (payment.state === 'partial') {
                          return (
                            <Stack gap={2} align="flex-start">
                              <Badge variant="light" size="sm" radius="sm" color="orange">
                                {t('salesOrders.billing.partial')}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                {payment.paidAmount.toLocaleString()}
                              </Text>
                            </Stack>
                          );
                        }
                        return (
                          <Badge variant="light" size="sm" radius="sm" color={'blue'}>
                            {t('salesOrders.billing.paid')}
                          </Badge>
                        );
                      },
                    },
                    {
                      key: 'invoiceIssued',
                      hidden: !showPaymentColumns,
                      header: t('salesOrders.billing.invoiceLabel'),
                      width: '150px',
                      render: (item: SalesOrder) => {
                        if (!item.extra?.invoiceIssued) {
                          return (
                            <Text size="sm" fw={500} ta="center">
                              -
                            </Text>
                          );
                        }
                        return (
                          <Badge
                            variant="light"
                            size="sm"
                            radius="sm"
                            color={item.extra?.invoiceIssued ? 'blue' : 'gray'}
                          >
                            {t('salesOrders.billing.invoiceIssued')}
                          </Badge>
                        );
                      },
                    },
                  ]
                : []),
              {
                key: 'labels',
                header: t('salesOrders.columns.labels'),
                width: '200px',
                render: (item: SalesOrder) => (
                  <SalesOrderStatusBadgeBase
                    extra={item.extra ?? {}}
                    resolveStatus={resolveStatus}
                    resolveDeliveryMethod={resolveDeliveryMethod}
                    tagOptions={tagOptions}
                    variant={statusBadgeVariant}
                  />
                ),
              },

              ...(onShowItems
                ? [
                    {
                      key: '__items',
                      header: '',
                      width: '56px',
                      ta: 'center' as const,
                      render: (item: SalesOrder) => (
                        <Tooltip label={t('salesOrders.detail.viewItems')} withArrow>
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
            ]),
      ].filter((el) => el.hidden !== true),
    [
      t,
      sortField,
      onSortChange,
      getCustomerByCode,
      employeeMap,
      resolveStatus,
      resolveDeliveryMethod,
      tagOptions,
      selectable,
      selectedIds,
      onToggleRow,
      onToggleAll,
      allSelected,
      someSelected,
      disabledIds,
      onShowItems,
      financeMode,
      showCheatMarker,
      vacuousCompletionIds,
      dateColumns,
      showPaymentColumns,
      statusBadgeVariant,
    ],
  );

  const handleRowClick = (item: SalesOrder) => {
    if (selectable) {
      if (disabledIds?.has(item.id)) return;
      onToggleRow?.(item.id);
      return;
    }

    navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', item.id));
  };

  const getRowBg = useCallback(
    (item: SalesOrder & Record<string, unknown>) =>
      financeMode
        ? undefined
        : resolveSalesOrderRowBg(
            item.extra?.isUrgent === true,
            resolveStatus(item.extra?.status).stage,
          ),
    [resolveStatus, financeMode],
  );

  return (
    <DataTable
      withIndex
      noActions
      density={tableDensity()}
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      data={orders as (SalesOrder & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('salesOrders.noItems')}
      onRowClick={handleRowClick}
      getRowBg={getRowBg}
    />
  );
}
