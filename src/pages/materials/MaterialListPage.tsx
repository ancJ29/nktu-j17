import { Badge, Group, Stack, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBox } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useLookupV2Options } from '@/hooks';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';
import {
  hasMaterialMinimumStock,
  isMaterialLowStock,
  MATERIAL_CATEGORY_LOOKUP,
} from '@/utils/materialConfig';
import type { MaterialInventoryRow } from '@/types';

import { MaterialCardList } from './MaterialCardList';
import { MaterialDataTable } from './MaterialDataTable';

const isMobile = device.isMobile;
const canCreate = perms.material.canCreate();

const canManageInventory = perms.material.canManageInventory();

const lowStockEnabled = canManageInventory && hasMaterialMinimumStock();

type FilterStatus = 'all' | 'active' | 'inactive';

type MaterialFilters = {
  status: FilterStatus;
  category: string | null;
  stock: string | null;
  search: string;
  page: number;
};
const FILTER_DEFAULTS: MaterialFilters = {
  status: 'all',
  category: null,
  stock: null,
  search: '',
  page: 1,
};

export function MaterialListPage() {
  const { t } = useTranslation();

  const {
    items: allMaterials,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useMaterialStore();

  
  
  const invRows = useMaterialInventoryStore((s) => s.items);
  const invInitialized = useMaterialInventoryStore((s) => s.initialized);
  const loadInventory = useMaterialInventoryStore((s) => s.loadAll);
  const forceRefreshInventory = useMaterialInventoryStore((s) => s.forceRefresh);

  
  
  
  const invByCode = useMemo(() => {
    const map = new Map<string, MaterialInventoryRow>();
    if (canManageInventory)
      for (const r of invRows) if (!r.extra?.isDeleted) map.set(r.itemCode, r);
    return map;
  }, [invRows]);

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:material-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const categoryFilter = filterState.category;
  
  
  const stockFilter = filterState.stock;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const setCategoryFilter = useCallback(
    (v: string | null) => updateState({ category: v }),
    [updateState],
  );
  const setStockFilter = useCallback(
    (v: string | null) => updateState({ stock: v }),
    [updateState],
  );
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  
  
  
  const categoryLookups = useLookupV2Options(MATERIAL_CATEGORY_LOOKUP);
  const categoryOptions = useMemo(
    () => categoryLookups.map((o) => ({ value: o.value, label: o.label })),
    [categoryLookups],
  );

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allMaterials, {
      filters: { status: filter, category: categoryFilter, stock: stockFilter },
      filterFn: (item, f) => {
        if (item.extra?.isDeleted) return false;
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        if (f.category && item.extra?.category !== f.category) return false;
        
        
        if (canManageInventory && f.stock) {
          const onHand = invByCode.get(item.code)?.onHand ?? 0;
          if (f.stock === 'inStock' && onHand <= 0) return false;
          if (f.stock === 'outOfStock' && onHand > 0) return false;
          if (f.stock === 'lowStock' && !isMaterialLowStock(item.extra?.minimumStock, onHand))
            return false;
        }
        return true;
      },
      searchFields: (item) => [item.name, item.code],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const { totalCount, inactiveCount } = useMemo(() => {
    let inactive = 0;
    for (const m of allMaterials) if (!m.isActive) inactive++;
    return { totalCount: allMaterials.length, inactiveCount: inactive };
  }, [allMaterials]);

  
  
  const { trackedCount, negativeCount } = useMemo(() => {
    if (!canManageInventory) return { trackedCount: 0, negativeCount: 0 };
    let tracked = 0;
    let negative = 0;
    for (const r of invRows) {
      if (r.extra?.isDeleted) continue;
      tracked++;
      if (r.onHand < 0) negative++;
    }
    return { trackedCount: tracked, negativeCount: negative };
  }, [invRows]);

  
  
  const lowStockCount = useMemo(() => {
    if (!lowStockEnabled) return 0;
    let low = 0;
    for (const m of allMaterials) {
      if (m.extra?.isDeleted) continue;
      if (isMaterialLowStock(m.extra?.minimumStock, invByCode.get(m.code)?.onHand)) low++;
    }
    return low;
  }, [allMaterials, invByCode]);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (canManageInventory && !invInitialized) loadInventory();
  }, [invInitialized, loadInventory]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('materials.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  
  
  const handleForceRefresh = useCallback(() => {
    forceRefresh();
    if (canManageInventory) forceRefreshInventory();
  }, [forceRefresh, forceRefreshInventory]);

  
  
  const stockOptions = useMemo(
    () => [
      { value: 'inStock', label: t('materials.filterStockInStock') },
      { value: 'outOfStock', label: t('materials.filterStockOutOfStock') },
      ...(lowStockEnabled
        ? [{ value: 'lowStock', label: t('materials.filterStockLowStock') }]
        : []),
    ],
    [t],
  );

  const desktopFilters: SelectFilter[] = useMemo(
    () => [
      ...(categoryOptions.length > 0
        ? [
            {
              value: categoryFilter,
              onChange: setCategoryFilter,
              data: categoryOptions,
              placeholder: t('materials.filterCategoryAll'),
              searchable: true,
              w: 200,
            } as SelectFilter,
          ]
        : []),
      ...(canManageInventory
        ? [
            {
              value: stockFilter,
              onChange: setStockFilter,
              data: stockOptions,
              placeholder: t('materials.filterStockAll'),
              searchable: false,
              w: 180,
            } as SelectFilter,
          ]
        : []),
    ],
    [
      categoryOptions,
      categoryFilter,
      setCategoryFilter,
      stockFilter,
      setStockFilter,
      stockOptions,
      t,
    ],
  );

  const mobileFilters: MobileFilterDef[] = useMemo(
    () => [
      ...(categoryOptions.length > 0
        ? [
            {
              title: t('common.labels.category'),
              value: categoryFilter ?? 'all',
              options: [
                { value: 'all', label: t('materials.filterCategoryAll') },
                ...categoryOptions,
              ],
              onChange: (v: string) => setCategoryFilter(v === 'all' ? null : v),
            } as MobileFilterDef,
          ]
        : []),
      ...(canManageInventory
        ? [
            {
              title: t('materials.filterStockTitle'),
              value: stockFilter ?? 'all',
              options: [{ value: 'all', label: t('materials.filterStockAll') }, ...stockOptions],
              onChange: (v: string) => setStockFilter(v === 'all' ? null : v),
            } as MobileFilterDef,
          ]
        : []),
    ],
    [
      categoryOptions,
      categoryFilter,
      setCategoryFilter,
      stockFilter,
      setStockFilter,
      stockOptions,
      t,
    ],
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('materials.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconBox size={20} stroke={1.75} />
            </ThemeIcon>
          }
          subtitle={
            initialized && totalCount > 0 ? (
              <Group gap={6} wrap="nowrap">
                {totalCount > 0 && (
                  <Badge size="xs" variant="light" color="primary" radius="sm" tt="lowercase">
                    {totalCount} {t('materials.status.active')}
                  </Badge>
                )}
                {inactiveCount > 0 && (
                  <Badge size="xs" variant="light" color="gray" radius="sm" tt="lowercase">
                    {inactiveCount} {t('common.status.inactive')}
                  </Badge>
                )}
                {canManageInventory && trackedCount > 0 && (
                  <Badge size="xs" variant="light" color="teal" radius="sm" tt="lowercase">
                    {t('materials.summary.tracked', { count: trackedCount })}
                  </Badge>
                )}
                {lowStockEnabled && lowStockCount > 0 && (
                  <Badge size="xs" variant="light" color="orange" radius="sm" tt="lowercase">
                    {t('materials.summary.lowStock', { count: lowStockCount })}
                  </Badge>
                )}
                {canManageInventory && negativeCount > 0 && (
                  <Badge size="xs" variant="light" color="red" radius="sm" tt="lowercase">
                    {t('materials.summary.negative', { count: negativeCount })}
                  </Badge>
                )}
              </Group>
            ) : undefined
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          createCta={{
            to: ROUTES.MATERIALS.NEW,
            label: t('materials.addItem'),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.materials.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('materials.filterActive'),
              inactive: t('common.filters.inactive'),
            }}
            filters={mobileFilters.length > 0 ? mobileFilters : undefined}
            onClear={clearFilters}
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.materials.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('materials.filterActive'),
              inactive: t('common.filters.inactive'),
            }}
            filters={desktopFilters.length > 0 ? desktopFilters : undefined}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <MaterialCardList
          materials={paginated}
          isLoading={loading && !initialized}
          invByCode={canManageInventory ? invByCode : undefined}
        />
      ) : (
        <MaterialDataTable
          materials={paginated}
          isLoading={loading && !initialized}
          invByCode={canManageInventory ? invByCode : undefined}
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
