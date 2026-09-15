/**
 * One material as a phone card — the register's `spec.mobile.Card`.
 *
 * The reading is stock, where the client counts it: the same subscription the
 * desktop column makes, so opening the list on a phone fetches the stock
 * register exactly as a desktop does.
 *
 * **The unit rides the figure, and stands alone only without one.** With stock
 * on, `MobileStockLine` names the unit beside the count it measures — the call
 * the desktop list made when it dropped its unit column. With stock off there
 * is no figure to carry it, and a material without its unit is half a record.
 */

import { Group, Stack, Text } from '@mantine/core';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { useTranslation } from 'react-i18next';
import { ActiveBadge } from '@/components/badges';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import { useMaterialInventoryV2Store } from '@/stores/useMaterialInventoryV2Store';
import type { MaterialV2Row } from '@/types';
import { MobileStockLine } from '../master-data/MobileStockLine';
import { useInventoryV2 } from '../master-data/useInventoryV2';
import {
  MATERIAL_CATEGORY_CATEGORY,
  MATERIAL_UNIT_CATEGORY,
  showInventory,
} from './materialV2Form';

export function MaterialV2MobileCard({ row }: { readonly row: MaterialV2Row }) {
  const { t } = useTranslation();
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_CATEGORY);
  const unitLabels = useLookupV2Labels(MATERIAL_UNIT_CATEGORY);
  const { byItemId } = useInventoryV2(useMaterialInventoryV2Store, showInventory);

  const category = row.extra?.category;
  // The primary unit — `extra.units[0]`, the one the form edits.
  const rawUnit = row.extra?.units?.[0];
  const unit = rawUnit ? lookupLabelOf(unitLabels, rawUnit) : undefined;

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
        <Text fz="sm" fw={600} lineClamp={2} style={{ flex: 1, minWidth: 0 }}>
          {row.name}
        </Text>
        <ActiveBadge
          isActive={row.isActive}
          activeLabel={t('__new__.01-common.labels.active')}
          inactiveLabel={t('__new__.01-common.labels.inactive')}
          size="sm"
        />
      </Group>

      <Group gap="xs" wrap="wrap">
        <CodeLabel code={row.code} size="sm" fw={600} />
        {category ? <ColorBadge label={lookupLabelOf(categoryLabels, category)} size="sm" /> : null}
        {!showInventory && unit ? (
          <Text size="xs" c="dimmed">
            {unit}
          </Text>
        ) : null}
      </Group>

      {showInventory ? <MobileStockLine stock={byItemId.get(row.id)} unit={unit} /> : null}
    </Stack>
  );
}
