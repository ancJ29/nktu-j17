import { ColorBadge, type DataTableColumn } from '@credo/base-ui/components';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { lookupLabelOf, useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { MaterialV2Row } from '@/types';
import type { MasterDataHeaderText } from '../master-data';
import { useMaterialInventoryV2Store } from '@/stores/useMaterialInventoryV2Store';
import { inventoryV2Column } from '../master-data/inventoryV2Column';
import { useInventoryV2 } from '../master-data/useInventoryV2';
import {
  MATERIAL_CATEGORY_CATEGORY,
  MATERIAL_UNIT_CATEGORY,
  showInventory,
} from './materialV2Form';

export function useMaterialV2Columns(
  rows: readonly MaterialV2Row[],
): Array<DataTableColumn<MaterialV2Row>> {
  const { t } = useTranslation();
  const categoryOptions = useLookupV2Options(MATERIAL_CATEGORY_CATEGORY);
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_CATEGORY);
  const unitLabels = useLookupV2Labels(MATERIAL_UNIT_CATEGORY);
  const showCategory = categoryOptions.length > 0 || rows.some((m) => Boolean(m.extra?.category));
  const { byItemId } = useInventoryV2(useMaterialInventoryV2Store, showInventory);

  return useMemo(
    () => [
      ...(showCategory
        ? [
            {
              key: 'category',
              width: '160px',
              header: t('materialsV2.form.category'),

              render: (item: MaterialV2Row) => (
                <ColorBadge label={lookupLabelOf(categoryLabels, item.extra?.category)} size="sm" />
              ),
            },
          ]
        : []),
      ...(showInventory
        ? [
            inventoryV2Column<MaterialV2Row>({
              byItemId,
              header: t('inventoryV2.columnHeader'),
              forecastLabel: t('inventoryV2.forecastTooltip'),

              unitOf: (m) =>
                m.extra?.units?.[0] ? lookupLabelOf(unitLabels, m.extra.units[0]) : undefined,
            }),
          ]
        : []),
    ],
    [t, showCategory, categoryLabels, unitLabels, byItemId],
  );
}

export function useMaterialV2HeaderText(row: MaterialV2Row): MasterDataHeaderText {
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_CATEGORY);
  const unitLabels = useLookupV2Labels(MATERIAL_UNIT_CATEGORY);
  const category = row.extra?.category;
  const unit = row.extra?.units?.[0];
  return {
    secondary: unit ? lookupLabelOf(unitLabels, unit) : undefined,
    tag: category ? lookupLabelOf(categoryLabels, category) : undefined,
  };
}
