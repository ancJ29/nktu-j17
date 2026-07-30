import { SegmentedControl, Stack, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useCropStore } from '@/stores/useCropStores';
import { ListPagination } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import { perms } from '@/utils/permission';
import type { Crop } from '@/types';
import {
  buildOccupancyMap,
  FREE_OCCUPANCY,
  matchesOccupancyFilter,
  type GreenhouseOccupancyFilter,
} from '@/utils/greenhouseOccupancy';
import { todayInVnDateString } from '@/utils/dateTimeField';

import { GreenhouseCardList } from './GreenhouseCardList';
import { GreenhouseDataTable } from './GreenhouseDataTable';
import { GreenhouseTimeline } from './GreenhouseTimeline';

type GreenhouseView = 'list' | 'timeline';

const isMobile = device.isMobile;
const canCreate = perms.greenhouse.canCreate();
const canViewCrops = perms.crop.canView();
const canCreateCrop = perms.crop.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';

type GreenhouseFilters = {
  status: FilterStatus;

  occupancy: GreenhouseOccupancyFilter;
  search: string;
  page: number;
};
const FILTER_DEFAULTS: GreenhouseFilters = {
  status: 'active',
  occupancy: 'all',
  search: '',
  page: 1,
};

export function GreenhouseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    items: allGreenhouses,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useGreenhouseStore();

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:greenhouse-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const occupancyFilter = filterState.occupancy;

  const setFilter = useCallback(
    (v: FilterStatus) => updateState({ status: v, page: 1 }),
    [updateState],
  );
  const setOccupancyFilter = useCallback(
    (v: GreenhouseOccupancyFilter) => updateState({ occupancy: v, page: 1 }),
    [updateState],
  );
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const allCrops = useCropStore((s) => s.items);
  const cropsInitialized = useCropStore((s) => s.initialized);
  const loadCrops = useCropStore((s) => s.loadAll);
  useEffect(() => {
    if (canViewCrops && !cropsInitialized) loadCrops();
  }, [cropsInitialized, loadCrops]);

  const today = todayInVnDateString();
  const occupancyByGreenhouse = useMemo(
    () => (canViewCrops ? buildOccupancyMap(allCrops as Crop[], today) : new Map()),
    [allCrops, today],
  );

  const activeCropCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!canViewCrops) return counts;
    for (const crop of allCrops) {
      counts.set(crop.greenhouseCode, (counts.get(crop.greenhouseCode) ?? 0) + 1);
    }
    return counts;
  }, [allCrops]);

  const listFilters = useMemo(
    () => ({ status: filter, occupancy: occupancyFilter }),
    [filter, occupancyFilter],
  );
  const filterFn = useCallback(
    (item: (typeof allGreenhouses)[number], f: typeof listFilters) => {
      if (f.status === 'active' && !item.isActive) return false;
      if (f.status === 'inactive' && item.isActive) return false;

      if (canViewCrops && f.occupancy !== 'all') {
        const occupancy = occupancyByGreenhouse.get(item.code) ?? FREE_OCCUPANCY;
        if (!matchesOccupancyFilter(occupancy, f.occupancy)) return false;
      }
      return true;
    },
    [occupancyByGreenhouse],
  );

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allGreenhouses, {
      filters: listFilters,
      filterFn,
      searchFields: (item) => [item.name, item.code, item.description],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const hasActiveFilters =
    !!search || filter !== FILTER_DEFAULTS.status || occupancyFilter !== FILTER_DEFAULTS.occupancy;

  const occupancyOptions = useMemo(
    () => [
      { value: 'free', label: t('greenhouses.occupancy.free') },
      { value: 'growing', label: t('greenhouses.occupancy.growing') },
      { value: 'planned', label: t('greenhouses.occupancy.planned') },
      { value: 'overdue', label: t('greenhouses.occupancy.overdue') },
    ],
    [t],
  );

  const desktopFilters: SelectFilter[] = useMemo(
    () =>
      canViewCrops
        ? [
            {
              value: occupancyFilter === 'all' ? null : occupancyFilter,
              onChange: (v) => setOccupancyFilter((v ?? 'all') as GreenhouseOccupancyFilter),
              data: occupancyOptions,
              placeholder: t('greenhouses.filterOccupancyPlaceholder'),
            },
          ]
        : [],
    [occupancyFilter, setOccupancyFilter, occupancyOptions, t],
  );

  const mobileFilters: MobileFilterDef[] = useMemo(
    () =>
      canViewCrops
        ? [
            allOptionFilter({
              title: t('greenhouses.filterOccupancyTitle'),
              value: occupancyFilter,
              options: occupancyOptions,
              onChange: setOccupancyFilter,
              allLabel: t('__new__.01-common.filters.all'),

              emptyValue: 'all',
            }),
          ]
        : [],
    [occupancyFilter, setOccupancyFilter, occupancyOptions, t],
  );

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('greenhouses.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  const handleAddCrop = useCallback(
    (greenhouse: (typeof allGreenhouses)[number]) => {
      navigate(ROUTES.GREENHOUSES.DETAIL.replace(':id', greenhouse.id), {
        state: { addCrop: true },
      });
    },
    [navigate],
  );

  const [view, setView] = useState<GreenhouseView>('list');
  const showTimelineToggle = !isMobile && canViewCrops;
  const showTimeline = showTimelineToggle && view === 'timeline';

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('greenhouses.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconBuildingWarehouse size={20} stroke={1.75} />
            </ThemeIcon>
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: ROUTES.GREENHOUSES.NEW,
            label: t('greenhouses.addItem'),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            recordCount={allGreenhouses.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('greenhouses.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            filters={mobileFilters.length > 0 ? mobileFilters : undefined}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('greenhouses.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            filters={desktopFilters.length > 0 ? desktopFilters : undefined}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        )}

        {/* Desktop-only: a greenhouses × weeks chart needs horizontal room a
            phone doesn't have, and the mobile persona (field staff) reads a
            house, not a schedule. Shown only when crops are readable — with no
            crop permission every row would be an empty track. */}
        {showTimelineToggle && (
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as GreenhouseView)}
            data={[
              { value: 'list', label: t('greenhouses.view.list') },
              { value: 'timeline', label: t('greenhouses.view.timeline') },
            ]}
            size="xs"
          />
        )}
      </StickyListChrome>

      {showTimeline ? (
        <GreenhouseTimeline greenhouses={paginated} crops={allCrops as Crop[]} today={today} />
      ) : isMobile ? (
        <GreenhouseCardList
          greenhouses={paginated}
          isLoading={loading && !initialized}
          occupancyByGreenhouse={canViewCrops ? occupancyByGreenhouse : undefined}
          activeCropCounts={canViewCrops ? activeCropCounts : undefined}
        />
      ) : (
        <GreenhouseDataTable
          greenhouses={paginated}
          isLoading={loading && !initialized}
          occupancyByGreenhouse={canViewCrops ? occupancyByGreenhouse : undefined}
          activeCropCounts={canViewCrops ? activeCropCounts : undefined}
          onAddCrop={canCreateCrop ? handleAddCrop : undefined}
        />
      )}

      {/* The timeline shows the same page slice as the table, so the pager
          governs both — a planning view that silently ignored the filter bar
          above it would be a different dataset wearing the same chrome. */}
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
