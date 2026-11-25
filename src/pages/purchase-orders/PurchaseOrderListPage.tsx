import { employeeDisplayName } from '@/utils/employeeDisplayName';
import { Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { ROUTES } from '@/constants/routes';
import { setPurchaseOrderQueryRange, usePurchaseOrderStore } from '@/stores/usePurchaseOrderStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductStore } from '@/stores/useProductStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useListFilter } from '@/hooks/useListFilter';
import { useTransactionalRangeRefetch } from '@/hooks/useTransactionalRangeRefetch';
import {
  DesktopFilterBar,
  type SelectFilter,
  type MultiSelectFilter,
} from '@/components/DesktopFilterBar';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { FilterPill } from '@/components/FilterPill';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { multiOptionFilter } from '@/components/mobileFilterDefs';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { TransactionalFilterPillsRow } from '@/components/TransactionalFilterPillsRow';
import { type MoreFilterDef, type DateRangePreset } from '@/types/date-range';
import { EMPTY_DATE_RANGE, formatDateRangeLabel } from '@/utils/listFilterDateRange';
import {
  getPurchaseOrderPicDepartments,
  getSalesOrderPicDepartments,
  isLocationsEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import { useListScrollRestoration } from '@/hooks';
import type { PurchaseOrder } from '@/types';
import { PurchaseOrderCardList } from './PurchaseOrderCardList';
import { PurchaseOrderDataTable } from './PurchaseOrderDataTable';
import { PURCHASE_ORDER_STATUSES, findPurchaseOrderStatus } from './purchaseOrderStatuses';
import { PurchaseOrderPreviewDrawer } from './PurchaseOrderPreviewDrawer';
import { poCustomer, poItems, poStatus, poVendorNote, vnDayOf } from './purchaseOrderModel';
import { notArrivedCount, usePurchaseOrderArrivals } from './purchaseOrderArrivals';
import { PURCHASE_ORDER_RANGE_DAYS } from '@/stores/usePurchaseOrderStore';
import { addDaysToDay } from '@/utils/paymentTerms';
import { businessDateString } from '@/utils/code';
import { ListStatsCards } from '@/components/ListStatsCards';
import { usePurchaseOrderListFilters, type PaidFilter } from './usePurchaseOrderListFilters';
import { showPurchaseOrderVendor } from './purchaseOrderVendorAccess';
import { purchaseOrderViewScope, scopePurchaseOrdersToViewer } from './purchaseOrderViewScope';
import { useMyEmployee } from '@/hooks/useMyEmployee';

const isMobile = device.isMobile;
const canCreate = perms.purchaseOrder.canCreate();
const locationsEnabled = isLocationsEnabled();
const showVendor = showPurchaseOrderVendor();
const viewScope = purchaseOrderViewScope();
const picEmployeeFilter = makeEmployeeDepartmentFilter(getPurchaseOrderPicDepartments());

const requesterEmployeeFilter = makeEmployeeDepartmentFilter(getSalesOrderPicDepartments());

export function PurchaseOrderListPage() {
  const { t } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.PURCHASE_ORDERS.LIST);

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } =
    usePurchaseOrderStore(
      useShallow((s) => ({
        items: s.items,
        loading: s.loading,
        initialized: s.initialized,
        error: s.error,
        cachedAt: s.cachedAt,
        loadAll: s.loadAll,
        forceRefresh: s.forceRefresh,
      })),
    );

  const { items: vendors, loadAll: loadVendors, initialized: vendorsInit } = useVendorStore();
  const {
    items: customers,
    loadAll: loadCustomers,
    initialized: customersInit,
  } = useCustomerStore();
  const {
    items: employees,
    loadAll: loadEmployees,
    initialized: employeesInit,
  } = useEmployeeStore();
  const { loadAll: loadLocations, initialized: locationsInit } = useLocationStore();
  const products = useProductStore((s) => s.items);
  const [itemsOrder, setItemsOrder] = useState<PurchaseOrder | null>(null);

  const skuByItemCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      const sku = p.extra?.sku?.trim();
      if (sku) m.set(p.code, sku);
    }
    return m;
  }, [products]);

  const viewerId = useMyEmployee()?.id ?? null;
  const scopedItems = useMemo(
    () => scopePurchaseOrdersToViewer(items, viewerId, viewScope),
    [items, viewerId],
  );
  const filters = usePurchaseOrderListFilters(scopedItems, showVendor);

  const windowFromDay = filters.createdDateRange.from
    ? vnDayOf(filters.createdDateRange.from.toISOString())
    : addDaysToDay(businessDateString(), -PURCHASE_ORDER_RANGE_DAYS);
  const arrivals = usePurchaseOrderArrivals(windowFromDay, cachedAt);
  const employeeNameById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name] as const)),
    [employees],
  );

  const employeeListNameById = useMemo(
    () => new Map(employees.map((e) => [e.id, employeeDisplayName(e, 'shortName')] as const)),
    [employees],
  );

  useEffect(() => {
    if (!initialized && !error) loadAll();
    if (showVendor && !vendorsInit) loadVendors();
    if (!customersInit) loadCustomers();
    if (!employeesInit) loadEmployees();
    if (locationsEnabled && !locationsInit) loadLocations();
  }, [
    initialized,
    error,
    loadAll,
    vendorsInit,
    loadVendors,
    customersInit,
    loadCustomers,
    employeesInit,
    loadEmployees,
    locationsInit,
    loadLocations,
  ]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('purchaseOrders.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  useTransactionalRangeRefetch({
    range: filters.createdDateRange,
    setStoreRange: setPurchaseOrderQueryRange,
    forceRefresh,
  });

  const {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtered,
    paginated,
    totalPages,
  } = useListFilter(filters.allOrders, {
    filters: { _: 'noop' },
    filterFn: () => true,

    searchFields: (item) => {
      const fields: (string | undefined)[] = [
        item.orderNumber,
        showVendor ? item.vendorName : undefined,
        poCustomer(item)?.name,
        item.reference,
        item.notes,
        poVendorNote(item),
      ];
      for (const line of poItems(item)) {
        fields.push(line.itemName, line.itemCode, skuByItemCode.get(line.itemCode));
      }
      return fields;
    },
    search: filters.search,
    onSearchChange: filters.setSearch,
    page: filters.page,
    onPageChange: filters.setPage,
  });

  const countedOrders = useMemo(
    () => filtered.filter((o) => poStatus(o) !== 'cancelled'),
    [filtered],
  );
  const notArrived = notArrivedCount(countedOrders, arrivals);

  const cancelledOrders = useMemo(
    () => filtered.filter((o) => poStatus(o) === 'cancelled'),
    [filtered],
  );

  const hasActiveFilters = filters.hasActiveFilters || !!search;
  const showStatusPills = !isMobile;

  const statusFilterData = PURCHASE_ORDER_STATUSES.map((s) => ({
    value: s.value,
    label: t(s.labelKey),
  }));
  const vendorFilterData = useMemo(
    () =>
      (showVendor ? vendors : [])
        .filter((v) => !v.extra?.isDeleted)
        .map((v) => ({ value: v.code, label: v.extra?.shortName?.trim() || v.name })),
    [vendors],
  );

  const customerFilterData = useMemo(
    () =>
      customers
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.code, label: c.extra?.shortName || c.name })),
    [customers],
  );
  const customerMoreFilter: MoreFilterDef = {
    type: 'select',
    key: 'customer',
    title: t('common.labels.customer'),
    placeholder: t('common.labels.customer'),
    value: filters.customerFilter,
    options: customerFilterData,
    onChange: filters.setCustomerFilter,
  };
  const staffFilterData = useMemo(
    () => employees.filter(picEmployeeFilter).map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );
  const requesterFilterData = useMemo(
    () => employees.filter(requesterEmployeeFilter).map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );
  const paidFilterData = [
    { value: 'unpaid', label: t('purchaseOrders.payment.unpaid') },
    { value: 'partial', label: t('purchaseOrders.payment.partial') },
    { value: 'overdue', label: t('purchaseOrders.payment.overdue') },
    { value: 'paid', label: t('purchaseOrders.payment.paid') },
  ];
  const paidLabel = (v: PaidFilter) => paidFilterData.find((p) => p.value === v)?.label ?? v;

  const statusPlaceholder =
    filters.statusFilter.length === 0
      ? t('common.filters.all')
      : filters.statusFilter.length === 1
        ? t(findPurchaseOrderStatus(filters.statusFilter[0]).labelKey)
        : t('common.filters.statusCount', { count: filters.statusFilter.length });

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    yesterday: t('common.datePreset.yesterday'),
    tomorrow: t('common.datePreset.tomorrow'),
    thisWeek: t('common.datePreset.thisWeek'),
    lastWeek: t('common.datePreset.lastWeek'),
    nextWeek: t('common.datePreset.nextWeek'),
    custom: t('goodsReceipts.datePreset.custom'),
  };

  const desktopFilters: (SelectFilter | MultiSelectFilter)[] = [
    {
      value: filters.statusFilter,
      onChange: filters.setStatusFilter,
      data: statusFilterData,
      placeholder: statusPlaceholder,
      visible: true,
      w: 200,
      multi: true,
    },
    {
      value: filters.paidFilter,
      onChange: filters.setPaidFilter,
      data: paidFilterData,
      placeholder: t('purchaseOrders.columns.payment'),
      visible: true,
      w: 180,
    },
    {
      value: filters.vendorFilter,
      onChange: filters.setVendorFilter,
      data: vendorFilterData,
      placeholder: t('common.labels.vendor'),
      visible: vendorFilterData.length > 0,
      searchable: true,
      w: 250,
    },
    {
      value: filters.staffFilter,
      onChange: filters.setStaffFilter,
      data: staffFilterData,
      placeholder: t('common.labels.assignedTo'),
      visible: staffFilterData.length > 0,
      searchable: true,
      w: 220,
    },
    {
      value: filters.requestedByFilter,
      onChange: filters.setRequestedByFilter,
      data: requesterFilterData,
      placeholder: t('purchaseOrders.form.requestedByLabel'),
      visible: requesterFilterData.length > 0,
      searchable: true,
      w: 220,
    },
  ];

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [
    multiOptionFilter({
      title: t('__new__.01-common.labels.status'),
      displayValue: statusPlaceholder,
      value: filters.statusFilter,
      options: statusFilterData,
      onChange: filters.setStatusFilter,
      allLabel: t('common.filters.all'),
      visible: true,
    }),
  ];

  const dateAndExtraFilters: MoreFilterDef[] = [
    customerMoreFilter,
    {
      type: 'dateRange',
      key: 'createdDate',
      title: t('common.columns.createdDate'),
      value: filters.createdDateRange,
      onChange: filters.setCreatedDateRange,
    },
    {
      type: 'dateRange',
      key: 'deadline',
      title: t('purchaseOrders.form.paymentDeadlineLabel'),
      value: filters.deadlineDateRange,
      onChange: filters.setDeadlineDateRange,
    },
    {
      type: 'dateRange',
      key: 'orderDate',
      title: t('purchaseOrders.form.orderDateLabel'),
      value: filters.orderDateRange,
      onChange: filters.setOrderDateRange,
    },
  ];

  const mobileMoreFilters: MoreFilterDef[] = [
    {
      type: 'select',
      key: 'paid',
      title: t('purchaseOrders.columns.payment'),
      placeholder: t('purchaseOrders.columns.payment'),
      value: filters.paidFilter,
      options: paidFilterData,
      onChange: filters.setPaidFilter,
    },
    ...(showVendor
      ? [
          {
            type: 'select' as const,
            key: 'vendor',
            title: t('common.labels.vendor'),
            placeholder: t('common.labels.vendor'),
            value: filters.vendorFilter,
            options: vendorFilterData,
            onChange: filters.setVendorFilter,
          },
        ]
      : []),
    customerMoreFilter,
    {
      type: 'select',
      key: 'staff',
      title: t('common.labels.assignedTo'),
      placeholder: t('common.labels.assignedTo'),
      value: filters.staffFilter,
      options: staffFilterData,
      onChange: filters.setStaffFilter,
    },
    {
      type: 'select',
      key: 'requestedBy',
      title: t('purchaseOrders.form.requestedByLabel'),
      placeholder: t('purchaseOrders.form.requestedByLabel'),
      value: filters.requestedByFilter,
      options: requesterFilterData,
      onChange: filters.setRequestedByFilter,
    },
    ...dateAndExtraFilters,
  ];

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('purchaseOrders.title')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          createCta={{
            to: ROUTES.PURCHASE_ORDERS.NEW,
            label: t('purchaseOrders.addItem'),

            enabled: canCreate && !isMobile,
          }}
        />

        {/* The three figures are counts, not money (the totals are in mixed currencies and cannot
            be summed). `always` skips the enableStats and phone gates. Every figure is coloured at
            every value (owner's ask): blue the total, orange the not-yet-arrived (its dash too),
            red the cancelled, the cancelled pill's own colour. */}
        <ListStatsCards
          always
          visible={initialized}
          cols={{ base: 3, sm: 3 }}
          cells={[
            {
              key: 'orders',
              label: t('purchaseOrders.list.ordersTotal'),
              value: countedOrders.length,
              color: 'blue',
            },
            {
              key: 'notArrived',
              label: t('purchaseOrders.list.notArrived'),
              value: notArrived ?? '—',
              color: 'orange',
            },
            {
              key: 'cancelled',
              label: t('purchaseOrders.list.cancelledTotal'),
              value: cancelledOrders.length,
              color: 'red',
            },
          ]}
        />
        {arrivals.kind === 'unreadable' && (
          <Text size="xs" c="dimmed">
            {t('purchaseOrders.list.arrivalsUnreadable')}
          </Text>
        )}
        {isMobile ? (
          <MobileFilterBar
            recordCount={filters.allOrders.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('purchaseOrders.list.searchPlaceholder')}
            hideStatus
            filters={mobileFilters}
            moreSection={
              <MobileFilterMoreDrawer
                filters={mobileMoreFilters}
                drawerTitle={t('common.filters.more')}
                applyLabel={t('common.filters.apply')}
                presetLabels={presetLabels}
              />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={filters.clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('purchaseOrders.list.searchPlaceholder')}
            hideStatus
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover filters={dateAndExtraFilters} presetLabels={presetLabels} />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={filters.clearFilters}
          />
        )}

        <TransactionalFilterPillsRow
          defaultRange={{
            label: t('common.columns.createdDate'),
            range: filters.createdDateRange,
            presetLabels,
          }}
        >
          {showStatusPills &&
            filters.statusFilter.map((sf) => (
              <FilterPill
                key={sf}
                onClose={() =>
                  filters.setStatusFilter(filters.statusFilter.filter((v) => v !== sf))
                }
              >
                {t(findPurchaseOrderStatus(sf).labelKey)}
              </FilterPill>
            ))}
          {filters.paidFilter && (
            <FilterPill onClose={() => filters.setPaidFilter(null)}>
              {paidLabel(filters.paidFilter)}
            </FilterPill>
          )}
          {filters.vendorFilter && (
            <FilterPill onClose={() => filters.setVendorFilter(null)}>
              {vendorFilterData.find((v) => v.value === filters.vendorFilter)?.label ??
                filters.vendorFilter}
            </FilterPill>
          )}
          {filters.customerFilter && (
            <FilterPill onClose={() => filters.setCustomerFilter(null)}>
              {customerFilterData.find((c) => c.value === filters.customerFilter)?.label ??
                filters.customerFilter}
            </FilterPill>
          )}
          {filters.staffFilter && (
            <FilterPill onClose={() => filters.setStaffFilter(null)}>
              {staffFilterData.find((e) => e.value === filters.staffFilter)?.label ??
                filters.staffFilter}
            </FilterPill>
          )}
          {filters.requestedByFilter && (
            <FilterPill onClose={() => filters.setRequestedByFilter(null)}>
              {requesterFilterData.find((e) => e.value === filters.requestedByFilter)?.label ??
                filters.requestedByFilter}
            </FilterPill>
          )}
          {filters.orderDateRange.preset && (
            <FilterPill onClose={() => filters.setOrderDateRange(EMPTY_DATE_RANGE)}>
              {t('purchaseOrders.form.orderDateLabel')}:{' '}
              {formatDateRangeLabel(filters.orderDateRange, presetLabels)}
            </FilterPill>
          )}
          {filters.deadlineDateRange.preset && (
            <FilterPill onClose={() => filters.setDeadlineDateRange(EMPTY_DATE_RANGE)}>
              {t('purchaseOrders.form.paymentDeadlineLabel')}:{' '}
              {formatDateRangeLabel(filters.deadlineDateRange, presetLabels)}
            </FilterPill>
          )}
        </TransactionalFilterPillsRow>
      </StickyListChrome>

      {isMobile ? (
        <PurchaseOrderCardList
          orders={paginated}
          arrivals={arrivals}
          employeeListNameById={employeeListNameById}
          isLoading={loading && !initialized}
          onShowItems={setItemsOrder}
        />
      ) : (
        <PurchaseOrderDataTable
          orders={paginated}
          arrivals={arrivals}
          employeeNameById={employeeNameById}
          employeeListNameById={employeeListNameById}
          isLoading={loading && !initialized}
          viewportRef={scrollViewportRef}
          onShowItems={setItemsOrder}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <PurchaseOrderPreviewDrawer
        order={itemsOrder}
        onClose={() => setItemsOrder(null)}
        arrivals={arrivals}
        employeeNameById={employeeNameById}
      />
    </Stack>
  );
}
