import { useCallback, useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { ActionIcon, Badge, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconListDetails, IconRobot } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { SalesOrder, Employee } from '@/types';
import { DataTable, type DataTableColumn } from '@credo/base-ui/components';
import type { DataTableColumnFilterConfig } from '@credo/base-ui/hooks';
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
import type { SalesOrderListVariant, SalesOrderListView } from './salesOrderListVariant';

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

function renderDeliveryDate(order: SalesOrder) {
  const dd = order.extra?.deliveryDate;
  const color = getDeliveryDateColor(order);
  return (
    <Text size="sm" c={color} fw={color ? 600 : undefined}>
      {dd ? formatDate(dd) : '-'}
    </Text>
  );
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

  readonly view: SalesOrderListView;

  readonly showCheatMarker?: boolean;

  readonly vacuousCompletionIds?: ReadonlySet<string>;
  readonly viewportRef?: Ref<HTMLDivElement>;

  readonly dateColumns: SalesOrderListVariant['dateColumns'];

  readonly showPaymentColumns: boolean;

  readonly statusBadgeVariant: SalesOrderStatusBadgeVariant;

  readonly getColumnFilter?: (key: string) => DataTableColumnFilterConfig | undefined;

  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly loadingMoreLabel?: string;
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
  view,
  showCheatMarker = false,
  vacuousCompletionIds,
  viewportRef,
  dateColumns,
  showPaymentColumns,
  statusBadgeVariant,
  getColumnFilter,
  hasMore,
  onLoadMore,
  loadingMoreLabel,
}: SalesOrderDataTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getByCode: getCustomerByCode } = useCustomerStore();

  const employeeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const financeMode = view === 'finance';

  const columns = useMemo<DataTableColumn<SalesOrder>[]>(() => {
    const selectionColumns: DataTableColumn<SalesOrder>[] = selectable
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
      : [];
    const leadColumns: DataTableColumn<SalesOrder>[] = [
      ...selectionColumns,
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
                <Badge
                  color="grape"
                  variant="light"
                  size="xs"
                  leftSection={<IconRobot size={10} aria-hidden />}
                  title={t('salesOrders.cheatMarker.tooltip')}
                >
                  {t('salesOrders.cheatMarker.label')}
                </Badge>
              )}
              {vacuousCompletionIds?.has(item.id) && (
                <Badge
                  color="red"
                  variant="light"
                  size="xs"
                  leftSection={<IconAlertTriangle size={10} aria-hidden />}
                  title={t('salesOrders.vacuousCompletion.tooltip')}
                >
                  {t('salesOrders.vacuousCompletion.label')}
                </Badge>
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
    ];
    const customerColumn: DataTableColumn<SalesOrder> = {
      key: 'customerName',
      width: '200px',
      header: t('common.labels.customer'),
      render: (item: SalesOrder) => (
        <Text fz="md">{resolveSalesOrderCustomerName(item, getCustomerByCode) ?? '-'}</Text>
      ),
    };
    const assignedStaffColumn: DataTableColumn<SalesOrder> = {
      key: 'assignedStaff',
      width: '150px',
      header: t('salesOrders.columns.assignedStaff'),
      render: (item: SalesOrder) => {
        const staffId = item.extra?.assignedStaff;
        return <Text size="sm">{staffId ? (employeeMap.get(staffId) ?? '-') : '-'}</Text>;
      },
    };
    const labelsColumn: DataTableColumn<SalesOrder> = {
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
    };
    const subtotalColumn: DataTableColumn<SalesOrder> = {
      key: 'financeSubtotal',
      header: t('salesOrders.finance.subtotalLabel'),
      ta: 'right',
      width: '140px',
      filter: getColumnFilter?.('financeSubtotal'),
      render: (item: SalesOrder) => (
        <Text size="sm" ta="right">
          {computeSalesOrderTotals(item, vatRate).subtotal.toLocaleString()}
        </Text>
      ),
    };
    const vatColumn: DataTableColumn<SalesOrder> = {
      key: 'financeVat',
      header: t('salesOrders.finance.vatLabel'),
      ta: 'right',
      width: '130px',
      filter: getColumnFilter?.('financeVat'),
      render: (item: SalesOrder) => (
        <Text size="sm" ta="right">
          {computeSalesOrderTotals(item, vatRate).vat.toLocaleString()}
        </Text>
      ),
    };

    const itemsColumns: DataTableColumn<SalesOrder>[] = onShowItems
      ? [
          {
            key: '__items',
            header: '',
            width: '56px',
            ta: 'center',
            render: (item: SalesOrder) => (
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={t('salesOrders.detail.viewItems')}
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
      : [];

    if (view === 'finance') {
      return [
        ...leadColumns,
        customerColumn,
        {
          key: 'financeDate',
          header: (
            <SortHeader
              label={t('__new__.01-common.labels.orderDate')}
              field="createdAt"
              current={sortField}
              onChange={onSortChange}
            />
          ),
          width: '120px',
          render: (item: SalesOrder) => (
            <Text size="sm">{formatDate(getSalesOrderReadyDate(item))}</Text>
          ),
        },
        subtotalColumn,
        vatColumn,
        {
          key: 'financeGrandTotal',
          header: t('salesOrders.finance.grandTotalLabel'),
          ta: 'right',
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
      ];
    }

    if (view === 'warehouse') {
      return [
        ...selectionColumns,
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
          width: '120px',
          render: renderDeliveryDate,
        },
        customerColumn,
        ...(showPrice
          ? [
              subtotalColumn,
              vatColumn,
              {
                key: 'afterTax',
                header: t('salesOrders.finance.afterTaxLabel'),
                ta: 'right' as const,
                width: '150px',
                filter: getColumnFilter?.('afterTax'),
                render: (item: SalesOrder) => {
                  const { subtotal, vat } = computeSalesOrderTotals(item, vatRate);
                  return (
                    <Text size="sm" fw={600} ta="right">
                      {(subtotal + vat).toLocaleString()}
                    </Text>
                  );
                },
              },
            ]
          : []),
        {
          key: 'customerPONumber',
          header: t('salesOrders.form.customerPONumberLabel'),
          width: '160px',
          filter: getColumnFilter?.('customerPONumber'),
          render: (item: SalesOrder) => (
            <Text size="sm">{item.extra?.customerPONumber || '-'}</Text>
          ),
        },
        labelsColumn,
        assignedStaffColumn,
        ...itemsColumns,
      ];
    }

    const opsColumns: DataTableColumn<SalesOrder>[] = [
      ...leadColumns,
      customerColumn,
      assignedStaffColumn,
      ...(dateColumns === 'combinedReady'
        ? [
            {
              key: 'dates',

              header: (
                <Stack gap={2}>
                  <SortHeader
                    label={t('__new__.01-common.labels.orderDate')}
                    field="createdAt"
                    current={sortField}
                    onChange={onSortChange}
                  />
                  <SortHeader
                    label={t('salesOrders.columns.deliveryDate')}
                    field="deliveryDate"
                    current={sortField}
                    onChange={onSortChange}
                  />
                </Stack>
              ),
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
                <Text size="sm">{formatDateTime(getSalesOrderReadyDate(item))}</Text>
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
              render: renderDeliveryDate,
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
      labelsColumn,
      ...itemsColumns,
    ];
    return opsColumns.filter((el) => el.hidden !== true);
  }, [
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
    view,
    financeMode,
    showCheatMarker,
    vacuousCompletionIds,
    dateColumns,
    showPaymentColumns,
    statusBadgeVariant,
    getColumnFilter,
  ]);

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
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      loadingMoreLabel={loadingMoreLabel}
    />
  );
}
