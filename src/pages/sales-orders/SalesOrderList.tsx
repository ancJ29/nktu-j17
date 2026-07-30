import { Button, Drawer, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconTruckDelivery } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { getCurrentEmployeeId, getCurrentIsRoot } from '@/hooks/useCurrentEmployee';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device, logger } from '@credo/base-ui/utils';
import { exportSalesOrdersToExcel } from '@/utils/salesOrderExcel';
import { exportSalesOrdersToAccountingExcel } from '@/utils/salesOrderAccountingExcel';
import { useListFilter } from '@/hooks/useListFilter';
import { useSelectionMode } from '@/hooks/useRowSelection';
import { useTransactionalRangeRefetch } from '@/hooks/useTransactionalRangeRefetch';
import {
  DesktopFilterBar,
  type SelectFilter,
  type MultiSelectFilter,
} from '@/components/DesktopFilterBar';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { FilterPill } from '@/components/FilterPill';
import { ListPageHeader } from '@/components/ListPageHeader';
import { ListStatsCards, type ListStatCell } from '@/components/ListStatsCards';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { multiOptionFilter } from '@/components/mobileFilterDefs';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { QuickFilterChips, type QuickFilterChip } from '@/components/QuickFilterChips';
import { TransactionalFilterPillsRow } from '@/components/TransactionalFilterPillsRow';
import { type MoreFilterDef, type DateRangePreset } from '@/types/date-range';
import {
  EMPTY_DATE_RANGE,
  defaultLastNDaysRange,
  formatDateRangeLabel,
} from '@/utils/listFilterDateRange';
import {
  getPricingVatRate,
  getSalesOrderPicDepartments,
  isDeliveryRequestsEnabled,
  isInternalDeliveryAllowed,
  isPricingManagementEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { isSalesOrderBillingExempt, sumSalesOrderFinance } from '@/utils/salesOrderPricing';

import { collectVacuouslyCompletedSalesOrderIds } from './vacuousCompletionMarker';
import { BulkCreateDeliveryRequestModal } from './BulkCreateDeliveryRequestModal';
import { NKTUBulkCreateDeliveryRequestModal } from './NKTUBulkCreateDeliveryRequestModal';
import { useListScrollRestoration } from '@/hooks';
import { SalesOrderCardList } from './SalesOrderCardList';
import { SalesOrderDataTable } from './SalesOrderDataTable';
import { SalesOrderFinanceTotals } from './SalesOrderFinanceTotals';
import { OrderItemsTable } from './OrderItemsTable';
import { salesOrderFieldOptions } from './useSalesOrderFieldOptions';
import { useSalesOrderListFilters } from './useSalesOrderListFilters';
import type { SalesOrderListVariant } from './salesOrderListVariant';
import type { SalesOrder } from '@/types';

const isMobile = device.isMobile;

const FETCH_WINDOW_DAYS = 90;
const canCreate = perms.salesOrder.canCreate();

const canEditOrders = perms.salesOrder.canEdit();

const showPrice = isPricingManagementEnabled() && perms.salesOrder.canViewPrice();

const pricingVatRate = getPricingVatRate();
const canExport = perms.salesOrder.canExport();
const canViewAll = perms.salesOrder.canViewAll();
const canViewSelf = perms.salesOrder.canViewSelf();
const canViewSetComponentInventory = perms.salesOrder.canViewSetComponentInventory();
const deliveryEnabled = isDeliveryRequestsEnabled();

const canBulkCreateDeliveries = !isMobile && deliveryEnabled && perms.deliveryRequest.canCreate();
const internalDeliveryAllowed = isInternalDeliveryAllowed();

const deliveryKindFilterEnabled = deliveryEnabled && internalDeliveryAllowed;
const picEmployeeFilter = makeEmployeeDepartmentFilter(getSalesOrderPicDepartments());
const { statusOptions, resolveStatus, resolveDeliveryMethod, tagOptions } = salesOrderFieldOptions;

export function SalesOrderList({ variant }: { variant: SalesOrderListVariant }) {
  const { t, i18n } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.SALES_ORDERS.LIST);

  const isRootUser = useAuthStore((s) => s.user?.isRoot ?? false);

  const [bulkDrOpened, { open: openBulkDr, close: closeBulkDr }] = useDisclosure(false);

  const [itemsOrder, setItemsOrder] = useState<SalesOrder | null>(null);

  const [viewMode, setViewMode] = useState<'ops' | 'finance'>('ops');
  const financeMode = showPrice && viewMode === 'finance';

  const selection = useSelectionMode();
  const {
    selectionMode,
    selectedKeys: selectedIds,
    toggle: toggleRow,
    exitSelectionMode,
  } = selection;
  const enterSelectionMode = selection.enterSelectionMode;

  const {
    items: storeOrders,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useSalesOrderStore();

  const {
    items: customers,
    loadAll: loadCustomers,
    initialized: customersInit,
    getByCode: getCustomerByCode,
  } = useCustomerStore();
  const {
    items: employees,
    loadAll: loadEmployees,
    initialized: employeesInit,
  } = useEmployeeStore();

  const deliveryRequests = useDeliveryRequestStore((s) => s.items);
  const drInitialized = useDeliveryRequestStore((s) => s.initialized);
  const loadDeliveryRequests = useDeliveryRequestStore((s) => s.loadAll);

  const visibleStoreOrders = useMemo(() => {
    const live = storeOrders.filter((o) => !o.extra?.isDeleted);
    if (canViewAll) return live;
    if (!canViewSelf) return [];
    const me = getCurrentEmployeeId();
    if (!me) return [];
    return live.filter((o) => o.extra?.assignedStaff === me);
  }, [storeOrders]);

  const filters = useSalesOrderListFilters(
    visibleStoreOrders,
    variant.defaultDateRangeDays,
    variant.internalDeliveryFirstSort,
  );

  useEffect(() => {
    if (!initialized && !error) loadAll();
    if (!customersInit) loadCustomers();
    if (!employeesInit) loadEmployees();

    if (
      ((canBulkCreateDeliveries && variant.bulkDrMode === 'selection') || isRootUser) &&
      !drInitialized
    )
      loadDeliveryRequests();
  }, [
    initialized,
    error,
    loadAll,
    customersInit,
    loadCustomers,
    employeesInit,
    loadEmployees,
    drInitialized,
    loadDeliveryRequests,
    variant.bulkDrMode,
    isRootUser,
  ]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('salesOrders.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const fetchRange = useMemo(() => defaultLastNDaysRange(FETCH_WINDOW_DAYS), []);
  useTransactionalRangeRefetch({
    range: fetchRange,
    setStoreRange: setSalesOrderQueryRange,
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
    filters: {
      status: filters.statusFilter,
      customer: filters.customerFilter,
      staff: filters.staffFilter,
    },
    filterFn: () => true,
    searchFields: (item) => [
      item.orderNumber,
      resolveSalesOrderCustomerName(item, getCustomerByCode) ?? '',
    ],

    search: filters.search,
    onSearchChange: filters.setSearch,
    page: filters.page,
    onPageChange: filters.setPage,
  });

  const clearAll = filters.clearFilters;

  const hasActiveFilters = filters.hasActiveFilters || !!search;

  const financeSummary = useMemo(() => sumSalesOrderFinance(filtered, pricingVatRate), [filtered]);

  const handleToggleBillingExempt = useCallback(
    async (order: SalesOrder) => {
      const nextExempt = !isSalesOrderBillingExempt(order.extra);
      const { billingNotRequired: _drop, ...restExtra } = order.extra ?? {};
      const nextExtra = nextExempt ? { ...restExtra, billingNotRequired: true } : restExtra;
      try {
        await useSalesOrderStore.getState().updateSafely({
          id: order.id,
          version: order.version,
          patch: { extra: nextExtra },
        });
      } catch (err) {
        if (err instanceof EntityConflictError) {
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
          forceRefresh();
        } else {
          logger.error('Toggle sales-order billing-exempt failed:', err);
          notifications.show({
            color: 'red',
            message: t('salesOrders.finance.exemptError'),
          });
        }
      }
    },
    [t, forceRefresh],
  );

  const ordersWithDR = useMemo(() => {
    const s = new Set<string>();
    for (const dr of deliveryRequests) {
      if (dr.salesOrderId && !dr.extra?.isDeleted) s.add(dr.salesOrderId);
    }
    return s;
  }, [deliveryRequests]);

  const vacuousCompletionIds = useMemo(
    () =>
      isRootUser && drInitialized
        ? collectVacuouslyCompletedSalesOrderIds(paginated, ordersWithDR)
        : undefined,
    [isRootUser, drInitialized, paginated, ordersWithDR],
  );

  const selectedOrders = useMemo(
    () => filtered.filter((o) => selectedIds.has(o.id) && !ordersWithDR.has(o.id)),
    [filtered, selectedIds, ordersWithDR],
  );

  const selectableOnPage = useMemo(
    () => paginated.filter((o) => !ordersWithDR.has(o.id)),
    [paginated, ordersWithDR],
  );
  const selectableOnPageIds = useMemo(() => selectableOnPage.map((o) => o.id), [selectableOnPage]);
  const { allSelected: allPageSelected, someSelected: somePageSelected } =
    selection.headerState(selectableOnPageIds);
  const toggleAllOnPage = useCallback(
    () => selection.toggleAllIn(selectableOnPageIds),
    [selection, selectableOnPageIds],
  );

  const statusFilterData = useMemo(
    () => statusOptions.map((s) => ({ value: s.value, label: s.label })),
    [],
  );

  const customerFilterData = useMemo(
    () =>
      customers
        .filter((c) => c.isActive)
        .map((c) => ({ value: c.code, label: c.extra?.shortName || c.name })),
    [customers],
  );

  const staffFilterData = useMemo(
    () => employees.filter(picEmployeeFilter).map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );

  const employeeNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const employeeCodes = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.code);
    return m;
  }, [employees]);
  const myDepartment = useMemo(() => {
    const me = getCurrentEmployeeId();
    return me ? (employees.find((e) => e.id === me)?.department ?? null) : null;
  }, [employees]);
  const canAccountingExport =
    !!variant.accountingExport &&
    (getCurrentIsRoot() ||
      (!!myDepartment && variant.accountingExport.allowedDepartments.includes(myDepartment)));

  const handleAccountingExport = useCallback(() => {
    if (filtered.length === 0) {
      notifications.show({
        color: 'yellow',
        message: t('__new__.07-entities.salesOrders.notifications.exportEmpty'),
      });
      return;
    }
    try {
      exportSalesOrdersToAccountingExcel(filtered, {
        getCustomerByCode,
        employeeCodes,
        fallbackVatRate: getPricingVatRate(),
      });
      notifications.show({
        color: 'green',
        message: t('__new__.07-entities.salesOrders.notifications.exportSuccess', {
          count: filtered.length,
        }),
      });
    } catch (err) {
      logger.error('Sales order accounting export failed:', err);
      notifications.show({
        color: 'red',
        message: t('__new__.07-entities.salesOrders.notifications.exportError'),
      });
    }
  }, [filtered, getCustomerByCode, employeeCodes, t]);

  const handleExport = useCallback(() => {
    if (filtered.length === 0) {
      notifications.show({
        color: 'yellow',
        message: t('__new__.07-entities.salesOrders.notifications.exportEmpty'),
      });
      return;
    }
    try {
      const exportable = canViewSetComponentInventory
        ? filtered
        : filtered.map((o) => ({
            ...o,
            items: (o.items ?? []).filter((it) => it.role !== 'set-component'),
          }));
      exportSalesOrdersToExcel(exportable, {
        language: i18n.language,
        resolveStatus,
        resolveDeliveryMethod,
        employeeNames,
        getCustomerByCode,
        tagOptions,
        pricingEnabled: showPrice,
      });
      notifications.show({
        color: 'green',
        message: t('__new__.07-entities.salesOrders.notifications.exportSuccess', {
          count: filtered.length,
        }),
      });
    } catch (err) {
      logger.error('Sales order export failed:', err);
      notifications.show({
        color: 'red',
        message: t('__new__.07-entities.salesOrders.notifications.exportError'),
      });
    }
  }, [filtered, i18n.language, employeeNames, getCustomerByCode, t]);

  const statsCells = useMemo<ListStatCell[]>(() => {
    const byCounts: Record<string, number> = {};
    for (const o of filtered) {
      const s = o.extra?.status ?? 'unknown';
      byCounts[s] = (byCounts[s] ?? 0) + 1;
    }
    const statusCells: ListStatCell[] = statusOptions
      .filter((s) => s.stage !== 'COMPLETED' && s.stage !== 'EXCEPTIONAL')
      .slice(0, 3)
      .map((s) => ({
        key: s.value,
        label: s.label,
        value: byCounts[s.value] ?? 0,
        color: s.color,
      }));
    return [
      { key: 'total', label: t('salesOrders.stats.total'), value: filtered.length },
      ...statusCells,
    ];
  }, [filtered, t]);

  const statusPlaceholder = useMemo(() => {
    if (filters.statusFilter.length === 0) return t('__new__.01-common.filters.all');
    if (filters.statusFilter.length === 1) return resolveStatus(filters.statusFilter[0]).label;
    return t('common.filters.statusCount', { count: filters.statusFilter.length });
  }, [filters.statusFilter, t]);

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    ...(variant.showExtraDatePresets && {
      yesterday: t('common.datePreset.yesterday'),
      tomorrow: t('common.datePreset.tomorrow'),
    }),
    thisWeek: t('common.datePreset.thisWeek'),
    ...(variant.showExtraDatePresets && { lastWeek: t('common.datePreset.lastWeek') }),
    nextWeek: t('common.datePreset.nextWeek'),
    custom: t('salesOrders.datePreset.custom'),
  };

  const desktopFilters: (SelectFilter | MultiSelectFilter)[] = [
    {
      value: filters.statusFilter,
      onChange: filters.setStatusFilter,
      data: statusFilterData,
      placeholder: statusPlaceholder,
      visible: statusFilterData.length > 0,
      w: 200,
      multi: true,
    },
    {
      value: filters.customerFilter,
      onChange: filters.setCustomerFilter,
      data: customerFilterData,
      placeholder: t('common.labels.customer'),
      visible: customerFilterData.length > 0,
      searchable: true,
      w: 250,
    },
    {
      value: filters.staffFilter,
      onChange: filters.setStaffFilter,
      data: staffFilterData,
      placeholder: t('salesOrders.filterStaff'),

      visible: canViewAll && staffFilterData.length > 0,
      searchable: true,
      w: 250,
    },
  ];

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [
    multiOptionFilter({
      title: t('__new__.01-common.labels.status'),
      displayValue: statusPlaceholder,
      value: filters.statusFilter,
      options: statusFilterData,
      onChange: filters.setStatusFilter,
      allLabel: t('__new__.01-common.filters.all'),
      visible: statusFilterData.length > 0,
    }),
  ];

  const dateAndUrgentFilters: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'createdDate',
      title: t('salesOrders.columns.orderDate'),
      value: filters.createdDateRange,
      onChange: filters.setCreatedDateRange,
    },
    {
      type: 'dateRange',
      key: 'deliveryDate',
      title: t('salesOrders.columns.deliveryDate'),
      value: filters.deliveryDateRange,
      onChange: filters.setDeliveryDateRange,
    },
    {
      type: 'switch',
      key: 'urgent',
      title: t('salesOrders.filterUrgentOnly'),
      value: filters.urgentOnly,
      onChange: filters.setUrgentOnly,
      color: 'red',
    },
  ];

  const mobileQuickChips: QuickFilterChip[] = useMemo(() => {
    const chips: QuickFilterChip[] = [
      {
        key: 'urgent',
        label: t('salesOrders.filterUrgentOnly'),
        active: filters.urgentOnly,
        onClick: () => filters.setUrgentOnly(!filters.urgentOnly),
      },
    ];
    if (deliveryKindFilterEnabled) {
      chips.push(
        {
          key: 'internal',
          label: t('__new__.07-entities.salesOrders.list.filterInternalDelivery'),
          active: filters.deliveryKind === 'internal',
          onClick: () =>
            filters.setDeliveryKind(filters.deliveryKind === 'internal' ? 'all' : 'internal'),
        },
        {
          key: 'external',
          label: t('__new__.07-entities.salesOrders.list.filterExternalDelivery'),
          active: filters.deliveryKind === 'external',
          onClick: () =>
            filters.setDeliveryKind(filters.deliveryKind === 'external' ? 'all' : 'external'),
        },
      );
    }
    return chips;
  }, [filters, t]);

  const mobileMoreFilters: MoreFilterDef[] = [
    {
      type: 'select',
      key: 'customer',
      title: t('common.labels.customer'),
      placeholder: t('common.labels.customer'),
      value: filters.customerFilter,
      options: customerFilterData,
      onChange: filters.setCustomerFilter,
    },

    ...(canViewAll
      ? ([
          {
            type: 'select',
            key: 'staff',
            title: t('salesOrders.filterStaff'),
            placeholder: t('salesOrders.filterStaff'),
            value: filters.staffFilter,
            options: staffFilterData,
            onChange: filters.setStaffFilter,
          },
        ] satisfies MoreFilterDef[])
      : []),

    ...dateAndUrgentFilters.filter((f) => f.key !== 'urgent'),
  ];

  const showStatusPills = !isMobile && !filters.statusFilterIsDefault;
  const showUrgentPill = !isMobile;

  const showDeliveryKindPill = !isMobile || !deliveryKindFilterEnabled;

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('salesOrders.title')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          extraActions={
            <>
              {canBulkCreateDeliveries &&
                (variant.bulkDrMode === 'selection' ? (
                  selectionMode ? (
                    <>
                      <Button variant="default" size="sm" onClick={exitSelectionMode}>
                        {t('__new__.01-common.actions.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        leftSection={<IconTruckDelivery size={16} />}
                        onClick={openBulkDr}
                        disabled={selectedOrders.length === 0}
                      >
                        {t('deliveryRequests.bulkCreate.createButton', {
                          count: selectedOrders.length,
                        })}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      leftSection={<IconTruckDelivery size={16} />}
                      onClick={enterSelectionMode}
                    >
                      {t('deliveryRequests.bulkCreate.openButton')}
                    </Button>
                  )
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<IconTruckDelivery size={16} />}
                    onClick={openBulkDr}
                  >
                    {t('deliveryRequests.bulkCreate.openButton')}
                  </Button>
                ))}
              {canExport && (
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  onClick={handleExport}
                  disabled={filtered.length === 0}
                >
                  {t('__new__.01-common.actions.exportExcel')}
                </Button>
              )}
              {canAccountingExport && (
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  onClick={handleAccountingExport}
                  disabled={filtered.length === 0}
                >
                  {t('__new__.07-entities.salesOrders.list.accountingExportButton')}
                </Button>
              )}
            </>
          }
          createCta={{
            to: ROUTES.SALES_ORDERS.NEW,
            label: t('salesOrders.addItem'),
            enabled: canCreate,
          }}
        />

        {showPrice && (
          <Group justify="flex-start">
            <SegmentedControl
              size="sm"
              value={viewMode}
              onChange={(v) => setViewMode(v as 'ops' | 'finance')}
              data={[
                { value: 'ops', label: t('salesOrders.finance.viewOps') },
                { value: 'finance', label: t('salesOrders.finance.viewFinance') },
              ]}
            />
          </Group>
        )}

        {variant.showStatsCards && <ListStatsCards visible={initialized} cells={statsCells} />}

        {isMobile && <QuickFilterChips chips={mobileQuickChips} />}

        {/* Filter bar */}
        {isMobile ? (
          <MobileFilterBar
            recordCount={filters.allOrders.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.salesOrders.list.searchPlaceholder')}
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
            onClear={clearAll}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.salesOrders.list.searchPlaceholder')}
            hideStatus
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover
                filters={dateAndUrgentFilters}
                presetLabels={presetLabels}
              />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        )}

        <TransactionalFilterPillsRow
          defaultRange={{
            label: t('salesOrders.columns.orderDate'),
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
                {resolveStatus(sf).label}
              </FilterPill>
            ))}
          {filters.customerFilter && (
            <FilterPill onClose={() => filters.setCustomerFilter(null)}>
              {customerFilterData.find((c) => c.value === filters.customerFilter)?.label ??
                filters.customerFilter}
            </FilterPill>
          )}
          {canViewAll && filters.staffFilter && (
            <FilterPill onClose={() => filters.setStaffFilter(null)}>
              {staffFilterData.find((e) => e.value === filters.staffFilter)?.label ??
                employeeNames.get(filters.staffFilter) ??
                filters.staffFilter}
            </FilterPill>
          )}
          {showUrgentPill && filters.urgentOnly && (
            <FilterPill color="red" onClose={() => filters.setUrgentOnly(false)}>
              {t('salesOrders.filterUrgentOnly')}
            </FilterPill>
          )}
          {showDeliveryKindPill && filters.deliveryKind !== 'all' && (
            <FilterPill onClose={() => filters.setDeliveryKind('all')}>
              {filters.deliveryKind === 'internal'
                ? t('__new__.07-entities.salesOrders.list.filterInternalDelivery')
                : t('__new__.07-entities.salesOrders.list.filterExternalDelivery')}
            </FilterPill>
          )}
          {filters.deliveryDateRange.preset && (
            <FilterPill onClose={() => filters.setDeliveryDateRange(EMPTY_DATE_RANGE)}>
              {t('salesOrders.columns.deliveryDate')}:{' '}
              {formatDateRangeLabel(filters.deliveryDateRange, presetLabels)}
            </FilterPill>
          )}
        </TransactionalFilterPillsRow>
      </StickyListChrome>

      {isMobile ? (
        <SalesOrderCardList
          orders={paginated}
          isLoading={loading && !initialized}
          resolveStatus={resolveStatus}
          resolveDeliveryMethod={resolveDeliveryMethod}
          employees={employees}
          tagOptions={tagOptions}
          showCheatMarker={isRootUser}
          vacuousCompletionIds={vacuousCompletionIds}
          financeMode={financeMode}
          onToggleBillingExempt={canEditOrders ? handleToggleBillingExempt : undefined}
          statusBadgeVariant={variant.statusBadge}
          {...(variant.showItemsPreview && !financeMode && { onShowItems: setItemsOrder })}
        />
      ) : (
        <SalesOrderDataTable
          orders={paginated}
          isLoading={loading && !initialized}
          viewportRef={scrollViewportRef}
          resolveStatus={resolveStatus}
          resolveDeliveryMethod={resolveDeliveryMethod}
          employees={employees}
          tagOptions={tagOptions}
          showCheatMarker={isRootUser}
          vacuousCompletionIds={vacuousCompletionIds}
          sortField={filters.sortField}
          onSortChange={filters.setSortField}
          financeMode={financeMode}
          dateColumns={variant.dateColumns}
          showPaymentColumns={variant.showPaymentColumns}
          statusBadgeVariant={variant.statusBadge}
          {...(variant.showItemsPreview && !financeMode && { onShowItems: setItemsOrder })}
          {...(variant.bulkDrMode === 'selection' && {
            selectable: canBulkCreateDeliveries && selectionMode,
            selectedIds,
            onToggleRow: toggleRow,
            onToggleAll: toggleAllOnPage,
            allSelected: allPageSelected,
            someSelected: somePageSelected,
            disabledIds: ordersWithDR,
          })}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {financeMode && <SalesOrderFinanceTotals summary={financeSummary} />}

      {canBulkCreateDeliveries &&
        (variant.bulkDrMode === 'selection' ? (
          <NKTUBulkCreateDeliveryRequestModal
            opened={bulkDrOpened}
            onClose={closeBulkDr}
            salesOrders={selectedOrders}
            getCustomerByCode={getCustomerByCode}
            onCreated={exitSelectionMode}
            t={t}
          />
        ) : (
          <BulkCreateDeliveryRequestModal
            opened={bulkDrOpened}
            onClose={closeBulkDr}
            salesOrders={filtered}
            getCustomerByCode={getCustomerByCode}
            resolveStatus={resolveStatus}
            t={t}
          />
        ))}

      {variant.showItemsPreview && (
        <Drawer
          opened={itemsOrder !== null}
          onClose={() => setItemsOrder(null)}
          position="bottom"
          size={isMobile ? '85%' : '60%'}
          title={
            itemsOrder && (
              <Group gap="xs" wrap="nowrap">
                <Text fw={700}>{t('salesOrders.detail.itemsTitle')}</Text>
                <Text fw={500}>{itemsOrder.orderNumber}</Text>
                <Text c="dimmed">
                  {resolveSalesOrderCustomerName(itemsOrder, getCustomerByCode) ?? ''}
                </Text>
              </Group>
            )
          }
        >
          {itemsOrder && (
            <OrderItemsTable
              items={itemsOrder.items}
              totalAmount={itemsOrder.totalAmount}
              showShortageAlert={false}
            />
          )}
        </Drawer>
      )}
    </Stack>
  );
}
