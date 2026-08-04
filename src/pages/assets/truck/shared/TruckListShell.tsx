import { Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { ListPagination } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useLookupV2Labels } from '@/hooks/useLookupV2Options';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { ActiveBadge } from '@/components/badges';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { StickyListChrome } from '@/components/StickyListChrome';
import { perms } from '@/utils/permission';
import type { TruckAssetRow } from '@/types';
import { QuickFilterChips, type QuickFilterChip } from '@/components/QuickFilterChips';
import { useLookupV2Options } from '@/hooks/useLookupV2Options';
import { expirySortKey, matchesUrgency, type ExpiryUrgency } from '../truckExpiry';
import { isScopeConfigured, scopeTrucksToViewer, type TruckViewScope } from '../truckViewScope';
import { TRUCK_CONFIG } from '../truckConfig';
import { TruckExpiryLines } from '../TruckExpiryLines';

const isMobile = device.isMobile;
const canCreate = perms.truck.canCreate();

const TRUCK_SCOPE: TruckViewScope = {
  canViewAll: perms.truck.canViewAll(),
  canViewSelf: perms.truck.canViewSelf(),
};
const scopeConfigured = isScopeConfigured(TRUCK_SCOPE);

type FilterStatus = 'all' | 'active' | 'inactive';
type TruckFilters = {
  status: FilterStatus;

  truckType: string;
  urgency: ExpiryUrgency;

  sort: string;
  search: string;
  page: number;
};
const FILTER_DEFAULTS: TruckFilters = {
  status: 'active',
  truckType: '',
  urgency: 'all',
  sort: '',
  search: '',
  page: 1,
};

export function TruckListShell({ headerExtraActions }: { headerExtraActions?: ReactNode }) {
  const { t } = useTranslation();
  const tk = (key: string): string => t(key as never);
  const { Icon, i18nKey } = TRUCK_CONFIG;

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } =
    useTruckAssetStore(
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

  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  useEffect(() => {
    if (scopeConfigured && !TRUCK_SCOPE.canViewAll && !employeesInit) loadEmployees();
  }, [employeesInit, loadEmployees]);

  const trucks = useMemo(() => {
    const live = (items as TruckAssetRow[]).filter((a) => !a.extra?.isDeleted);
    return scopeTrucksToViewer(live, getCurrentEmployeeId(), TRUCK_SCOPE);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `employees` is the hydration trigger for `getCurrentEmployeeId()`, not a value read here.
  }, [items, employees]);

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:truck-asset-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const { truckType, urgency, sort } = filterState;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const setTruckType = useCallback(
    (v: string | null) => updateState({ truckType: v ?? '', page: 1 }),
    [updateState],
  );
  const setUrgency = useCallback(
    (v: ExpiryUrgency) => updateState({ urgency: v, page: 1 }),
    [updateState],
  );
  const setSort = useCallback((v: string) => updateState({ sort: v, page: 1 }), [updateState]);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const todayIso = todayInVnDateString();

  const ordered = useMemo(() => {
    if (!sort) return trucks;
    const [field, dir] = sort.split('_');
    if (field !== 'expiry') return trucks;
    const mult = dir === 'asc' ? 1 : -1;
    return [...trucks].sort(
      (a, b) => (expirySortKey(a.extra, todayIso) - expirySortKey(b.extra, todayIso)) * mult,
    );
  }, [trucks, sort, todayIso]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(ordered, {
      filters: { status: filter, truckType, urgency },
      filterFn: (item, f) => {
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        if (f.truckType && item.extra?.truckType !== f.truckType) return false;
        if (!matchesUrgency(item.extra, todayIso, f.urgency as ExpiryUrgency)) return false;
        return true;
      },
      searchFields: (item) => TRUCK_CONFIG.searchFields(item).filter((v): v is string => !!v),
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const hasActiveFilters =
    !!search ||
    filter !== FILTER_DEFAULTS.status ||
    truckType !== FILTER_DEFAULTS.truckType ||
    urgency !== FILTER_DEFAULTS.urgency;

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('assets.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);
  const typeLabels = useLookupV2Labels('truck-type');

  const typeOptions = useLookupV2Options('truck-type');

  const urgencyChips: QuickFilterChip[] = useMemo(
    () =>
      (['all', 'within7', 'within30', 'expired'] as const).map((key) => ({
        key,
        label: tk(`${i18nKey}.urgency.${key}`),
        active: urgency === key,
        onClick: () => setUrgency(key),
      })),

    [t, i18nKey, urgency, setUrgency],
  );
  const columns = useMemo(
    () =>
      TRUCK_CONFIG.columns({
        t: (k) => t(k as never),
        typeLabels,
        formatDate,
        todayIso,
        sortField: sort,
        onSortChange: setSort,
      }),
    [t, typeLabels, todayIso, sort, setSort],
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
          extraActions={headerExtraActions}
          createCta={{
            to: TRUCK_CONFIG.routes.NEW,
            label: tk(`${i18nKey}.addItem`),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            recordCount={trucks.length}
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
            filters={[
              {
                title: tk(`${i18nKey}.filters.truckType`),
                value: truckType,
                options: [{ value: '', label: t('__new__.01-common.filters.all') }, ...typeOptions],
                onChange: setTruckType,
              },
            ]}
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
            filters={[
              {
                value: truckType || null,
                onChange: setTruckType,
                data: typeOptions,
                placeholder: tk(`${i18nKey}.filters.truckType`),

                searchable: typeOptions.length > 8,
                w: 170,
              },
            ]}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        )}
        <QuickFilterChips chips={urgencyChips} />
      </StickyListChrome>

      {isMobile ? (
        <ListCardList
          data={paginated}
          isLoading={loading && !initialized}
          detailRoute={TRUCK_CONFIG.routes.DETAIL}
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
          renderCard={(item: TruckAssetRow) => (
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
              <Group gap={6} wrap="wrap">
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
                {TRUCK_CONFIG.cardSubtitle(item) && (
                  <Text size="xs" c="dimmed">
                    {TRUCK_CONFIG.cardSubtitle(item)}
                  </Text>
                )}
              </Group>
              {/* Compliance was desktop-only until 2026-08-05 — a phone user
                  could not see a lapsing truck at all. `urgentOnly` keeps the
                  card silent unless something is actually inside the window: a
                  column has a header to justify a far-off date, a card doesn't. */}
              <TruckExpiryLines
                extra={item.extra}
                todayIso={todayIso}
                t={tk}
                formatDate={formatDate}
                urgentOnly
              />
            </Stack>
          )}
        />
      ) : (
        <ListDataTable
          data={paginated}
          columns={columns}
          isLoading={loading && !initialized}
          emptyMessage={tk(`${i18nKey}.noItems`)}
          detailRoute={TRUCK_CONFIG.routes.DETAIL}
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
