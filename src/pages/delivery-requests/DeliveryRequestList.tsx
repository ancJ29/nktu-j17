import { Button, Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowsSort } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useCustomerStore } from '@/stores/useCustomerStore';
import {
  setDeliveryRequestQueryRange,
  useDeliveryRequestStore,
} from '@/stores/useDeliveryRequestStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
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
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { type DateRangePreset, type MoreFilterDef } from '@/types/date-range';
import {
  EMPTY_DATE_RANGE,
  defaultLastNDaysRange,
  formatDateRangeLabel,
  getPresetRange,
} from '@/utils/listFilterDateRange';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';

import { createCustomerShortNameResolver } from '@/utils/customerDisplay';
import { useListScrollRestoration } from '@/hooks';
import { DeliveryRequestCardList } from './DeliveryRequestCardList';
import { DeliveryRequestDataTable } from './DeliveryRequestDataTable';
import { deliveryRequestPartyIsCustomer } from './deliveryRequestParty';
import { DeliveryReorderModal } from './DeliveryReorderModal';
import { NKTUCreateDeliveryRequestModal } from './NKTUCreateDeliveryRequestModal';
import { deliveryRequestStatusOptions } from './useDeliveryRequestStatusOptions';
import { useDeliveryRequestListFilters } from './useDeliveryRequestListFilters';
import type { DeliveryRequestVariant } from './deliveryRequestVariant';

const isMobile = device.isMobile;

const FETCH_WINDOW_DAYS = 90;
const canCreate = perms.deliveryRequest.canCreate();
const canReorder = perms.deliveryRequest.canReorder();
const canViewAll = perms.deliveryRequest.canViewAll();
const canViewSelf = perms.deliveryRequest.canViewSelf();
const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());
const { statusOptions, resolveStatus } = deliveryRequestStatusOptions;

type DeliveryRequestListProps = {
  readonly variant: DeliveryRequestVariant;
};

export function DeliveryRequestList({ variant }: DeliveryRequestListProps) {
  const { t } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.DELIVERY.LIST);

  const {
    items: storeRequests,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useDeliveryRequestStore();

  
  
  const {
    items: employees,
    loadAll: loadEmployees,
    initialized: employeesInit,
  } = useEmployeeStore();

  
  
  
  
  const {
    items: customers,
    loadAll: loadCustomers,
    initialized: customersInit,
  } = useCustomerStore();
  const {
    loadAll: loadVendors,
    initialized: vendorsInit,
    getByCode: getVendorByCode,
  } = useVendorStore();
  const resolveCustomerShortName = useMemo(
    () => createCustomerShortNameResolver(customers),
    [customers],
  );

  
  
  const salesOrders = useSalesOrderStore((s) => s.items);
  const salesOrdersInit = useSalesOrderStore((s) => s.initialized);
  const refreshSalesOrders = useSalesOrderStore((s) => s.forceRefresh);

  
  
  
  
  
  const currentEmployee = useMemo(() => {
    const me = getCurrentEmployeeId();
    return me ? employees.find((e) => e.id === me) : undefined;
  }, [employees]);
  const nktuConfig = variant.clientSpecific?.NKTU;
  const salesDeptScoped =
    !!nktuConfig?.salesDeptScopedView &&
    currentEmployee?.department === nktuConfig.salesDepartmentCode;

  
  
  
  
  
  
  
  
  const visibleStoreRequests = useMemo(() => {
    
    const live = storeRequests.filter((r) => !r.extra?.isDeleted);

    
    
    
    
    if (salesDeptScoped) {
      const me = getCurrentEmployeeId();
      if (!me) return [];
      const myOrderIds = new Set(
        salesOrders.filter((so) => so.extra?.assignedStaff === me).map((so) => so.id),
      );
      return live.filter(
        (r) =>
          r.direction !== 'inbound' && r.salesOrderId != null && myOrderIds.has(r.salesOrderId),
      );
    }

    if (canViewAll) return live;
    if (!canViewSelf) return [];
    const me = getCurrentEmployeeId();
    if (!me) return [];
    return live.filter(
      (r) => (r.extra as { assignedDriverId?: string } | undefined)?.assignedDriverId === me,
    );
  }, [storeRequests, salesDeptScoped, salesOrders]);

  
  
  
  const driverCodeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.code ?? '');
    return m;
  }, [employees]);

  const filters = useDeliveryRequestListFilters(visibleStoreRequests, driverCodeById);

  useEffect(() => {
    if (!initialized && !error) loadAll();
    if (!employeesInit) loadEmployees();
    if (!customersInit) loadCustomers();
    if (!vendorsInit) loadVendors();
  }, [
    initialized,
    error,
    loadAll,
    employeesInit,
    loadEmployees,
    customersInit,
    loadCustomers,
    vendorsInit,
    loadVendors,
  ]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('deliveryRequests.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  
  
  
  
  const fetchRange = useMemo(() => defaultLastNDaysRange(FETCH_WINDOW_DAYS), []);
  useTransactionalRangeRefetch({
    range: fetchRange,
    setStoreRange: setDeliveryRequestQueryRange,
    forceRefresh,
  });

  
  
  
  
  
  
  useEffect(() => {
    if (!salesDeptScoped) return;
    setSalesOrderQueryRange(fetchRange.from, fetchRange.to);
    refreshSalesOrders();
  }, [salesDeptScoped, fetchRange.from, fetchRange.to, refreshSalesOrders]);

  
  
  
  
  
  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(filters.allRequests, {
      filters: { _: 'noop' },
      filterFn: () => true,
      searchFields: (item) => [
        item.requestNumber,
        item.customerName ?? '',
        item.salesOrderNumber ?? '',
        item.vendorName ?? '',
        item.vendorCode ?? '',
      ],
      search: filters.search,
      onSearchChange: filters.setSearch,
      page: filters.page,
      onPageChange: filters.setPage,
    });

  const clearAll = filters.clearFilters;
  const hasActiveFilters = filters.hasActiveFilters || !!search;

  

  const statusFilterData = useMemo(
    () => statusOptions.map((s) => ({ value: s.value, label: s.label })),
    [],
  );

  
  
  const driverFilterData = useMemo(
    () => employees.filter(driverEmployeeFilter).map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );

  
  
  
  const employeeNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  
  
  
  
  
  
  const partyFilterData = useMemo(() => {
    const byValue = new Map<string, string>();
    for (const r of visibleStoreRequests) {
      if (deliveryRequestPartyIsCustomer(r)) {
        const raw = r.customerName?.trim();
        if (!raw || byValue.has(raw)) continue;
        byValue.set(raw, resolveCustomerShortName(raw) || raw);
      } else {
        const raw = r.vendorName?.trim();
        if (!raw || byValue.has(raw)) continue;
        const vendor = r.vendorCode ? getVendorByCode(r.vendorCode) : undefined;
        byValue.set(raw, vendor?.extra?.shortName?.trim() || vendor?.name || raw);
      }
    }
    return [...byValue.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [visibleStoreRequests, getVendorByCode, resolveCustomerShortName]);

  
  
  const partyLabel = useMemo(() => {
    if (!filters.partyFilter) return '';
    return (
      partyFilterData.find((p) => p.value === filters.partyFilter)?.label ?? filters.partyFilter
    );
  }, [filters.partyFilter, partyFilterData]);

  

  const statusPlaceholder = useMemo(() => {
    if (filters.statusFilter.length === 0) return t('common.filters.all');
    if (filters.statusFilter.length === 1) return resolveStatus(filters.statusFilter[0]).label;
    return t('common.filters.statusCount', { count: filters.statusFilter.length });
  }, [filters.statusFilter, t]);

  

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    yesterday: t('common.datePreset.yesterday'),
    tomorrow: t('common.datePreset.tomorrow'),
    thisWeek: t('common.datePreset.thisWeek'),
    lastWeek: t('common.datePreset.lastWeek'),
    nextWeek: t('common.datePreset.nextWeek'),
    custom: t('deliveryRequests.datePreset.custom'),
  };

  
  
  
  
  
  const scheduledDatePresets: DateRangePreset[] = [
    'today',
    'tomorrow',
    'yesterday',
    'thisWeek',
    'nextWeek',
    'lastWeek',
  ];
  const scheduledDatePresetData = scheduledDatePresets
    .filter((p) => presetLabels[p])
    .map((p) => ({ value: p, label: presetLabels[p] as string }));
  const scheduledDatePreset =
    filters.scheduledDateRange.preset && filters.scheduledDateRange.preset !== 'custom'
      ? filters.scheduledDateRange.preset
      : null;
  const setScheduledDatePreset = (p: string | null) =>
    filters.setScheduledDateRange(
      p
        ? { ...getPresetRange(p as DateRangePreset), preset: p as DateRangePreset }
        : EMPTY_DATE_RANGE,
    );

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
      value: filters.driverFilter,
      onChange: filters.setDriverFilter,
      data: driverFilterData,
      placeholder: t('deliveryRequests.filterDriver'),
      
      
      visible: canViewAll && driverFilterData.length > 0,
      searchable: true,
      w: 220,
    },
    {
      value: filters.partyFilter,
      onChange: filters.setPartyFilter,
      data: partyFilterData,
      placeholder: t('deliveryRequests.filterParty'),
      visible: partyFilterData.length > 0,
      searchable: true,
      w: 220,
    },
    ...(variant.showScheduledDateInBar
      ? ([
          {
            value: scheduledDatePreset,
            onChange: setScheduledDatePreset,
            data: scheduledDatePresetData,
            placeholder: t('deliveryRequests.columns.scheduledDate'),
            visible: scheduledDatePresetData.length > 0,
            w: 200,
          },
        ] satisfies SelectFilter[])
      : []),
  ];

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [
    {
      title: t('common.labels.status'),
      value: filters.statusFilter,
      options: [{ value: 'all', label: t('common.filters.all') }, ...statusFilterData],
      onChange: filters.setStatusFilter,
      visible: statusFilterData.length > 0,
      multi: true,
    },
    ...(variant.showScheduledDateInBar
      ? ([
          {
            title: t('deliveryRequests.columns.scheduledDate'),
            value: scheduledDatePreset ?? 'all',
            options: [{ value: 'all', label: t('common.filters.all') }, ...scheduledDatePresetData],
            onChange: (v) => setScheduledDatePreset(v === 'all' ? null : v),
            visible: scheduledDatePresetData.length > 0,
          },
        ] satisfies MobileFilterDef[])
      : []),
  ];

  const dateAndExtraFilters: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'scheduledDate',
      title: t('deliveryRequests.columns.scheduledDate'),
      value: filters.scheduledDateRange,
      onChange: filters.setScheduledDateRange,
    },
  ];

  const mobileMoreFilters: MoreFilterDef[] = [
    
    ...(canViewAll
      ? ([
          {
            type: 'select',
            key: 'driver',
            title: t('deliveryRequests.filterDriver'),
            placeholder: t('deliveryRequests.filterDriver'),
            value: filters.driverFilter,
            options: driverFilterData,
            onChange: filters.setDriverFilter,
          },
        ] satisfies MoreFilterDef[])
      : []),
    ...(partyFilterData.length > 0
      ? ([
          {
            type: 'select',
            key: 'party',
            title: t('deliveryRequests.filterParty'),
            placeholder: t('deliveryRequests.filterParty'),
            value: filters.partyFilter,
            options: partyFilterData,
            onChange: filters.setPartyFilter,
          },
        ] satisfies MoreFilterDef[])
      : []),
    ...dateAndExtraFilters,
  ];

  
  
  
  
  const [reorderOpen, setReorderOpen] = useState(false);

  
  
  
  const [createOpen, setCreateOpen] = useState(false);

  
  
  const hasPills = !!(
    filters.statusFilter.length > 0 ||
    filters.salesOrderFilter ||
    (canViewAll && filters.driverFilter) ||
    filters.partyFilter ||
    filters.scheduledDateRange.preset
  );

  
  
  
  const loadingInitial = (loading && !initialized) || (salesDeptScoped && !salesOrdersInit);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('deliveryRequests.title')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          extraActions={
            !isMobile && canReorder ? (
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconArrowsSort size={14} />}
                onClick={() => setReorderOpen(true)}
              >
                {t('deliveryRequests.reorder.openButton')}
              </Button>
            ) : null
          }
          createCta={
            isMobile
              ? undefined
              : {
                  
                  
                  ...(variant.quickCreateMode === 'modal'
                    ? { onClick: () => setCreateOpen(true) }
                    : { to: ROUTES.DELIVERY.NEW }),
                  label: t('deliveryRequests.addItem'),
                  enabled: canCreate,
                  mobileVariant: 'icon',
                }
          }
        />

        {!isMobile && variant.quickCreateMode === 'modal' && (
          <NKTUCreateDeliveryRequestModal
            opened={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={forceRefresh}
          />
        )}

        {!isMobile && (
          <DeliveryReorderModal opened={reorderOpen} onClose={() => setReorderOpen(false)} t={t} />
        )}

        {/* Filter bar */}
        {isMobile ? (
          <MobileFilterBar
            noSearchInput={true}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.deliveryRequests.list.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            hideStatus
            statusLabels={{
              all: t('common.filters.all'),
              active: '',
              inactive: '',
            }}
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
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.deliveryRequests.list.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            hideStatus
            statusLabels={{
              all: t('common.filters.all'),
              active: '',
              inactive: '',
            }}
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover filters={dateAndExtraFilters} presetLabels={presetLabels} />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        )}

        {hasPills && (
          <Group gap="xs">
            {filters.statusFilter.map((sf) => (
              <FilterPill
                key={sf}
                onClose={() =>
                  filters.setStatusFilter(filters.statusFilter.filter((v) => v !== sf))
                }
              >
                {resolveStatus(sf).label}
              </FilterPill>
            ))}
            {canViewAll && filters.driverFilter && (
              <FilterPill onClose={() => filters.setDriverFilter(null)}>
                {driverFilterData.find((e) => e.value === filters.driverFilter)?.label ??
                  employeeNames.get(filters.driverFilter) ??
                  filters.driverFilter}
              </FilterPill>
            )}
            {filters.partyFilter && (
              <FilterPill onClose={() => filters.setPartyFilter(null)}>{partyLabel}</FilterPill>
            )}
            {filters.scheduledDateRange.preset && (
              <FilterPill onClose={() => filters.setScheduledDateRange(EMPTY_DATE_RANGE)}>
                {t('deliveryRequests.columns.scheduledDate')}:{' '}
                {formatDateRangeLabel(filters.scheduledDateRange, presetLabels)}
              </FilterPill>
            )}
          </Group>
        )}
      </StickyListChrome>

      {isMobile ? (
        <DeliveryRequestCardList
          requests={paginated}
          isLoading={loadingInitial}
          resolveStatus={resolveStatus}
        />
      ) : (
        <DeliveryRequestDataTable
          requests={paginated}
          isLoading={loadingInitial}
          resolveStatus={resolveStatus}
          viewportRef={scrollViewportRef}
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
