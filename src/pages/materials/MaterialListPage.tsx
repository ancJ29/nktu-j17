import { Badge, Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBox, IconChecklist, IconPackageExport, IconPackageImport } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useSelectionMode } from '@/hooks/useRowSelection';
import { useLookupV2Options } from '@/hooks';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { allOptionFilter } from '@/components/mobileFilterDefs';
import { perms } from '@/utils/permission';
import { featureFlags } from '@/utils/features';
import {
  hasMaterialMinimumStock,
  isMaterialLowStock,
  MATERIAL_CATEGORY_LOOKUP,
} from '@/utils/materialConfig';
import type { Material, MaterialInventoryRow } from '@/types';

import { MaterialCardList } from './MaterialCardList';
import { MaterialDataTable } from './MaterialDataTable';

const isMobile = device.isMobile;
const canCreate = perms.material.canCreate();

const canManageInventory = perms.material.canManageInventory();

const lowStockEnabled = canManageInventory && hasMaterialMinimumStock();

const canQuickCreateReceipt =
  featureFlags.warehouseReceipts.enabled && perms.warehouseReceipt.canCreate();
const canQuickCreateDeliveryNote =
  featureFlags.warehouseDeliveryNotes.enabled && perms.warehouseDeliveryNote.canCreate();
const quickCreateEnabled = !isMobile && (canQuickCreateReceipt || canQuickCreateDeliveryNote);

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
  const navigate = useNavigate();

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

  const selection = useSelectionMode();
  const { selectionMode, selectedKeys, count: selectedCount, toggle: toggleRow } = selection;

  const pageCodes = useMemo(() => paginated.map((m) => m.code), [paginated]);
  const { allSelected: allPageSelected, someSelected: somePageSelected } =
    selection.headerState(pageCodes);
  const toggleAllOnPage = useCallback(
    () => selection.toggleAllIn(pageCodes),
    [selection, pageCodes],
  );

  const startWarehouseDoc = useCallback(
    (route: string, codes: string[]) => {
      if (codes.length === 0) return;
      navigate(route, { state: { seedMaterialCodes: codes } });
    },
    [navigate],
  );
  const createReceiptFor = useCallback(
    (material: Material) => startWarehouseDoc(ROUTES.WAREHOUSE_RECEIPTS.NEW, [material.code]),
    [startWarehouseDoc],
  );
  const createDeliveryNoteFor = useCallback(
    (material: Material) => startWarehouseDoc(ROUTES.WAREHOUSE_DELIVERY_NOTES.NEW, [material.code]),
    [startWarehouseDoc],
  );

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
      ...(canManageInventory
        ? [
            allOptionFilter({
              title: t('materials.filterStockTitle'),
              value: stockFilter,
              options: stockOptions,
              onChange: setStockFilter,
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
                    {inactiveCount} {t('__new__.01-common.labels.inactive')}
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
          extraActions={
            quickCreateEnabled ? (
              <Button
                variant={selectionMode ? 'filled' : 'default'}
                size="sm"
                leftSection={<IconChecklist size={16} />}
                onClick={selection.toggleSelectionMode}
              >
                {selectionMode
                  ? t('__new__.01-common.actions.cancel')
                  : t('warehouseDoc.fromMaterials.enterSelection')}
              </Button>
            ) : undefined
          }
          createCta={{
            to: ROUTES.MATERIALS.NEW,
            label: t('materials.addItem'),
            enabled: canCreate,
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            recordCount={allMaterials.length}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('__new__.07-entities.materials.list.searchPlaceholder')}
            status={filter}
            onStatusChange={setFilter}
            statusTitle={t('__new__.01-common.labels.status')}
            statusLabels={{
              all: t('__new__.01-common.filters.all'),
              active: t('materials.filterActive'),
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            filters={mobileFilters.length > 0 ? mobileFilters : undefined}
            onClear={clearFilters}

            labelChips
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
              inactive: t('__new__.01-common.labels.inactive'),
            }}
            filters={desktopFilters.length > 0 ? desktopFilters : undefined}
            onClear={clearFilters}
          />
        )}
      </StickyListChrome>

      {/* Present for the whole mode, not just once something is ticked — the
          bar is what tells the operator the mode is on and how to leave it, so
          it has to be there before the first tick. Buttons disable at zero. */}
      {selectionMode && (
        <Paper withBorder radius="md" p="xs" bg="var(--mantine-color-primary-light)">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={600}>
              {selectedCount > 0
                ? t('warehouseDoc.fromMaterials.selected', { count: selectedCount })
                : t('warehouseDoc.fromMaterials.selectPrompt')}
            </Text>
            <Group gap="xs" wrap="nowrap">
              {canQuickCreateReceipt && (
                <Button
                  size="compact-sm"
                  disabled={selectedCount === 0}
                  leftSection={<IconPackageImport size={16} />}
                  onClick={() =>
                    startWarehouseDoc(ROUTES.WAREHOUSE_RECEIPTS.NEW, [...selectedKeys])
                  }
                >
                  {t('warehouseDoc.fromMaterials.createReceipt')}
                </Button>
              )}
              {canQuickCreateDeliveryNote && (
                <Button
                  size="compact-sm"
                  variant="light"
                  disabled={selectedCount === 0}
                  leftSection={<IconPackageExport size={16} />}
                  onClick={() =>
                    startWarehouseDoc(ROUTES.WAREHOUSE_DELIVERY_NOTES.NEW, [...selectedKeys])
                  }
                >
                  {t('warehouseDoc.fromMaterials.createDeliveryNote')}
                </Button>
              )}
              <Button
                size="compact-sm"
                variant="subtle"
                color="gray"
                onClick={selection.exitSelectionMode}
              >
                {t('__new__.01-common.actions.cancel')}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

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
          selectionMode={selectionMode}
          isSelected={selection.isSelected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAllOnPage}
          allSelected={allPageSelected}
          someSelected={somePageSelected}
          {...(canQuickCreateReceipt && { onCreateReceipt: createReceiptFor })}
          {...(canQuickCreateDeliveryNote && { onCreateDeliveryNote: createDeliveryNoteFor })}
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
