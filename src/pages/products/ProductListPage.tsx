import { Button, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { LIST_LAZY_RENDER_CHUNK } from '@/config/listDefaults';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration, useLookupV2Options } from '@/hooks';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import {
  hasHideFromInventoryListForProducts,
  isPriceManagementEnabled,
  isProductInventoryEnabled,
  perms,
} from '@/utils/permission';
import { isHiddenFromInventoryListProduct } from '@/utils/productSet';
import { logActivity } from '@/utils/activityLogger';
import { exportProductsToExcel } from '@/utils/excelParser';
import { ProductCardList } from './ProductCardList';
import { ProductDataTable } from './ProductDataTable';

const isMobile = device.isMobile;
const canCreate = perms.product.canCreate();

const priceVisible = isPriceManagementEnabled() && perms.product.canViewPrice();
const inventoryEnabled = isProductInventoryEnabled();
const hideFromInventoryListEnabled = hasHideFromInventoryListForProducts();

type FilterStatus = 'all' | 'active' | 'inactive';

type FilterInventoryDisplay = 'shown' | 'hidden' | null;

type ProductFilters = {
  status: FilterStatus;
  category: string | null;
  inventoryDisplay: FilterInventoryDisplay;
  search: string;
  page: number;
};

type ProductFilterDimensions = Pick<ProductFilters, 'status' | 'category' | 'inventoryDisplay'>;

const FILTER_DEFAULTS: ProductFilters = {
  status: 'all',
  category: null,
  inventoryDisplay: null,
  search: '',
  page: 1,
};

export function ProductListPage() {
  const { t, i18n } = useTranslation();
  const scrollViewportRef = useListScrollRestoration(ROUTES.PRODUCTS.LIST);

  const {
    items: allProducts,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useProductStore();

  const inventoryItems = useProductInventoryStore((s) => s.items);
  const inventoryInitialized = useProductInventoryStore((s) => s.initialized);
  const loadInventory = useProductInventoryStore((s) => s.loadAll);

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:product-list-filters', FILTER_DEFAULTS);
  const filter = filterState.status;
  const categoryFilter = filterState.category;

  const inventoryDisplayFilter = filterState.inventoryDisplay;
  const setFilter = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);
  const setCategoryFilter = useCallback(
    (v: string | null) => updateState({ category: v }),
    [updateState],
  );
  const setInventoryDisplayFilter = useCallback(
    (v: string | null) => updateState({ inventoryDisplay: (v as FilterInventoryDisplay) ?? null }),
    [updateState],
  );
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const filters = useMemo(
    () => ({ status: filter, category: categoryFilter, inventoryDisplay: inventoryDisplayFilter }),
    [filter, categoryFilter, inventoryDisplayFilter],
  );

  const onHandByCode = useMemo(() => {
    const m = new Map<string, number>();
    if (!inventoryEnabled) return m;
    for (const row of inventoryItems) {
      if (row.extra?.isDeleted) continue;
      m.set(row.itemCode, (m.get(row.itemCode) ?? 0) + row.onHand);
    }
    return m;
  }, [inventoryItems]);

  const filterFn = useCallback((item: (typeof allProducts)[number], f: ProductFilterDimensions) => {
    if (item.extra?.isDeleted) return false;
    if (f.status === 'active' && !item.isActive) return false;
    if (f.status === 'inactive' && item.isActive) return false;
    if (f.category && item.extra?.category !== f.category) return false;

    if (hideFromInventoryListEnabled && f.inventoryDisplay) {
      const hidden = isHiddenFromInventoryListProduct(item);
      if (f.inventoryDisplay === 'shown' ? hidden : !hidden) return false;
    }
    return true;
  }, []);

  const searchFields = useCallback(
    (item: (typeof allProducts)[number]) => [
      item.name,
      item.unit,
      item.description,
      ...(item.extra?.alternativeNames ?? []),
      ...(item.extra?.sku ? [item.extra.sku] : []),
    ],
    [],
  );

  const {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    paginated,
    totalPages,
    totalItems,
    hasMore,
    loadMore,
  } = useListFilter(allProducts, {
    filters,
    filterFn,
    searchFields,
    search: filterState.search,
    onSearchChange,
    page: filterState.page,
    onPageChange,

    lazyKey: ROUTES.PRODUCTS.LIST,
  });

  const loadingMoreLabel = t('__new__.01-common.list.loadingMore', {
    chunk: Math.min(totalItems - paginated.length, LIST_LAZY_RENDER_CHUNK),
    total: totalItems,
  });

  const categoryLookups = useLookupV2Options('product-category');
  const categoryOptions = useMemo(
    () => categoryLookups.map((o) => ({ value: o.value, label: o.label })),
    [categoryLookups],
  );

  const unitLookups = useLookupV2Options('product-unit');

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (inventoryEnabled && !inventoryInitialized) loadInventory();
  }, [inventoryInitialized, loadInventory]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('products.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => {
    forceRefresh();
  }, [forceRefresh]);

  const inventoryDisplayOptions = useMemo(
    () =>
      hideFromInventoryListEnabled
        ? [
            { value: 'shown', label: t('products.filterInventoryDisplayShown') },
            { value: 'hidden', label: t('products.filterInventoryDisplayHidden') },
          ]
        : [],
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
              placeholder: t('products.filterCategoryAll'),
              searchable: true,
              w: 200,
            },
          ]
        : []),
      ...(inventoryDisplayOptions.length > 0
        ? [
            {
              value: inventoryDisplayFilter,
              onChange: setInventoryDisplayFilter,
              data: inventoryDisplayOptions,
              placeholder: t('products.filterInventoryDisplayAll'),
              searchable: false,
              w: 200,
            },
          ]
        : []),
    ],
    [
      categoryOptions,
      categoryFilter,
      setCategoryFilter,
      inventoryDisplayFilter,
      setInventoryDisplayFilter,
      inventoryDisplayOptions,
      t,
    ],
  );

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = useMemo(
    () => [
      ...(categoryOptions.length > 0
        ? [
            allOptionFilter({
              title: t('common.labels.category'),
              value: categoryFilter,
              options: categoryOptions,
              onChange: setCategoryFilter,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
      ...(inventoryDisplayOptions.length > 0
        ? [
            allOptionFilter({
              title: t('products.filterInventoryDisplayTitle'),
              value: inventoryDisplayFilter,
              options: inventoryDisplayOptions,
              onChange: setInventoryDisplayFilter,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
    ],
    [
      categoryOptions,
      categoryFilter,
      setCategoryFilter,
      inventoryDisplayFilter,
      setInventoryDisplayFilter,
      inventoryDisplayOptions,
      t,
    ],
  );

  const [isExporting, setIsExporting] = useState(false);
  const handleExport = useCallback(() => {
    setIsExporting(true);
    try {
      const categoryLabels = Object.fromEntries(categoryLookups.map((o) => [o.value, o.label]));
      const unitLabels = Object.fromEntries(unitLookups.map((o) => [o.value, o.label]));
      exportProductsToExcel(allProducts, {
        language: i18n.language,
        hasPrice: priceVisible,
        categoryLabels,
        unitLabels,
        hasHideFromInventoryList: hideFromInventoryListEnabled,
        hasInventory: inventoryEnabled,
        onHandByCode,
      });
      logActivity('product.export', undefined, { count: allProducts.length });
    } catch {
      notifications.show({
        color: 'red',
        message: t('products.notifications.exportError'),
      });
    } finally {
      setIsExporting(false);
    }
  }, [allProducts, categoryLookups, unitLookups, onHandByCode, i18n.language, t]);

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        <StickyListChrome>
          <ListPageHeader
            title={t('common.labels.product')}
            cachedAt={cachedAt}
            loading={loading}
            onRefresh={handleForceRefresh}
            extraActions={
              <Button
                variant="default"
                size="sm"
                leftSection={<IconDownload size={16} />}
                onClick={handleExport}
                loading={isExporting}
                disabled={allProducts.length === 0}
              >
                {t('__new__.01-common.actions.exportExcel')}
              </Button>
            }
            createCta={{
              to: ROUTES.PRODUCTS.NEW,
              label: t('products.addItem'),
              enabled: canCreate,
            }}
          />

          {isMobile ? (
            <MobileFilterBar
              recordCount={allProducts.length}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('__new__.07-entities.products.list.searchPlaceholder')}
              status={filter}
              onStatusChange={setFilter}
              statusTitle={t('__new__.01-common.labels.status')}
              statusLabels={{
                all: t('__new__.01-common.filters.all'),
                active: t('products.filterActive'),
                inactive: t('products.filterInactive'),
              }}
              filters={mobileFilters.length > 0 ? mobileFilters : undefined}
              onClear={clearFilters}

              labelChips
            />
          ) : (
            <DesktopFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('__new__.07-entities.products.list.searchPlaceholder')}
              status={filter}
              onStatusChange={setFilter}
              statusLabels={{
                all: t('__new__.01-common.filters.all'),
                active: t('products.filterActive'),
                inactive: t('products.filterInactive'),
              }}
              filters={desktopFilters.length > 0 ? desktopFilters : undefined}
              onClear={clearFilters}
            />
          )}
        </StickyListChrome>

        {isMobile ? (
          <ProductCardList
            products={paginated}
            isLoading={loading && !initialized}
            onHandByCode={onHandByCode}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMoreLabel={loadingMoreLabel}
          />
        ) : (
          <ProductDataTable
            products={paginated}
            isLoading={loading && !initialized}
            onHandByCode={onHandByCode}
            viewportRef={scrollViewportRef}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMoreLabel={loadingMoreLabel}
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
    </>
  );
}
