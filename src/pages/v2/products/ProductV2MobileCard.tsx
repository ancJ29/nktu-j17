/**
 * One product as a phone card — the register's `spec.mobile.Card`.
 *
 * **What it shows is what an operator can act on without opening anything**:
 * what it is, whether it is being sold, and where its stock stands. Price is
 * here on the same rule the desktop column follows, and everything else the
 * detail page holds is one tap away.
 */

import { Group, Stack, Text } from '@mantine/core';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { useTranslation } from 'react-i18next';
import { ActiveBadge } from '@/components/badges';
import { RecordThumb } from '@/components/RecordThumb';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import type { ProductV2Row } from '@/types';
import { formatNumber } from '@/utils/number';
import { MobileStockLine } from '../master-data/MobileStockLine';
import { useInventoryV2 } from '../master-data/useInventoryV2';
import {
  canSeePrice,
  PRODUCT_CATEGORY_CATEGORY,
  PRODUCT_UNIT_CATEGORY,
  showInventory,
  showPhotos,
} from './productV2Form';

export function ProductV2MobileCard({ row }: { readonly row: ProductV2Row }) {
  const { t } = useTranslation();
  const categoryLabels = useLookupV2Labels(PRODUCT_CATEGORY_CATEGORY);
  const unitLabels = useLookupV2Labels(PRODUCT_UNIT_CATEGORY);
  // The same subscription the desktop columns make, so opening the list on a
  // phone fetches the stock register exactly as it does on a desktop.
  const { byItemId } = useInventoryV2(useProductInventoryV2Store, showInventory);

  const unit = row.unit ? lookupLabelOf(unitLabels, row.unit) : undefined;
  const category = row.extra?.category;

  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      {showPhotos && <RecordThumb url={row.extra?.images?.[0]?.url} alt={row.name} size={48} />}
      <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
          <Text fz="sm" fw={600} lineClamp={2}>
            {row.name}
          </Text>
          <ActiveBadge
            isActive={row.isActive}
            activeLabel={t('productsV2.status.active')}
            inactiveLabel={t('productsV2.status.inactive')}
            size="sm"
          />
        </Group>

        {/* No unit chip of its own — the figure below carries it, which is the
            reading it belongs to and the call the desktop list already made. */}
        <Group gap="xs" wrap="wrap">
          <CodeLabel code={row.code} size="sm" fw={600} />
          {category ? (
            <ColorBadge label={lookupLabelOf(categoryLabels, category)} size="sm" />
          ) : null}
        </Group>

        {/* The bottom line is the reading the card exists for: stock on the
            left where the eye lands, price trailing it. */}
        <Group justify="space-between" wrap="nowrap" align="flex-end" gap="xs">
          {showInventory ? (
            <MobileStockLine
              stock={byItemId.get(row.id)}
              min={row.extra?.minimumInventory?.value}
              alertsOff={row.extra?.ignoreStockAlert === true}
              unit={unit}
            />
          ) : (
            <span />
          )}
          {canSeePrice && row.price !== undefined ? (
            <Text size="sm" fw={600}>
              {formatNumber(row.price)}
            </Text>
          ) : null}
        </Group>
      </Stack>
    </Group>
  );
}
