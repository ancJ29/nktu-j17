import { Badge, Group, Stack, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRoute } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { device } from '@credo/base-ui/utils';
import { ListPageHeader } from '@/components/ListPageHeader';
import { ListPagination } from '@/components/custom/ListPagination';
import { StickyListChrome } from '@/components/StickyListChrome';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useTransportRouteStore } from '@/stores/useTransportRouteStore';
import { perms } from '@/utils/permission';
import { useContainerSizeOptions } from '../transport-orders/containerSize';
import { useTruckTypeOptions } from './truckType';
import { routePlaces } from './routeSummary';
import { TransportRouteCardList } from './TransportRouteCardList';
import { TransportRouteDataTable } from './TransportRouteDataTable';

const isMobile = device.isMobile;
const canCreate = perms.transportRoute.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';

type KindFilter = 'single' | 'multi' | null;

type TransportRouteFilters = {
  status: FilterStatus;
  truckType: string | null;
  containerSize: string | null;
  kind: KindFilter;
  search: string;
  page: number;
};

const FILTER_DEFAULTS: TransportRouteFilters = {
  status: 'all',
  truckType: null,
  containerSize: null,
  kind: null,
  search: '',
  page: 1,
};

export function TransportRouteListPage() {
  const { t } = useTranslation();

  const {
    items: allRoutes,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useTransportRouteStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:transport-route-list-filters', FILTER_DEFAULTS);

  const setStatus = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const setTruckType = useCallback(
    (v: string | null) => updateState({ truckType: v }),
    [updateState],
  );
  const setContainerSize = useCallback(
    (v: string | null) => updateState({ containerSize: v }),
    [updateState],
  );
  const setKind = useCallback(
    (v: string | null) => updateState({ kind: v as KindFilter }),
    [updateState],
  );
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const truckTypeOptions = useTruckTypeOptions();
  const containerSizeOptions = useContainerSizeOptions();

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allRoutes, {
      filters: {
        status: filterState.status,
        truckType: filterState.truckType,
        containerSize: filterState.containerSize,
        kind: filterState.kind,
      },
      filterFn: (item, f) => {
        if (item.extra?.isDeleted) return false;
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        if (f.truckType && item.truckType !== f.truckType) return false;

        if (f.containerSize && item.containerSize !== f.containerSize) return false;
        if (f.kind === 'single' && item.isMultiTrip) return false;
        if (f.kind === 'multi' && !item.isMultiTrip) return false;
        return true;
      },

      searchFields: (item) => [item.code, item.name ?? '', ...routePlaces(item)],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const viewportRef = useListScrollRestoration(ROUTES.TRANSPORT_ROUTES.LIST);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('transportRoutes.notifications.loadError'),
        message: '',
      });
    }
  }, [error, t]);

  const { activeCount, inactiveCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const r of allRoutes) {
      if (r.extra?.isDeleted) continue;
      if (r.isActive) active++;
      else inactive++;
    }
    return { activeCount: active, inactiveCount: inactive };
  }, [allRoutes]);

  const kindOptions = useMemo(
    () => [
      { value: 'single', label: t('transportRoutes.kind.single') },
      { value: 'multi', label: t('transportRoutes.kind.multi') },
    ],
    [t],
  );

  const desktopFilters: SelectFilter[] = useMemo(
    () => [
      ...(truckTypeOptions.length > 0
        ? [
            {
              value: filterState.truckType,
              onChange: setTruckType,
              data: truckTypeOptions,
              placeholder: t('transportRoutes.filters.anyTruckType'),
              searchable: true,
              w: 180,
            } as SelectFilter,
          ]
        : []),
      {
        value: filterState.containerSize,
        onChange: setContainerSize,
        data: containerSizeOptions,
        placeholder: t('transportRoutes.filters.anyContainerSize'),
        searchable: true,
        w: 170,
      } as SelectFilter,
      {
        value: filterState.kind,
        onChange: setKind,
        data: kindOptions,
        placeholder: t('transportRoutes.filters.anyKind'),
        searchable: false,
        w: 160,
      } as SelectFilter,
    ],
    [
      truckTypeOptions,
      containerSizeOptions,
      kindOptions,
      filterState.truckType,
      filterState.containerSize,
      filterState.kind,
      setTruckType,
      setContainerSize,
      setKind,
      t,
    ],
  );

  const mobileFilters: MobileFilterDef[] = useMemo(
    () =>
      truckTypeOptions.length > 0
        ? [
            allOptionFilter({
              title: t('transportRoutes.filters.truckType'),
              value: filterState.truckType,
              options: truckTypeOptions,
              onChange: setTruckType,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : [],
    [truckTypeOptions, filterState.truckType, setTruckType, t],
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('transportRoutes.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconRoute size={20} stroke={1.75} />
            </ThemeIcon>
          }
          subtitle={
            initialized && activeCount + inactiveCount > 0 ? (
              <Group gap={6} wrap="nowrap">
                <Badge size="xs" variant="light" color="primary" radius="sm" tt="lowercase">
                  {activeCount} {t('transportRoutes.status.active')}
                </Badge>
                {inactiveCount > 0 && (
                  <Badge size="xs" variant="light" color="gray" radius="sm" tt="lowercase">
                    {inactiveCount} {t('transportRoutes.status.inactive')}
                  </Badge>
                )}
              </Group>
            ) : undefined
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          createCta={{
            to: ROUTES.TRANSPORT_ROUTES.NEW,
            label: t('transportRoutes.new'),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            recordCount={allRoutes.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('transportRoutes.search.placeholder')}
            status={filterState.status}
            onStatusChange={setStatus}
            statusTitle={t('transportRoutes.columns.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('transportRoutes.status.active'),
              inactive: t('transportRoutes.status.inactive'),
            }}
            filters={mobileFilters.length > 0 ? mobileFilters : undefined}
            onClear={clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('transportRoutes.search.placeholder')}
            status={filterState.status}
            onStatusChange={setStatus}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('transportRoutes.status.active'),
              inactive: t('transportRoutes.status.inactive'),
            }}
            filters={desktopFilters}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <TransportRouteCardList routes={paginated} isLoading={loading && !initialized} />
      ) : (
        <TransportRouteDataTable
          routes={paginated}
          isLoading={loading && !initialized}
          viewportRef={viewportRef}
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
