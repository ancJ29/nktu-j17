import { Badge, Button, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBoxMultiple, IconBuildingWarehouse, IconCalendar } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import {
  parseColumnFilters,
  serializeColumnFilters,
  useColumnFilters,
  type ColumnFilterDef,
  type ColumnFilterValues,
} from '@credo/base-ui/hooks';
import { useListScrollRestoration, useLookupV2Labels, useLookupV2Options } from '@/hooks';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useOpenInboundByProduct } from '@/hooks/useOpenInboundByProduct';
import { createCustomerShortNameResolver } from '@/utils/customerDisplay';
import { seedCurrentPeriodForProductInventory } from '@/utils/inventoryPeriod';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  MobileFilterBar,
  type MobileFilterDef,
  type MobileMultiFilterDef,
} from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import { QuickFilterChips, type QuickFilterChip } from '@/components/QuickFilterChips';
import { perms } from '@/utils/permission';
import { isDefaultLocation, type Product, type ProductInventorySummary } from '@/types';
import { buildProductInventorySummaries } from '@/utils/productInventorySummaries';

import { buildProductInventoryColumnFilterDefs } from './productInventoryColumnFilters';
import { ProductInventoryCardList } from './ProductInventoryCardList';
import { ProductInventoryBeginOfPeriodModal } from './ProductInventoryBeginOfPeriodModal';
import { ProductInventoryComposeSetModal } from './ProductInventoryComposeSetModal';
import { ProductInventoryDataTable } from './ProductInventoryDataTable';
import { ProductInventoryDecomposeSetModal } from './ProductInventoryDecomposeSetModal';
import { ProductInventoryOutgoingModal } from './ProductInventoryOutgoingModal';
import { rollupReservationsBySO } from './productInventoryReservations';
import { useReservationOrderStatus } from './useReservationOrderStatus';
import { InventoryImportExportActions } from '@/components/inventory/InventoryImportExportActions';
import { hasHideFromInventoryListForProducts, isLocationsEnabled } from '@/utils/permission';
import {
  isBundleSet,
  isProductSet,
  isNoInventoryProduct,
  isHiddenFromInventoryListProduct,
} from '@/utils/productSet';
import { PRODUCT_SET_COLOR } from '@/config/misc';
import type { ProductInventoryListVariant } from './productInventoryListVariant';

const locationsEnabled = isLocationsEnabled();

const hideFromInventoryListEnabled = hasHideFromInventoryListForProducts();
const isMobile = device.isMobile;

const canBulkImport = perms.productInventory.canBulkImport();

const canEditInventory = perms.productInventory.canEdit();
const canCompose = canEditInventory;
const canViewGoodsReceipts = perms.goodsReceipt.canView();

const canViewCustomers = perms.customer.canView();

type StockFilter = 'noStock' | 'outOfStock' | 'lowStock' | 'negative' | null;

type SecondaryFilter = 'outOfStock' | 'mustOrder' | 'ok' | null;

type ProductInventoryFilters = {
  location: string | null;
  category: string | null;
  stock: StockFilter;

  secondary: SecondaryFilter;
  search: string;
  page: number;

  columnFilters: string;
};
const FILTER_DEFAULTS: ProductInventoryFilters = {
  location: null,
  category: null,
  stock: null,
  secondary: null,
  search: '',
  page: 1,
  columnFilters: '',
};

type ProductInventoryListProps = {
  readonly variant: ProductInventoryListVariant;
};

export function ProductInventoryList({ variant }: ProductInventoryListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollViewportRef = useListScrollRestoration(ROUTES.INVENTORY.PRODUCTS);

  const showBeginOfPeriod = variant.showBeginOfPeriod && canEditInventory;
  const shouldDisplayHeaderBadges = variant.showStockKpiBadges;
  const shouldDisplaySecondaryHeaderBadges = variant.showSecondaryKpiBadges;

  const secondaryFilterEnabled =
    variant.showSecondaryFilter || variant.quickChipMode === 'secondary';

  const {
    items: allRows,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useProductInventoryStore();

  const products = useProductStore((s) => s.items);
  const locations = useLocationStore((s) => s.items);
  const productsInitialized = useProductStore((s) => s.initialized);
  const locationsInitialized = useLocationStore((s) => s.initialized);
  const loadProducts = useProductStore((s) => s.loadAll);
  const loadLocations = useLocationStore((s) => s.loadAll);

  const goodsReceiptsInitialized = useGoodsReceiptStore((s) => s.initialized);
  const loadGoodsReceipts = useGoodsReceiptStore((s) => s.loadAll);
  const inboundIndex = useOpenInboundByProduct();

  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const resolveCustomerName = useMemo(
    () => (canViewCustomers ? createCustomerShortNameResolver(customers) : undefined),
    [customers],
  );

  const orderStatus = useReservationOrderStatus();

  const [outgoingFor, setOutgoingFor] = useState<ProductInventorySummary | null>(null);
  const outgoingReservations = useMemo(
    () => (outgoingFor ? rollupReservationsBySO(outgoingFor) : []),
    [outgoingFor],
  );

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:product-inventory-list-filters', FILTER_DEFAULTS);
  const locationFilter = filterState.location;
  const categoryFilter = filterState.category;
  const stockFilter = filterState.stock;
  const secondaryFilter = filterState.secondary;
  const setLocationFilter = useCallback(
    (v: string | null) => updateState({ location: v }),
    [updateState],
  );
  const setCategoryFilter = useCallback(
    (v: string | null) => updateState({ category: v }),
    [updateState],
  );
  const setStockFilter = useCallback((v: StockFilter) => updateState({ stock: v }), [updateState]);
  const setSecondaryFilter = useCallback(
    (v: SecondaryFilter) => updateState({ secondary: v }),
    [updateState],
  );
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const summaries: ProductInventorySummary[] = useMemo(
    () =>
      buildProductInventorySummaries(
        products.filter(
          (p) =>
            !isNoInventoryProduct(p) &&
            !(hideFromInventoryListEnabled && isHiddenFromInventoryListProduct(p)),
        ),
        allRows,
        { locationFilter, inboundByCode: inboundIndex },
      ),
    [products, allRows, locationFilter, inboundIndex],
  );

  const columnFilterValues = useMemo(
    () => parseColumnFilters(filterState.columnFilters),
    [filterState.columnFilters],
  );
  const setColumnFilterValues = useCallback(
    (next: ColumnFilterValues) => updateState({ columnFilters: serializeColumnFilters(next) }),
    [updateState],
  );
  const columnFilterLabels = useMemo(
    () => ({
      search: t('__new__.01-common.filters.columnFilter.search'),
      selectAll: t('__new__.01-common.filters.columnFilter.selectAll'),
      clear: t('__new__.01-common.filters.columnFilter.clear'),
      empty: t('__new__.01-common.filters.columnFilter.empty'),
    }),
    [t],
  );
  const secondaryStatusLabels: Record<string, string> = useMemo(
    () => ({
      outOfStock: t('common.secondaryStatus.outOfStock'),
      mustOrder: t('common.secondaryStatus.mustOrder'),
      ok: t('common.secondaryStatus.ok'),
    }),
    [t],
  );
  const locationNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of locations) map.set(l.code, l.name);
    return map;
  }, [locations]);

  const columnFilterDefs: ColumnFilterDef<ProductInventorySummary>[] = useMemo(
    () =>
      variant.showColumnHeaderFilters
        ? buildProductInventoryColumnFilterDefs({
            locationLabelOf: (code) =>
              isDefaultLocation(code)
                ? t('productInventory.defaultLocationBadge')
                : (locationNameByCode.get(code) ?? code),
            secondaryStatusLabelOf: (value) => secondaryStatusLabels[value] ?? value,
            inboundIndex,
            locationsEnabled,
            labels: columnFilterLabels,
          })
        : [],
    [
      variant.showColumnHeaderFilters,
      t,
      locationNameByCode,
      secondaryStatusLabels,
      inboundIndex,
      columnFilterLabels,
    ],
  );

  const columnFilters = useColumnFilters(summaries, columnFilterDefs, {
    value: columnFilterValues,
    onChange: setColumnFilterValues,
  });

  const filters = {
    locationCode: locationFilter,
    category: categoryFilter,
    stock: stockFilter,
    secondary: secondaryFilter,

    columnFilters: filterState.columnFilters,
  };

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(summaries, {
      filters,
      filterFn: (s, f) => {
        if (!s.product.isActive) return false;
        if (f.category && s.product.extra?.category !== f.category) return false;

        if (f.locationCode && s.rows.length === 0 && f.stock !== 'noStock') return false;
        if (f.stock === 'noStock' && s.rows.length > 0) return false;
        if (f.stock === 'outOfStock' && (s.rows.length === 0 || s.totalOnHand !== 0)) return false;
        if (f.stock === 'negative' && s.totalOnHand >= 0) return false;
        if (f.stock === 'lowStock') {
          const min = s.product.extra?.minimumInventory?.value;
          if (typeof min !== 'number' || s.totalOnHand <= 0 || s.totalOnHand > min) return false;
        }
        if (secondaryFilterEnabled && f.secondary && s.secondaryStatus !== f.secondary)
          return false;

        if (!columnFilters.predicate(s)) return false;
        return true;
      },
      searchFields: (s) => [s.product.name, s.product.extra?.sku ?? '', s.product.code],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const {
    totalCount,
    outOfStockCount,
    lowCount,
    negativeCount,
    secondaryMustOrderCount,
    secondaryOutOfStockCount,
  } = useMemo(() => {
    let out = 0;
    let low = 0;
    let neg = 0;
    let total = 0;
    let secondaryOutOfStock = 0;
    let secondaryMustOrder = 0;
    for (const s of summaries) {
      if (!s.product.isActive) continue;
      if (s.secondaryStatus === 'outOfStock') secondaryOutOfStock++;
      else if (s.secondaryStatus === 'mustOrder') secondaryMustOrder++;
      total++;
      if (s.totalOnHand < 0) {
        neg++;
      } else if (s.totalOnHand === 0) {
        out++;
      } else {
        const min = s.product.extra?.minimumInventory?.value;
        if (typeof min === 'number' && s.totalOnHand <= min) low++;
      }
    }
    return {
      secondaryOutOfStockCount: secondaryOutOfStock,
      secondaryMustOrderCount: secondaryMustOrder,
      totalCount: total,
      outOfStockCount: out,
      lowCount: low,
      negativeCount: neg,
    };
  }, [summaries]);

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (!initialized || loading) return;
    void seedCurrentPeriodForProductInventory();
  }, [initialized, loading]);

  useEffect(() => {
    if (!productsInitialized) loadProducts();
    if (!locationsInitialized) loadLocations();
  }, [productsInitialized, locationsInitialized, loadProducts, loadLocations]);

  useEffect(() => {
    if (!canViewGoodsReceipts) return;
    if (!goodsReceiptsInitialized) loadGoodsReceipts();
  }, [goodsReceiptsInitialized, loadGoodsReceipts]);

  useEffect(() => {
    if (!canViewCustomers) return;
    if (!customersInitialized) loadCustomers();
  }, [customersInitialized, loadCustomers]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('productInventory.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  const [composeOpen, setComposeOpen] = useState(false);
  const [decomposeOpen, setDecomposeOpen] = useState(false);
  const hasActiveSetProduct = useMemo(
    () => products.some((p) => p.isActive && isProductSet(p)),
    [products],
  );
  const hasActiveBundleSet = useMemo(
    () => products.some((p) => p.isActive && isBundleSet(p)),
    [products],
  );
  const showComposeButton = canCompose && hasActiveBundleSet;
  const showSetOpsButtons = canCompose && hasActiveSetProduct;
  const openCompose = useCallback(() => setComposeOpen(true), []);
  const closeCompose = useCallback(() => setComposeOpen(false), []);
  const openDecompose = useCallback(() => setDecomposeOpen(true), []);
  const closeDecompose = useCallback(() => setDecomposeOpen(false), []);

  const [beginOfPeriodOpen, setBeginOfPeriodOpen] = useState(false);
  const openBeginOfPeriod = useCallback(() => setBeginOfPeriodOpen(true), []);
  const closeBeginOfPeriod = useCallback(() => setBeginOfPeriodOpen(false), []);

  const handleRowClick = useCallback(
    (product: Product) => {
      navigate(`${ROUTES.PRODUCTS.DETAIL.replace(':id', product.id)}?tab=inventory`, {
        state: { backTo: ROUTES.INVENTORY.PRODUCTS },
      });
    },
    [navigate],
  );

  const locationOptions = useMemo(
    () =>
      locations
        .filter((l) => l.isActive)
        .map((l) => ({ value: l.code, label: `${l.name} (${l.code})` })),
    [locations],
  );

  const categoryLookups = useLookupV2Options('product-category');

  const unitLabels = useLookupV2Labels('unit');
  const categoryOptions = useMemo(
    () => categoryLookups.map((o) => ({ value: o.value, label: o.label })),
    [categoryLookups],
  );

  const stockOptions = useMemo(
    () => [
      { value: 'noStock', label: t('productInventory.filterStock.noStock') },
      { value: 'outOfStock', label: t('productInventory.filterStock.outOfStock') },
      { value: 'lowStock', label: t('productInventory.filterStock.lowStock') },
      { value: 'negative', label: t('productInventory.filterStock.negative') },
    ],
    [t],
  );

  const secondaryOptions = useMemo(
    () => [
      { value: 'outOfStock', label: secondaryStatusLabels.outOfStock },
      { value: 'mustOrder', label: secondaryStatusLabels.mustOrder },
      { value: 'ok', label: secondaryStatusLabels.ok },
    ],
    [secondaryStatusLabels],
  );

  const desktopFilters: SelectFilter[] = useMemo(
    () => [
      ...(locationsEnabled
        ? [
            {
              value: locationFilter,
              onChange: setLocationFilter,
              data: locationOptions,
              placeholder: t('productInventory.filterByLocation'),
              searchable: true,
              w: 220,
            },
          ]
        : []),
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
      ...(variant.showStockFilter
        ? [
            {
              value: stockFilter,
              onChange: (v: string | null) => setStockFilter(v as StockFilter),
              data: stockOptions,
              placeholder: t('productInventory.filterStock.placeholder'),
              searchable: false,
              w: 180,
            },
          ]
        : []),
      ...(variant.showSecondaryFilter
        ? [
            {
              value: secondaryFilter,
              onChange: (v: string | null) => setSecondaryFilter(v as SecondaryFilter),
              data: secondaryOptions,
              placeholder: t('common.secondaryStatus.filterPlaceholder'),
              searchable: false,
              w: 180,
            },
          ]
        : []),
    ],
    [
      locationFilter,
      setLocationFilter,
      locationOptions,
      categoryFilter,
      setCategoryFilter,
      categoryOptions,
      stockFilter,
      setStockFilter,
      stockOptions,
      secondaryFilter,
      setSecondaryFilter,
      secondaryOptions,
      variant.showStockFilter,
      variant.showSecondaryFilter,
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

      ...(variant.showStockFilter && !(isMobile && variant.quickChipMode === 'stock')
        ? [
            allOptionFilter<StockFilter>({
              title: t('productInventory.filterStock.title'),
              value: stockFilter,
              options: stockOptions,
              onChange: setStockFilter,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),

      ...(variant.showSecondaryFilter && !(isMobile && variant.quickChipMode === 'secondary')
        ? [
            allOptionFilter<SecondaryFilter>({
              title: t('common.columns.secondaryStatus'),
              value: secondaryFilter,
              options: secondaryOptions,
              onChange: setSecondaryFilter,
              allLabel: t('__new__.01-common.filters.all'),
              emptyValue: null,
            }),
          ]
        : []),
    ],
    [
      categoryFilter,
      setCategoryFilter,
      categoryOptions,
      stockFilter,
      setStockFilter,
      stockOptions,
      secondaryFilter,
      setSecondaryFilter,
      secondaryOptions,
      variant.showStockFilter,
      variant.showSecondaryFilter,
      variant.quickChipMode,
      t,
    ],
  );

  const mobileQuickChips: QuickFilterChip[] = useMemo(
    () =>
      variant.quickChipMode === 'none'
        ? []
        : variant.quickChipMode === 'secondary'
          ? [
              {
                key: 'all',
                label: t('common.secondaryStatus.all'),
                active: secondaryFilter === null,
                onClick: () => setSecondaryFilter(null),
              },
              {
                key: 'mustOrder',
                label: t('common.secondaryStatus.mustOrder'),
                active: secondaryFilter === 'mustOrder',
                onClick: () =>
                  setSecondaryFilter(secondaryFilter === 'mustOrder' ? null : 'mustOrder'),
              },
              {
                key: 'outOfStock',
                label: t('common.secondaryStatus.outOfStock'),
                active: secondaryFilter === 'outOfStock',
                onClick: () =>
                  setSecondaryFilter(secondaryFilter === 'outOfStock' ? null : 'outOfStock'),
              },
            ]
          : [
              {
                key: 'all',
                label: t('productInventory.filterStock.all'),
                active: stockFilter === null,
                onClick: () => setStockFilter(null),
              },
              {
                key: 'lowStock',
                label: t('productInventory.filterStock.lowStock'),
                active: stockFilter === 'lowStock',
                onClick: () => setStockFilter(stockFilter === 'lowStock' ? null : 'lowStock'),
              },
              {
                key: 'outOfStock',
                label: t('productInventory.filterStock.outOfStock'),
                active: stockFilter === 'outOfStock',
                onClick: () => setStockFilter(stockFilter === 'outOfStock' ? null : 'outOfStock'),
              },
            ],
    [stockFilter, setStockFilter, secondaryFilter, setSecondaryFilter, variant.quickChipMode, t],
  );

  const loadingInitial =
    (loading && !initialized) || (!productsInitialized && products.length === 0);

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('common.labels.productInventory')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconBuildingWarehouse size={20} stroke={1.75} />
            </ThemeIcon>
          }
          subtitle={
            <Group gap={6} wrap="wrap">
              {initialized && (
                <Text size="xs" c="dimmed">
                  {t('productInventory.kpis.totalProducts', { count: totalCount })}
                </Text>
              )}
              {shouldDisplaySecondaryHeaderBadges ? (
                <>
                  {/* Drill-down only while the secondary filter has a visible
                      control — a badge click must never apply a filter the
                      operator can't see or clear. Without one the badges are
                      read-only counts. */}
                  {secondaryMustOrderCount > 0 && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="orange"
                      radius="sm"
                      tt="lowercase"
                      style={secondaryFilterEnabled ? { cursor: 'pointer' } : undefined}
                      onClick={
                        secondaryFilterEnabled ? () => setSecondaryFilter('mustOrder') : undefined
                      }
                    >
                      {t('productInventory.kpis.secondaryMustOrder', {
                        count: secondaryMustOrderCount,
                      })}
                    </Badge>
                  )}
                  {secondaryOutOfStockCount > 0 && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="red"
                      radius="sm"
                      tt="lowercase"
                      style={secondaryFilterEnabled ? { cursor: 'pointer' } : undefined}
                      onClick={
                        secondaryFilterEnabled ? () => setSecondaryFilter('outOfStock') : undefined
                      }
                    >
                      {t('productInventory.kpis.secondaryOutOfStock', {
                        count: secondaryOutOfStockCount,
                      })}
                    </Badge>
                  )}
                </>
              ) : null}
              {shouldDisplayHeaderBadges ? (
                <>
                  {outOfStockCount > 0 && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="gray"
                      radius="sm"
                      tt="lowercase"
                      onClick={() => setStockFilter('outOfStock')}
                      style={{ cursor: 'pointer' }}
                    >
                      {t('productInventory.kpis.outOfStock', { count: outOfStockCount })}
                    </Badge>
                  )}
                  {lowCount > 0 && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="orange"
                      radius="sm"
                      tt="lowercase"
                      onClick={() => setStockFilter('lowStock')}
                      style={{ cursor: 'pointer' }}
                    >
                      {t('productInventory.kpis.lowStock', { count: lowCount })}
                    </Badge>
                  )}
                  {negativeCount > 0 && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="red"
                      radius="sm"
                      tt="lowercase"
                      onClick={() => setStockFilter('negative')}
                      style={{ cursor: 'pointer' }}
                    >
                      {t('productInventory.kpis.negative', { count: negativeCount })}
                    </Badge>
                  )}
                </>
              ) : null}
            </Group>
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={handleForceRefresh}
          extraActions={
            !isMobile && (
              <Group gap="xs" wrap="nowrap">
                {showBeginOfPeriod && (
                  <Button
                    variant="light"
                    color="teal"
                    size="sm"
                    leftSection={<IconCalendar size={14} />}
                    onClick={openBeginOfPeriod}
                  >
                    {t('productInventory.beginOfPeriod.buttonLabel')}
                  </Button>
                )}
                {showSetOpsButtons && (
                  <>
                    {showComposeButton && (
                      <Button
                        variant="light"
                        color={PRODUCT_SET_COLOR}
                        size="sm"
                        leftSection={<IconBoxMultiple size={14} />}
                        onClick={openCompose}
                      >
                        {t('productInventory.composeSet.openButton')}
                      </Button>
                    )}
                    <Button
                      variant="light"
                      color="orange"
                      size="sm"
                      leftSection={<IconBoxMultiple size={14} />}
                      onClick={openDecompose}
                    >
                      {t('productInventory.decomposeSet.openButton')}
                    </Button>
                  </>
                )}
                <InventoryImportExportActions
                  entityType="product"
                  rows={allRows}
                  items={products}
                  unitLabels={unitLabels}
                  canExport={true}
                  canImport={canBulkImport}
                  onAfterImport={forceRefresh}
                />
              </Group>
            )
          }
        />
        {showSetOpsButtons && (
          <>
            {showComposeButton && (
              <ProductInventoryComposeSetModal
                opened={composeOpen}
                onClose={closeCompose}
                products={products}
                rows={allRows}
                locations={locations}
              />
            )}
            <ProductInventoryDecomposeSetModal
              opened={decomposeOpen}
              onClose={closeDecompose}
              products={products}
              rows={allRows}
              locations={locations}
            />
          </>
        )}
        {showBeginOfPeriod && (
          <ProductInventoryBeginOfPeriodModal
            opened={beginOfPeriodOpen}
            onClose={closeBeginOfPeriod}
            rows={allRows}
          />
        )}
        {variant.showOutgoingDetailModal && (
          <ProductInventoryOutgoingModal
            opened={outgoingFor !== null}
            onClose={() => setOutgoingFor(null)}
            product={outgoingFor?.product ?? null}
            reservations={outgoingReservations}
            orderStatus={orderStatus}
          />
        )}

        {isMobile && mobileQuickChips.length > 0 && <QuickFilterChips chips={mobileQuickChips} />}

        {isMobile ? (
          <MobileFilterBar
            recordCount={summaries.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.inventory.products.list.searchPlaceholder')}
            hideStatus
            filters={mobileFilters}
            onClear={clearFilters}
            labelChips
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.inventory.products.list.searchPlaceholder')}
            hideStatus
            filters={desktopFilters}
            onClear={clearFilters}

            hasActiveFilters={
              !!search ||
              desktopFilters.some((f) => f.value !== null) ||
              columnFilters.hasActiveFilters
            }
          />
        )}
      </StickyListChrome>

      {isMobile ? (
        <ProductInventoryCardList
          summaries={paginated}
          locations={locations}
          isLoading={loadingInitial}
          onRowClick={handleRowClick}
          inboundIndex={inboundIndex}
        />
      ) : (
        <ProductInventoryDataTable
          summaries={paginated}
          locations={locations}
          isLoading={loadingInitial}
          onRowClick={handleRowClick}
          inboundIndex={inboundIndex}
          resolveCustomerName={resolveCustomerName}
          orderStatus={orderStatus}
          onOutgoingClick={variant.showOutgoingDetailModal ? setOutgoingFor : undefined}
          viewportRef={scrollViewportRef}
          getColumnFilter={variant.showColumnHeaderFilters ? columnFilters.filterFor : undefined}
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
