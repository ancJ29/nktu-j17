import { Button, Group, SegmentedControl, Stack, Text, ThemeIcon } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconPlant2, IconPlus } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { queryHarvestedCrops, useCropStore } from '@/stores/useCropStores';
import { ListPagination } from '@credo/base-ui/components';
import { device, logger } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';
import type { Crop, CropStatus } from '@/types';

import { CropCardList } from './CropCardList';
import { CropDataTable } from './CropDataTable';

const isMobile = device.isMobile;
const canCreate = perms.crop.canCreate();

type CropTab = 'active' | 'harvested';

type CropFilterStatus = 'all' | CropStatus;

type CropFilters = { status: CropFilterStatus; search: string; page: number };
const FILTER_DEFAULTS: CropFilters = { status: 'all', search: '', page: 1 };

function toPeriod(dateStr: string | null): string | null {
  return dateStr ? dateStr.slice(0, 7) : null;
}

function defaultMonthRange(): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return [fmt(from), fmt(now)];
}

export function CropListPage() {
  const { t } = useTranslation();

  
  
  const [tab, setTab] = useState<CropTab>('active');

  const {
    items: allCrops,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useCropStore();

  
  
  const [monthRange, setMonthRange] = useState<[string | null, string | null]>(defaultMonthRange);
  const [harvested, setHarvested] = useState<Crop[]>([]);
  const [harvestedLoading, setHarvestedLoading] = useState(false);
  const [harvestedLoaded, setHarvestedLoaded] = useState(false);
  
  const [harvestedNonce, setHarvestedNonce] = useState(0);

  const [from, to] = monthRange;

  
  
  
  
  useEffect(() => {
    const fromPeriod = toPeriod(from);
    const toPeriodStr = toPeriod(to);
    if (tab !== 'harvested' || !fromPeriod || !toPeriodStr) return;
    let cancelled = false;
    const run = async () => {
      setHarvestedLoading(true);
      try {
        const crops = await queryHarvestedCrops({ fromPeriod, toPeriod: toPeriodStr });
        if (cancelled) return;
        setHarvested(crops);
        setHarvestedLoaded(true);
      } catch (err) {
        if (cancelled) return;
        logger.error('Harvested crop query failed:', err);
        notifications.show({
          color: 'red',
          title: t('crops.notifications.fetchError'),
          message: '',
        });
      } finally {
        if (!cancelled) setHarvestedLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tab, from, to, harvestedNonce, t]);

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:crop-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const setFilter = useCallback((v: CropFilterStatus) => updateState({ status: v }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  
  
  
  const listSource = tab === 'harvested' ? harvested : allCrops;

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(listSource, {
      filters: { status: tab === 'harvested' ? 'all' : filter },
      filterFn: (item, f) => {
        if (f.status !== 'all' && item.status !== f.status) return false;
        return true;
      },
      searchFields: (item) => [item.name, item.code, item.greenhouseCode],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const growingCount = useMemo(
    () => allCrops.filter((c) => c.status === 'growing').length,
    [allCrops],
  );

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({ color: 'red', title: t('crops.notifications.fetchError'), message: '' });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => {
    if (tab === 'harvested') setHarvestedNonce((n) => n + 1);
    else forceRefresh();
  }, [tab, forceRefresh]);

  
  
  const statusOptions = [
    { value: 'planned', label: t('crops.status.planned') },
    { value: 'growing', label: t('crops.status.growing') },
  ];

  const tabData = [
    { value: 'active', label: t('crops.tab.active') },
    { value: 'harvested', label: t('crops.tab.harvested') },
  ];

  const showStatusFilter = tab === 'active';
  const listLoading =
    tab === 'harvested' ? harvestedLoading && !harvestedLoaded : loading && !initialized;

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('crops.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconPlant2 size={20} stroke={1.75} />
            </ThemeIcon>
          }
          subtitle={
            tab === 'active' && initialized && allCrops.length > 0 ? (
              <Text size="xs" c="dimmed">
                {t('crops.growingSummary', { count: growingCount })}
              </Text>
            ) : undefined
          }
          cachedAt={tab === 'harvested' ? null : cachedAt}
          loading={tab === 'harvested' ? harvestedLoading : loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: ROUTES.CROPS.NEW,
            label: t('crops.addItem'),
            enabled: canCreate,
            mobileVariant: 'hidden',
          }}
        />

        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as CropTab)}
          data={tabData}
          fullWidth={isMobile}
        />

        {tab === 'harvested' && (
          <Group grow={isMobile} wrap={isMobile ? 'wrap' : 'nowrap'} align="flex-end">
            <MonthPickerInput
              label={t('crops.history.fromMonth')}
              placeholder={t('crops.history.fromMonth')}
              valueFormat="MMM YYYY"
              leftSection={<IconCalendar size={16} />}
              value={monthRange[0]}
              maxDate={monthRange[1] ?? undefined}
              onChange={(v) => setMonthRange([v, monthRange[1]])}
              clearable={false}
              w={isMobile ? undefined : 200}
            />
            <MonthPickerInput
              label={t('crops.history.toMonth')}
              placeholder={t('crops.history.toMonth')}
              valueFormat="MMM YYYY"
              leftSection={<IconCalendar size={16} />}
              value={monthRange[1]}
              minDate={monthRange[0] ?? undefined}
              onChange={(v) => setMonthRange([monthRange[0], v])}
              clearable={false}
              w={isMobile ? undefined : 200}
            />
          </Group>
        )}

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('crops.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            statusLabels={{
              all: t('common.filters.all'),
              active: t('common.status.active'),
              inactive: t('common.status.inactive'),
            }}
            hideStatus
            filters={
              showStatusFilter
                ? [
                    {
                      title: t('common.labels.status'),
                      value: filter,
                      options: [{ value: 'all', label: t('common.filters.all') }, ...statusOptions],
                      onChange: (v) => setFilter(v as CropFilterStatus),
                    },
                  ]
                : []
            }
            onClear={clearFilters}
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('crops.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            statusLabels={{
              all: t('common.filters.all'),
              active: t('common.status.active'),
              inactive: t('common.status.inactive'),
            }}
            hideStatus
            filters={
              showStatusFilter
                ? [
                    {
                      value: filter === 'all' ? null : filter,
                      onChange: (v) => setFilter((v as CropFilterStatus) ?? 'all'),
                      data: statusOptions,
                      placeholder: t('crops.filterStatusPlaceholder'),
                    },
                  ]
                : []
            }
            onClear={clearFilters}
          />
        )}

        {isMobile && canCreate && (
          <Button
            component={Link}
            to={ROUTES.CROPS.NEW}
            leftSection={<IconPlus size={16} />}
            size="sm"
            variant="light"
            fullWidth
          >
            {t('crops.addItem')}
          </Button>
        )}
      </StickyListChrome>

      {isMobile ? (
        <CropCardList crops={paginated} isLoading={listLoading} />
      ) : (
        <CropDataTable crops={paginated} isLoading={listLoading} />
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
