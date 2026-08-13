import { Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { ListPagination } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useOilTankStore } from '@/stores/useOilTankStore';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { formatLitres } from '@/utils/number';
import { ActiveBadge } from '@/components/badges';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { StickyListChrome } from '@/components/StickyListChrome';
import { perms } from '@/utils/permission';
import type { OilTankRow } from '@/types';
import { levelCell, OIL_TANK_CONFIG } from './oilTankConfig';

const isMobile = device.isMobile;
const canCreate = perms.oilTank.canCreate();

type FilterStatus = 'all' | 'active' | 'inactive';
type OilTankFilters = { status: FilterStatus; search: string; page: number };
const FILTER_DEFAULTS: OilTankFilters = { status: 'active', search: '', page: 1 };

export function OilTankListPage() {
  const { t } = useTranslation();
  const tk = (key: string): string => t(key as never);
  const { Icon, i18nKey } = OIL_TANK_CONFIG;

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } = useOilTankStore(
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

  const tanks = useMemo(() => (items as OilTankRow[]).filter((r) => !r.extra?.isDeleted), [items]);

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:oil-tank-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(tanks, {
      filters: { status: filter },
      filterFn: (item, f) => {
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        return true;
      },
      searchFields: (item) => OIL_TANK_CONFIG.searchFields(item).filter((v): v is string => !!v),
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const hasActiveFilters = !!search || filter !== FILTER_DEFAULTS.status;

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('oilTanks.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  const columns = useMemo(
    () => OIL_TANK_CONFIG.columns({ t: (k) => t(k as never), formatLitres }),
    [t],
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={tk(`${i18nKey}.title`)}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <Icon size={20} stroke={1.75} />
            </ThemeIcon>
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: OIL_TANK_CONFIG.routes.NEW,
            label: tk(`${i18nKey}.addItem`),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            recordCount={tanks.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tk(`${i18nKey}.searchPlaceholder`)}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tk(`${i18nKey}.searchPlaceholder`)}
            status={filter}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('__new__.01-common.labels.active'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <ListCardList
          data={paginated}
          isLoading={loading && !initialized}
          detailRoute={OIL_TANK_CONFIG.routes.DETAIL}
          renderSkeleton={() => (
            <Card withBorder padding="sm" radius="md">
              <Stack gap={6}>
                <Skeleton h={14} w="60%" />
                <Skeleton h={10} w="40%" />
              </Stack>
            </Card>
          )}
          emptyState={
            <Card withBorder padding="xl" radius="md">
              <Stack align="center" gap="sm" py="md">
                <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                  <Icon size={28} stroke={1.5} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {tk(`${i18nKey}.emptyTitle`)}
                </Text>
                <Text size="xs" c="dimmed" ta="center" maw={260}>
                  {tk(`${i18nKey}.emptyMessage`)}
                </Text>
              </Stack>
            </Card>
          }
          renderCard={(item: OilTankRow) => (
            <Stack gap={4}>
              <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
                <Text fw={700} size="sm" lh={1.25} truncate style={{ flex: 1 }}>
                  {item.name}
                </Text>
                <ActiveBadge
                  isActive={item.isActive}
                  activeLabel={t('__new__.01-common.labels.active')}
                  inactiveLabel={t('__new__.01-common.labels.inactive')}
                  size="sm"
                  style={{ flexShrink: 0 }}
                />
              </Group>
              <Group gap={6} wrap="wrap" justify="space-between" align="flex-end">
                <Stack gap={2}>
                  <Text
                    size="xs"
                    c="dimmed"
                    ff="monospace"
                    tt="uppercase"
                    fw={500}
                    style={{ letterSpacing: 0.3 }}
                  >
                    {item.code}
                  </Text>
                  {OIL_TANK_CONFIG.cardSubtitle(item) && (
                    <Text size="xs" c="dimmed">
                      {OIL_TANK_CONFIG.cardSubtitle(item)}
                    </Text>
                  )}
                </Stack>
                {/* The level is why anyone opens this list on a phone — it's the
                    one figure a depot check needs, so it rides the card rather
                    than hiding behind a tap. */}
                {levelCell(item, (k) => t(k as never), formatLitres)}
              </Group>
            </Stack>
          )}
        />
      ) : (
        <ListDataTable
          data={paginated}
          columns={columns}
          isLoading={loading && !initialized}
          emptyMessage={tk(`${i18nKey}.noItems`)}
          detailRoute={OIL_TANK_CONFIG.routes.DETAIL}
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
