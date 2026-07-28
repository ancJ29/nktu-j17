import { Badge, Group, Stack, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBox } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { ListPagination } from '@/components/custom/ListPagination';
import { device } from '@credo/base-ui/utils';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { perms } from '@/utils/permission';
import { hasMaterialMinimumStock, isMaterialLowStock } from '@/utils/materialConfig';
import type { MaterialInventoryRow } from '@/types';

import { MaterialInventoryCardList } from './MaterialInventoryCardList';
import { MaterialInventoryDataTable } from './MaterialInventoryDataTable';
import { MaterialInventoryFormModal } from './MaterialInventoryFormModal';
import { MaterialInventoryUpdateModal } from './MaterialInventoryUpdateModal';

const isMobile = device.isMobile;
const canCreate = perms.materialInventory.canCreate();
const canDelete = perms.materialInventory.canDelete();

const minStockEnabled = hasMaterialMinimumStock();

type Filters = { search: string; stock: string | null; page: number };
const FILTER_DEFAULTS: Filters = { search: '', stock: null, page: 1 };

const STATUS_LABELS = { all: '', active: '', inactive: '' };

export function MaterialInventoryListPage() {
  const { t } = useTranslation();

  const {
    items: rows,
    loading,
    initialized,
    error,
    cachedAt,
    loadAll,
    forceRefresh,
  } = useMaterialInventoryStore();

  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);

  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [updateOpened, { open: openUpdate, close: closeUpdate }] = useDisclosure(false);
  const [selectedRow, setSelectedRow] = useState<MaterialInventoryRow | null>(null);

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters('cmngt:material-inventory-list-filters', FILTER_DEFAULTS);
  const stockFilter = filterState.stock;
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const setStockFilter = useCallback(
    (v: string | null) => updateState({ stock: v }),
    [updateState],
  );
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);

  const { names, existingCodes, minByCode } = useMemo(() => {
    const names = new Map<string, string>();
    const minByCode = new Map<string, number | undefined>();
    for (const m of materials) {
      names.set(m.code, m.name);
      minByCode.set(m.code, m.extra?.minimumStock);
    }
    const existingCodes = new Set(rows.map((r) => r.itemCode));
    return { names, existingCodes, minByCode };
  }, [materials, rows]);

  const availableMaterials = useMemo(
    () => materials.filter((m) => !m.extra?.isDeleted && !existingCodes.has(m.code)),
    [materials, existingCodes],
  );

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(rows, {
      filters: { stock: stockFilter },
      filterFn: (item, f) => {
        if (item.extra?.isDeleted) return false;
        if (f.stock === 'inStock' && item.onHand <= 0) return false;
        if (f.stock === 'outOfStock' && item.onHand > 0) return false;
        if (
          f.stock === 'lowStock' &&
          !isMaterialLowStock(minByCode.get(item.itemCode), item.onHand)
        )
          return false;
        return true;
      },
      searchFields: (item) => [names.get(item.itemCode) ?? '', item.itemCode],
      search: filterState.search,
      onSearchChange,
      page: filterState.page,
      onPageChange,
    });

  const { trackedCount, negativeCount, lowStockCount, lowStockCodes } = useMemo(() => {
    let tracked = 0;
    let negative = 0;
    let low = 0;
    const lowCodes = new Set<string>();
    for (const r of rows) {
      if (r.extra?.isDeleted) continue;
      tracked++;
      if (r.onHand < 0) negative++;
      if (minStockEnabled && isMaterialLowStock(minByCode.get(r.itemCode), r.onHand)) {
        low++;
        lowCodes.add(r.itemCode);
      }
    }
    return {
      trackedCount: tracked,
      negativeCount: negative,
      lowStockCount: low,
      lowStockCodes: lowCodes,
    };
  }, [rows, minByCode]);

  const stockOptions = useMemo(
    () => [
      { value: 'inStock', label: t('materials.filterStockInStock') },
      { value: 'outOfStock', label: t('materials.filterStockOutOfStock') },
      ...(minStockEnabled
        ? [{ value: 'lowStock', label: t('materials.filterStockLowStock') }]
        : []),
    ],
    [t],
  );

  const desktopFilters: SelectFilter[] = useMemo(
    () => [
      {
        value: stockFilter,
        onChange: setStockFilter,
        data: stockOptions,
        placeholder: t('materials.filterStockAll'),
        searchable: false,
        w: 180,
      },
    ],
    [stockFilter, setStockFilter, stockOptions, t],
  );

  const mobileFilters: MobileFilterDef[] = useMemo(
    () => [
      {
        title: t('materials.filterStockTitle'),
        value: stockFilter ?? 'all',
        options: [{ value: 'all', label: t('materials.filterStockAll') }, ...stockOptions],
        onChange: (v: string) => setStockFilter(v === 'all' ? null : v),
      },
    ],
    [stockFilter, setStockFilter, stockOptions, t],
  );

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);

  useEffect(() => {
    if (!materialsInitialized) loadMaterials();
  }, [materialsInitialized, loadMaterials]);

  useEffect(() => {
    if (error) {
      notifications.show({
        color: 'red',
        title: t('materialInventory.notifications.fetchError'),
        message: '',
      });
    }
  }, [error, t]);

  const handleRowClick = useCallback(
    (row: MaterialInventoryRow) => {
      setSelectedRow(row);
      openUpdate();
    },
    [openUpdate],
  );

  const handleForceRefresh = useCallback(() => forceRefresh(), [forceRefresh]);

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        <StickyListChrome>
          <ListPageHeader
            title={t('materialInventory.title')}
            icon={
              <ThemeIcon size={38} radius="md" variant="light" color="primary">
                <IconBox size={20} stroke={1.75} />
              </ThemeIcon>
            }
            subtitle={
              initialized && rows.length > 0 ? (
                <Group gap={6} wrap="nowrap">
                  <Badge size="xs" variant="light" color="teal" radius="sm" tt="lowercase">
                    {t('materials.summary.tracked', { count: trackedCount })}
                  </Badge>
                  {minStockEnabled && lowStockCount > 0 && (
                    <Badge size="xs" variant="light" color="orange" radius="sm" tt="lowercase">
                      {t('materials.summary.lowStock', { count: lowStockCount })}
                    </Badge>
                  )}
                  {negativeCount > 0 && (
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
              onClick: openAdd,
              label: t('materialInventory.modal.createTitle'),
              enabled: canCreate,
            }}
          />

          {isMobile ? (
            <MobileFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('materialInventory.form.materialPlaceholder')}
              hideStatus
              statusLabels={STATUS_LABELS}
              filters={mobileFilters}
              onClear={clearFilters}
            />
          ) : (
            <DesktopFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('materialInventory.form.materialPlaceholder')}
              hideStatus
              statusLabels={STATUS_LABELS}
              filters={desktopFilters}
              onClear={clearFilters}
            />
          )}
        </StickyListChrome>

        {isMobile ? (
          <MaterialInventoryCardList
            rows={paginated}
            names={names}
            lowStockCodes={lowStockCodes}
            isLoading={loading && !initialized}
            onRowClick={handleRowClick}
          />
        ) : (
          <MaterialInventoryDataTable
            rows={paginated}
            names={names}
            lowStockCodes={lowStockCodes}
            isLoading={loading && !initialized}
            onRowClick={handleRowClick}
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

      <MaterialInventoryFormModal
        opened={addOpened}
        onClose={closeAdd}
        available={availableMaterials}
      />
      <MaterialInventoryUpdateModal
        opened={updateOpened}
        onClose={closeUpdate}
        row={selectedRow}
        material={
          selectedRow ? (materials.find((m) => m.code === selectedRow.itemCode) ?? null) : null
        }
        materialName={selectedRow ? (names.get(selectedRow.itemCode) ?? selectedRow.itemCode) : ''}
        canDelete={canDelete}
      />
    </>
  );
}
