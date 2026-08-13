import { Button, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import {
  setTransportOrderQueryRange,
  useTransportOrderStore,
} from '@/stores/useTransportOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { ListStatsCards, type ListStatCell } from '@/components/ListStatsCards';
import { QuickFilterChips, type QuickFilterChip } from '@/components/QuickFilterChips';
import { ListPagination } from '@/components/custom/ListPagination';
import {
  DesktopFilterBar,
  type MultiSelectFilter,
  type SelectFilter,
} from '@/components/DesktopFilterBar';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { allOptionFilter, multiOptionFilter } from '@/components/mobileFilterDefs';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { FilterPill } from '@/components/FilterPill';
import { TransactionalFilterPillsRow } from '@/components/TransactionalFilterPillsRow';
import { device, logger } from '@credo/base-ui/utils';
import { perms, resolveCustomerReportType } from '@/utils/permission';
import { useListScrollRestoration } from '@/hooks';
import { useListFilter } from '@/hooks/useListFilter';
import { useTransactionalRangeRefetch } from '@/hooks/useTransactionalRangeRefetch';
import { EMPTY_DATE_RANGE, type DateRangePreset, type MoreFilterDef } from '@/types/date-range';
import { formatDateRangeLabel } from '@/utils/listFilterDateRange';
import { exportTransportOrdersToExcel } from '@/utils/transportOrderExcel';
import { exportCustomerReport } from '@/utils/customerReports';
import { getCompanyInfo } from '@/config/companyInfo';
import { TransportOrderCardList } from './TransportOrderCardList';
import { TransportOrderDataTable } from './TransportOrderDataTable';
import { formatMoney, orderTotals, orderTripLaborTotal } from './transportOrderPricing';
import { transportOrderStatuses } from './transportOrderStatuses';
import { useTransportOrderListFilters } from './useTransportOrderListFilters';
import { useContainerSizeLabel, useContainerSizeOptions } from './containerSize';
import { useFeeNameLabel, useFeeNameOptions } from './feeName';
import { useShipmentTypeLabel, useShipmentTypeOptions } from './shipmentType';
import { truckOptionLabel, useTruckPlate } from './truckDisplay';
import { useTruckTypeLabel, useTruckTypeOptions } from '../transport-routes/truckType';
import type { TransportOrderShipmentType } from '@/types';

const isMobile = device.isMobile;
const canCreate = perms.transportOrder.canCreate();
const canExport = perms.transportOrder.canExport();

const canViewPrice = perms.transportOrder.canViewPrice();

const RANGE_DAYS = 14;

export function TransportOrderListPage() {
  const { t, i18n } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.TRANSPORT_ORDERS.LIST);

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } =
    useTransportOrderStore(
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

  const filters = useTransportOrderListFilters(items, RANGE_DAYS);

  const customers = useCustomerStore((s) => s.items);
  const customersInit = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  const trucks = useTruckAssetStore((s) => s.items);
  const trucksInit = useTruckAssetStore((s) => s.initialized);
  const loadTrucks = useTruckAssetStore((s) => s.loadAll);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);
  useEffect(() => {
    if (!customersInit) loadCustomers();
    if (!employeesInit) loadEmployees();
    if (!trucksInit) loadTrucks();
  }, [customersInit, loadCustomers, employeesInit, loadEmployees, trucksInit, loadTrucks]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('transportOrders.notifications.loadError'),
        message: '',
      });
    }
  }, [error, t]);

  useTransactionalRangeRefetch({
    range: filters.createdDateRange,
    setStoreRange: setTransportOrderQueryRange,
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
    filters: {},
    filterFn: () => true,
    searchFields: (o) => [
      o.orderNumber,
      o.truckPlate,
      o.driverName,
      o.billNumber,
      o.containerNumber,
      o.route?.pickup ?? '',
      o.route?.stuffing ?? '',
      o.route?.dropoff ?? '',
      o.notes,

      ...(o.trips ?? []).flatMap((trip) => [
        trip.truckPlate,
        trip.driverName,
        trip.departure,
        trip.destination,
      ]),
    ],

    search: filters.search,
    onSearchChange: filters.setSearch,
    page: filters.page,
    onPageChange: filters.setPage,
  });

  const statusData = useMemo(
    () => transportOrderStatuses().map((s) => ({ value: s.value, label: s.label })),

    [i18n.language],
  );
  const statusLabel = (v: string) => statusData.find((s) => s.value === v)?.label ?? v;

  const customerData = useMemo(
    () =>
      customers
        .filter((c) => c.isActive && !c.extra?.isDeleted)
        .map((c) => ({ value: c.code, label: c.extra?.shortName || c.name })),
    [customers],
  );
  const customerLabel = (code: string) => customerData.find((c) => c.value === code)?.label ?? code;

  const truckData = useMemo(
    () =>
      trucks
        .filter((tr) => tr.isActive && !tr.extra?.isDeleted)
        .map((tr) => ({ value: tr.id, label: truckOptionLabel(tr) })),
    [trucks],
  );
  const truckLabel = (id: string) => truckData.find((tr) => tr.value === id)?.label ?? id;

  const driverData = useMemo(() => {
    const driverIds = new Set<string>();
    for (const o of items) {
      if (o.driverId) driverIds.add(o.driverId);
      for (const trip of o.trips ?? []) if (trip.driverId) driverIds.add(trip.driverId);
    }
    return employees
      .filter((e) => driverIds.has(e.id))
      .map((e) => ({ value: e.id, label: e.name }));
  }, [items, employees]);
  const driverLabel = (id: string) => driverData.find((e) => e.value === id)?.label ?? id;

  const shipmentData = useShipmentTypeOptions();
  const shipmentTypeLabel = useShipmentTypeLabel();

  const containerSizeData = useContainerSizeOptions();
  const containerSizeLabel = useContainerSizeLabel();

  const feeNameLabel = useFeeNameLabel();
  const feeNameOptions = useFeeNameOptions();

  const truckTypeData = useTruckTypeOptions();
  const truckTypeLabel = useTruckTypeLabel();

  const getTruckPlate = useTruckPlate();

  const handleExport = () => {
    if (filtered.length === 0) {
      notifications.show({
        color: 'yellow',
        message: t('transportOrders.notifications.exportEmpty'),
      });
      return;
    }
    try {
      exportTransportOrdersToExcel(filtered, {
        language: i18n.language,

        companyName: getCompanyInfo().name,
        resolveStatus: statusLabel,
        resolveShipmentType: shipmentTypeLabel,
        resolveContainerSize: containerSizeLabel,
        resolveFeeName: feeNameLabel,

        feeNames: feeNameOptions.map((o) => o.label),
        getTruckPlate,

        resolveCustomer: (code) => customerData.find((c) => c.value === code)?.label,
        includeMoney: canViewPrice,
      });
      notifications.show({
        color: 'green',
        message: t('transportOrders.notifications.exportSuccess', { count: filtered.length }),
      });
    } catch (err) {
      logger.error('Transport order export failed:', err);
      notifications.show({
        color: 'red',
        message: t('transportOrders.notifications.exportError'),
      });
    }
  };

  const handleExportCustomerReport = () => {
    const code = filters.customerFilter;
    if (!code) {
      notifications.show({
        color: 'yellow',
        message: t('transportOrders.notifications.customerReportNeedCustomer'),
      });
      return;
    }
    const customer = customers.find((c) => c.code === code);

    const shipmentSuffix =
      filters.shipmentFilter !== 'all'
        ? `- ${shipmentTypeLabel(filters.shipmentFilter).toLocaleUpperCase('vi')}`
        : undefined;
    try {
      const count = exportCustomerReport(resolveCustomerReportType(code), filtered, {
        seller: getCompanyInfo(),
        customer: {
          name: customer?.name ?? filtered.find((o) => o.customerName)?.customerName ?? code,
          address: customer?.address,
          taxCode: customer?.extra?.taxCode,
        },
        resolveShipmentType: shipmentTypeLabel,
        resolveContainerSize: containerSizeLabel,
        resolveFeeName: feeNameLabel,
        getTruckPlate,
        titleSuffix: shipmentSuffix,
        fileTag: code,
      });
      if (count === 0) {
        notifications.show({
          color: 'yellow',
          message: t('transportOrders.notifications.exportEmpty'),
        });
        return;
      }
      notifications.show({
        color: 'green',
        message: t('transportOrders.notifications.customerReportSuccess', { count }),
      });
    } catch (err) {
      logger.error('Customer report export failed:', err);
      notifications.show({
        color: 'red',
        message: t('transportOrders.notifications.exportError'),
      });
    }
  };

  const statusPlaceholder = useMemo(() => {
    if (filters.statusFilter.length === 0) return t('__new__.01-common.labels.status');
    if (filters.statusFilter.length === 1) return statusLabel(filters.statusFilter[0]!);
    return t('common.filters.statusCount', { count: filters.statusFilter.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.statusFilter, statusData, t]);

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    yesterday: t('common.datePreset.yesterday'),
    thisWeek: t('common.datePreset.thisWeek'),
    lastWeek: t('common.datePreset.lastWeek'),
    thisMonth: t('common.datePreset.thisMonth'),
    lastMonth: t('common.datePreset.lastMonth'),
    custom: t('common.datePreset.custom'),
  };

  const statsCells: ListStatCell[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of filtered) counts[o.status] = (counts[o.status] ?? 0) + 1;

    let revenue = 0;
    let driverPay = 0;
    let balanceDue = 0;
    if (canViewPrice) {
      for (const o of filtered) {
        if (o.extra?.cancellation) continue;
        const totals = orderTotals(o);
        revenue += totals.serviceSubtotal;
        balanceDue += totals.balanceDue;
        driverPay += orderTripLaborTotal(o);
      }
    }

    return [
      { key: 'total', label: t('transportOrders.stats.total'), value: filtered.length },

      ...transportOrderStatuses()
        .slice(0, 3)
        .map((s) => ({
          key: s.value,
          label: s.label,
          value: counts[s.value] ?? 0,
          color: s.color,
        })),
      ...(canViewPrice
        ? ([
            {
              key: 'revenue',
              label: t('transportOrders.stats.revenue'),
              value: formatMoney(revenue),
              color: 'teal',
            },
            {
              key: 'driverPay',
              label: t('transportOrders.stats.driverPay'),
              value: formatMoney(driverPay),
              color: 'orange',
            },
            {
              key: 'balanceDue',
              label: t('transportOrders.stats.balanceDue'),
              value: formatMoney(balanceDue),
              color: 'red',
            },
          ] as ListStatCell[])
        : []),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `i18n.language` is the intended key: the status resolver reads the active language internally, so labels must re-resolve on a language switch.
  }, [filtered, i18n.language, t]);

  const desktopFilters: (SelectFilter | MultiSelectFilter)[] = [
    {
      multi: true,
      value: filters.statusFilter,
      onChange: filters.setStatusFilter,
      data: statusData,
      placeholder: statusPlaceholder,
      w: 200,
    },
    {
      value: filters.shipmentFilter === 'all' ? null : filters.shipmentFilter,
      onChange: (v) => filters.setShipmentFilter(v ?? 'all'),
      data: shipmentData,
      placeholder: t('transportOrders.form.shipmentType'),
      visible: shipmentData.length > 0,
      w: 150,
    },
    {
      value: filters.truckFilter,
      onChange: filters.setTruckFilter,
      data: truckData,
      placeholder: t('transportOrders.columns.truck'),
      visible: truckData.length > 0,
      searchable: true,
      w: 180,
    },
    {
      value: filters.customerFilter,
      onChange: filters.setCustomerFilter,
      data: customerData,
      placeholder: t('transportOrders.form.customer'),
      visible: customerData.length > 0,
      searchable: true,
      w: 200,
    },
  ];

  const allLabel = t('__new__.01-common.filters.all');

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [
    multiOptionFilter({
      title: t('__new__.01-common.labels.status'),
      displayValue: filters.statusFilter.length === 0 ? allLabel : statusPlaceholder,
      value: filters.statusFilter,
      options: statusData,
      onChange: filters.setStatusFilter,
      allLabel,
      visible: statusData.length > 0,
    }),
    allOptionFilter({
      title: t('transportOrders.columns.truck'),
      value: filters.truckFilter,
      options: truckData,
      onChange: filters.setTruckFilter,
      allLabel,
      emptyValue: null,
      visible: truckData.length > 0,
    }),
  ];

  const moreFilters: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'createdDate',
      title: t('transportOrders.filters.createdDate'),
      value: filters.createdDateRange,
      onChange: filters.setCreatedDateRange,
    },
    {
      type: 'dateRange',
      key: 'entryDate',
      title: t('transportOrders.columns.date'),
      value: filters.entryDateRange,
      onChange: filters.setEntryDateRange,
    },

    ...(truckTypeData.length > 0
      ? ([
          {
            type: 'select',
            key: 'truckType',
            title: t('transportOrders.filters.truckType'),
            placeholder: t('__new__.01-common.filters.all'),
            value: filters.truckTypeFilter,
            options: truckTypeData,
            onChange: filters.setTruckTypeFilter,
          },
        ] as MoreFilterDef[])
      : []),
    {
      type: 'select',
      key: 'driver',
      title: t('transportOrders.form.driver'),
      placeholder: t('transportOrders.form.driver'),
      value: filters.driverFilter,
      options: driverData,
      onChange: filters.setDriverFilter,
    },
    {
      type: 'select',
      key: 'shipmentType',
      title: t('transportOrders.form.shipmentType'),
      placeholder: t('__new__.01-common.filters.all'),
      value: filters.shipmentFilter === 'all' ? null : filters.shipmentFilter,
      options: shipmentData,
      onChange: (v) => filters.setShipmentFilter((v as TransportOrderShipmentType | null) ?? 'all'),
    },
    {
      type: 'select',
      key: 'containerSize',
      title: t('transportOrders.form.containerSize'),
      placeholder: t('__new__.01-common.filters.all'),
      value: filters.containerSizeFilter,
      options: containerSizeData,
      onChange: filters.setContainerSizeFilter,
    },
    {
      type: 'switch',
      key: 'hideCancelled',
      title: t('transportOrders.filters.hideCancelled'),
      value: filters.hideCancelled,
      onChange: filters.setHideCancelled,
      color: 'red',
    },
  ];

  const mobileQuickChips: QuickFilterChip[] = useMemo(
    () => [
      ...shipmentData.map((s) => ({
        key: s.value,
        label: s.label,
        active: filters.shipmentFilter === s.value,
        onClick: () =>
          filters.setShipmentFilter(filters.shipmentFilter === s.value ? 'all' : s.value),
      })),
      {
        key: 'hideCancelled',
        label: t('transportOrders.filters.hideCancelled'),
        active: filters.hideCancelled,
        onClick: () => filters.setHideCancelled(!filters.hideCancelled),
      },
    ],
    [filters, shipmentData, t],
  );

  const shipmentChipsShown = shipmentData.length > 0;

  const desktopMoreFilters = moreFilters.filter((f) => f.key !== 'shipmentType');
  const mobileMoreFilters: MoreFilterDef[] = [
    {
      type: 'select',
      key: 'customer',
      title: t('transportOrders.form.customer'),
      placeholder: t('transportOrders.form.customer'),
      value: filters.customerFilter,
      options: customerData,
      onChange: filters.setCustomerFilter,
    },

    ...moreFilters.filter(
      (f) => f.key !== 'hideCancelled' && !(shipmentChipsShown && f.key === 'shipmentType'),
    ),
  ];

  const hasActiveFilters = filters.hasActiveFilters || !!search;
  const clearAll = filters.clearFilters;

  const showBarPills = !isMobile;

  const showStatusPills = showBarPills && !filters.statusFilterIsDefault;
  const showShipmentPill = !isMobile || !shipmentChipsShown;

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('transportOrders.title')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          extraActions={
            canExport && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  onClick={handleExport}
                  disabled={filtered.length === 0}
                >
                  {t('__new__.01-common.actions.exportExcel')}
                </Button>
                {/* The customer report is a billing artifact — money is its
                    whole point, so it needs the price gate on top of canExport. */}
                {canViewPrice && (
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<IconFileSpreadsheet size={16} />}
                    onClick={handleExportCustomerReport}
                    disabled={filtered.length === 0}
                  >
                    {t('transportOrders.customerReport.export')}
                  </Button>
                )}
              </>
            )
          }
          createCta={{
            to: ROUTES.TRANSPORT_ORDERS.NEW,
            label: t('transportOrders.new'),
            enabled: canCreate,
            // The form is desktop-only (mobile redirects), so hide the CTA rather
            // than dead-end into a bounce.
          }}
        />

        <ListStatsCards visible={initialized} cells={statsCells} />

        {isMobile && <QuickFilterChips chips={mobileQuickChips} />}

        {isMobile ? (
          <MobileFilterBar
            recordCount={filters.allOrders.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('transportOrders.search')}
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
            searchPlaceholder={t('transportOrders.search')}
            hideStatus
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover filters={desktopMoreFilters} presetLabels={presetLabels} />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        )}

        {/* The created-range pill is always visible — it's the fetch window, so
            collapsing it would hide WHY a row isn't on screen. */}
        <TransactionalFilterPillsRow
          defaultRange={{
            label: t('transportOrders.filters.createdDate'),
            range: filters.createdDateRange,
            presetLabels,
          }}
        >
          {showStatusPills &&
            filters.statusFilter.map((s) => (
              <FilterPill
                key={s}
                onClose={() => filters.setStatusFilter(filters.statusFilter.filter((v) => v !== s))}
              >
                {t('__new__.01-common.labels.status')}: {statusLabel(s)}
              </FilterPill>
            ))}
          {showBarPills && filters.truckFilter && (
            <FilterPill onClose={() => filters.setTruckFilter(null)}>
              {t('transportOrders.columns.truck')}: {truckLabel(filters.truckFilter)}
            </FilterPill>
          )}
          {filters.customerFilter && (
            <FilterPill onClose={() => filters.setCustomerFilter(null)}>
              {t('transportOrders.form.customer')}: {customerLabel(filters.customerFilter)}
            </FilterPill>
          )}
          {filters.truckTypeFilter && (
            <FilterPill onClose={() => filters.setTruckTypeFilter(null)}>
              {t('transportOrders.filters.truckType')}: {truckTypeLabel(filters.truckTypeFilter)}
            </FilterPill>
          )}
          {filters.driverFilter && (
            <FilterPill onClose={() => filters.setDriverFilter(null)}>
              {t('transportOrders.form.driver')}: {driverLabel(filters.driverFilter)}
            </FilterPill>
          )}
          {showShipmentPill && filters.shipmentFilter !== 'all' && (
            <FilterPill onClose={() => filters.setShipmentFilter('all')}>
              {shipmentTypeLabel(filters.shipmentFilter)}
            </FilterPill>
          )}
          {filters.containerSizeFilter && (
            <FilterPill onClose={() => filters.setContainerSizeFilter(null)}>
              {containerSizeLabel(filters.containerSizeFilter)}
            </FilterPill>
          )}
          {showBarPills && filters.hideCancelled && (
            <FilterPill color="red" onClose={() => filters.setHideCancelled(false)}>
              {t('transportOrders.filters.hideCancelled')}
            </FilterPill>
          )}
          {filters.entryDateRange.preset && (
            <FilterPill onClose={() => filters.setEntryDateRange(EMPTY_DATE_RANGE)}>
              {t('transportOrders.columns.date')}:{' '}
              {formatDateRangeLabel(filters.entryDateRange, presetLabels)}
            </FilterPill>
          )}
        </TransactionalFilterPillsRow>
      </StickyListChrome>

      {isMobile ? (
        <TransportOrderCardList orders={paginated} isLoading={loading && !initialized} />
      ) : (
        <TransportOrderDataTable
          orders={paginated}
          isLoading={loading && !initialized}
          viewportRef={scrollViewportRef}
          sortField={filters.sortField}
          onSortChange={filters.setSortField}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Stack>
  );
}
