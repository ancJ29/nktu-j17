import { Button, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration, useLookupOptions } from '@/hooks';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import {
  hasHideFromInventoryListForProducts,
  isPriceManagementEnabled,
  isProductInventoryEnabled,
  perms,
} from '@/utils/permission';
import { isNoInventoryProduct } from '@/utils/productSet';
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

type ProductFilters = {
  status: FilterStatus;
  category: string | null;
  stock: string | null;
  search: string;
  page: number;
};
const FILTER_DEFAULTS: ProductFilters = {
  status: 'all',
  category: null,
  stock: null,
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

  const filters = { status: filter, category: categoryFilter, stock: stockFilter };

  const onHandByCode = useMemo(() => {
    const m = new Map<string, number>();
    if (!inventoryEnabled) return m;
    for (const row of inventoryItems) {
      if (row.extra?.isDeleted) continue;
      m.set(row.itemCode, (m.get(row.itemCode) ?? 0) + row.onHand);
    }
    return m;
  }, [inventoryItems]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(allProducts, {
      filters,
      filterFn: (item, f) => {
        if (item.extra?.isDeleted) return false;
        if (f.status === 'active' && !item.isActive) return false;
        if (f.status === 'inactive' && item.isActive) return false;
        if (f.category && item.extra?.category !== f.category) return false;

        if (inventoryEnabled && f.stock) {
          if (f.stock === 'notManaged') return isNoInventoryProduct(item);
          if (isNoInventoryProduct(item)) return false;
          const onHand = onHandByCode.get(item.code) ?? 0;
          if (f.stock === 'inStock' && onHand <= 0) return false;
          if (f.stock === 'outOfStock' && onHand !== 0) return false;
          if (f.stock === 'lowStock') {
            const min = item.extra?.minimumInventory?.value;
            if (typeof min !== 'number' || min <= 0) return false;
            if (onHand >= min) return false;
          }
        }
        return true;
      },
      searchFields: (item) => [
        item.name,
        item.unit,
        item.description,
        ...(item.extra?.alternativeNames ?? []),
        ...(item.extra?.sku ? [item.extra.sku] : []),
      ],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const categoryLookups = useLookupOptions('product-category');
  const categoryOptions = useMemo(
    () => categoryLookups.map((o) => ({ value: o.value, label: o.label })),
    [categoryLookups],
  );

  const tagLookups = useLookupOptions('product-tag');
  const unitLookups = useLookupOptions('unit');

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

  const stockOptions = useMemo(
    () => [
      { value: 'inStock', label: t('products.filterStockInStock') },
      { value: 'outOfStock', label: t('products.filterStockOutOfStock') },
      { value: 'lowStock', label: t('products.filterStockLowStock') },
      { value: 'notManaged', label: t('products.filterStockNotManaged') },
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
              placeholder: t('products.filterCategoryAll'),
              searchable: true,
              w: 200,
            },
          ]
        : []),
      ...(inventoryEnabled
        ? [
            {
              value: stockFilter,
              onChange: setStockFilter,
              data: stockOptions,
              placeholder: t('products.filterStockAll'),
              searchable: false,
              w: 180,
            },
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

  const mobileFilters: (MobileFilterDef | MobileMultiFilterDef)[] = useMemo(
    () => [
      ...(categoryOptions.length > 0
        ? [
            {
              title: t('common.labels.category'),
              value: categoryFilter ?? 'all',
              options: [
                { value: 'all', label: t('products.filterCategoryAll') },
                ...categoryOptions,
              ],
              onChange: (v: string) => setCategoryFilter(v === 'all' ? null : v),
            },
          ]
        : []),
      ...(inventoryEnabled
        ? [
            {
              title: t('products.filterStockTitle'),
              value: stockFilter ?? 'all',
              options: [{ value: 'all', label: t('products.filterStockAll') }, ...stockOptions],
              onChange: (v: string) => setStockFilter(v === 'all' ? null : v),
            },
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

  const [isExporting, setIsExporting] = useState(false);
  const handleExport = useCallback(() => {
    setIsExporting(true);
    try {
      const categoryLabels = Object.fromEntries(categoryLookups.map((o) => [o.value, o.label]));
      const tagLabels = Object.fromEntries(tagLookups.map((o) => [o.value, o.label]));
      const unitLabels = Object.fromEntries(unitLookups.map((o) => [o.value, o.label]));
      exportProductsToExcel(allProducts, {
        language: i18n.language,
        hasPrice: priceVisible,
        categoryLabels,
        tagLabels,
        unitLabels,
        hasHideFromInventoryList: hideFromInventoryListEnabled,
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
  }, [allProducts, categoryLookups, tagLookups, unitLookups, i18n.language, t]);

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
              mobileVariant: 'icon',
            }}
          />

          {isMobile ? (
            <MobileFilterBar
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
          />
        ) : (
          <ProductDataTable
            products={paginated}
            isLoading={loading && !initialized}
            onHandByCode={onHandByCode}
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
    </>
  );
}
