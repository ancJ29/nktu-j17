import { Group, Stack, Text } from '@mantine/core';
import { CodeLabel, ColorBadge, type DataTableColumn } from '@credo/base-ui/components';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { lookupLabelOf, useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import { formatNumber } from '@/utils/number';
import type { ProductV2Row } from '@/types';
import type { MasterDataHeaderText } from '../master-data';
import { RecordThumb } from '@/components/RecordThumb';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import {
  incomingV2Column,
  inventoryV2Column,
  outgoingV2Column,
} from '../master-data/inventoryV2Column';
import { QuantityWithUnit } from '../master-data/QuantityWithUnit';
import { useInventoryV2 } from '../master-data/useInventoryV2';
import {
  canSeePrice,
  PRODUCT_CATEGORY_CATEGORY,
  PRODUCT_UNIT_CATEGORY,
  showInventory,
  showIncomingColumn,
  showPhotos,
} from './productV2Form';

export function useProductV2Columns(
  rows: readonly ProductV2Row[],
): Array<DataTableColumn<ProductV2Row>> {
  const { t } = useTranslation();
  const categoryOptions = useLookupV2Options(PRODUCT_CATEGORY_CATEGORY);
  const categoryLabels = useLookupV2Labels(PRODUCT_CATEGORY_CATEGORY);

  const unitLabels = useLookupV2Labels(PRODUCT_UNIT_CATEGORY);
  const showCategory = categoryOptions.length > 0 || rows.some((p) => Boolean(p.extra?.category));

  const showMinStock =
    showInventory && rows.some((p) => p.extra?.minimumInventory?.value !== undefined);
  const { byItemId } = useInventoryV2(useProductInventoryV2Store, showInventory);

  const unitOf = useCallback(
    (p: ProductV2Row) => (p.unit ? lookupLabelOf(unitLabels, p.unit) : undefined),
    [unitLabels],
  );

  return useMemo(
    () => [
      {
        key: 'product',
        width: '280px',
        header: t('common.labels.product'),
        render: (p: ProductV2Row) => {
          const named = (
            <Stack gap={2}>
              <Text fz="md" fw={500}>
                {p.name}
              </Text>
              <CodeLabel code={p.code} size="sm" fw={600} />
            </Stack>
          );

          if (!showPhotos) return named;
          return (
            <Group gap="sm" wrap="nowrap">
              <RecordThumb url={p.extra?.images?.[0]?.url} alt={p.name} size={40} />
              {named}
            </Group>
          );
        },
      },
      ...(showCategory
        ? [
            {
              key: 'category',
              width: '160px',
              header: t('productsV2.form.category'),

              render: (item: ProductV2Row) => (
                <ColorBadge label={lookupLabelOf(categoryLabels, item.extra?.category)} size="sm" />
              ),
            },
          ]
        : []),

      ...(canSeePrice
        ? [
            {
              key: 'price',
              width: '140px',
              ta: 'right' as const,
              header: t('productsV2.form.price'),
              render: (item: ProductV2Row) => (
                <Text size="sm" fw={600} ta="right">
                  {formatNumber(item.price)}
                </Text>
              ),
            },
          ]
        : []),
      ...(showInventory
        ? [
            inventoryV2Column<ProductV2Row>({
              byItemId,
              header: t('inventoryV2.columnHeader'),
              forecastLabel: t('inventoryV2.forecastTooltip'),
              minOf: (p) => p.extra?.minimumInventory?.value,
              alertsOffOf: (p) => p.extra?.ignoreStockAlert === true,

              alertsOffTooltip: t('productsV2.form.ignoreStockAlertHelp'),
              unitOf,
            }),
          ]
        : []),
      ...(showMinStock
        ? [
            {
              key: 'minStock',
              width: '120px',
              ta: 'right' as const,
              header: t('productsV2.columns.minStock'),

              render: (item: ProductV2Row) => {
                const min = item.extra?.minimumInventory?.value;
                if (min === undefined) {
                  return (
                    <Text size="sm" ta="right" c="dimmed">
                      —
                    </Text>
                  );
                }

                return (
                  <QuantityWithUnit
                    value={formatNumber(min)}
                    unit={unitOf(item)}
                    color={item.extra?.ignoreStockAlert === true ? 'dimmed' : undefined}
                  />
                );
              },
            },
          ]
        : []),
      ...(showIncomingColumn
        ? [incomingV2Column<ProductV2Row>({ byItemId, header: t('inventoryV2.incoming'), unitOf })]
        : []),

      ...(showInventory && [...byItemId.values()].some((r) => (r.outgoing ?? 0) > 0)
        ? [outgoingV2Column<ProductV2Row>({ byItemId, header: t('inventoryV2.outgoing'), unitOf })]
        : []),
    ],
    [t, showCategory, showMinStock, categoryLabels, byItemId, unitOf],
  );
}

export function useProductV2HeaderText(): MasterDataHeaderText {
  return {};
}
