import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectFilter } from '@/components/DesktopFilterBar';
import type { QuickFilterChip } from '@/components/QuickFilterChips';
import { useLookupV2Options } from '@/hooks/useLookupV2Options';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import type { InventorySecondaryStatus } from '@/types/inventoryStatus';
import type { ProductV2Row } from '@/types';
import { stockLevelOf } from '../master-data/stockLevel';
import { useInventoryV2 } from '../master-data/useInventoryV2';
import { PRODUCT_CATEGORY_CATEGORY, showInventory } from './productV2Form';

const CATEGORY_KEY = 'category';
const STOCK_KEY = 'stock';

const ALERT_LEVELS = [
  { level: 'outOfStock', labelKey: 'common.secondaryStatus.outOfStock', color: 'red' },
  { level: 'mustOrder', labelKey: 'common.secondaryStatus.mustOrder', color: 'orange' },
] as const;

export function useProductV2ListFilters(
  rows: readonly ProductV2Row[],
  values: Readonly<Record<string, string>>,
  setValue: (key: string, value: string | null) => void,
): {
  filters: SelectFilter[];
  chips: QuickFilterChip[];
  predicate: (row: ProductV2Row) => boolean;
} {
  const { t } = useTranslation();
  const categoryOptions = useLookupV2Options(PRODUCT_CATEGORY_CATEGORY);
  const { byItemId } = useInventoryV2(useProductInventoryV2Store, showInventory);

  const category = values[CATEGORY_KEY] ?? null;
  const stockStatus = values[STOCK_KEY] ?? null;

  const levelOf = useCallback(
    (row: ProductV2Row): InventorySecondaryStatus =>
      stockLevelOf({
        stock: byItemId.get(row.id),
        min: row.extra?.minimumInventory?.value,
        alertsOff: row.extra?.ignoreStockAlert === true,
      }),
    [byItemId],
  );

  const filters = useMemo<SelectFilter[]>(
    () => [
      ...(categoryOptions.length > 0
        ? [
            {
              value: category,
              onChange: (v: string | null) => setValue(CATEGORY_KEY, v),
              data: categoryOptions,
              placeholder: t('productsV2.filters.categoryAll'),
              title: t('productsV2.form.category'),
              searchable: true,
              w: 200,
            },
          ]
        : []),

      ...(showInventory
        ? [
            {
              value: stockStatus,
              onChange: (v: string | null) => setValue(STOCK_KEY, v),
              data: [
                { value: 'outOfStock', label: t('common.secondaryStatus.outOfStock') },
                { value: 'mustOrder', label: t('common.secondaryStatus.mustOrder') },
                { value: 'ok', label: t('common.secondaryStatus.ok') },
              ],
              placeholder: t('productsV2.filters.inventoryStatusAll'),
              title: t('productsV2.filters.inventoryStatus'),
              w: 190,
            },
          ]
        : []),
    ],
    [t, categoryOptions, category, stockStatus, setValue],
  );

  const counts = useMemo(() => {
    const tally = { outOfStock: 0, mustOrder: 0 };
    if (!showInventory) return tally;
    for (const row of rows) {
      if (!row.isActive) continue;
      const level = levelOf(row);
      if (level === 'outOfStock') tally.outOfStock += 1;
      else if (level === 'mustOrder') tally.mustOrder += 1;
    }
    return tally;
  }, [rows, levelOf]);

  const chips = useMemo<QuickFilterChip[]>(() => {
    if (!showInventory) return [];

    return ALERT_LEVELS.filter(
      ({ level }) => counts[level] > 0 || stockStatus === level,
    ).map<QuickFilterChip>(({ level, labelKey, color }) => ({
      key: level,
      label: `${t(labelKey)} (${counts[level]})`,
      color,
      active: stockStatus === level,
      onClick: () => setValue(STOCK_KEY, stockStatus === level ? null : level),
    }));
  }, [t, counts, stockStatus, setValue]);

  const predicate = useCallback(
    (row: ProductV2Row): boolean => {
      if (category !== null && (row.extra?.category ?? '') !== category) return false;
      if (stockStatus !== null && levelOf(row) !== stockStatus) return false;
      return true;
    },
    [category, stockStatus, levelOf],
  );

  return { filters, chips, predicate };
}
