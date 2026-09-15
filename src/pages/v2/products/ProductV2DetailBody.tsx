import { Grid, Group, Stack, Text } from '@mantine/core';
import { ColorBadge } from '@credo/base-ui/components';
import { IconInfoCircle, IconListDetails } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import { formatNumber } from '@/utils/number';
import type { ProductV2Row } from '@/types';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import { InventoryV2Section } from '../master-data/InventoryV2Section';
import { IncomingReceiptsCard } from '../master-data/IncomingReceiptsCard';
import { OutgoingOrdersCard } from '../master-data/OutgoingOrdersCard';
import { useInventoryV2 } from '../master-data/useInventoryV2';
import { ProductV2PhotoCard } from './ProductV2PhotoCard';
import {
  canManageInventory,
  canSeePrice,
  PRODUCT_CATEGORY_CATEGORY,
  PRODUCT_UNIT_CATEGORY,
  showInventory,
  showIncomingReceipts,
  showOutgoingOrders,
  showPhotos,
} from './productV2Form';

export function ProductV2DetailBody({ row }: { readonly row: ProductV2Row }) {
  const { t } = useTranslation();
  const categoryLabels = useLookupV2Labels(PRODUCT_CATEGORY_CATEGORY);
  const unitLabels = useLookupV2Labels(PRODUCT_UNIT_CATEGORY);
  const category = row.extra?.category;
  const attributes = row.extra?.attributes ?? [];

  return (
    <Stack gap="md">
      {/* No name or code rows — the header already says both, and the card
          repeating them verbatim made it the noisier copy. What lives here is
          what the header does not carry: classification, and the price. */}
      <SectionCard
        icon={<IconInfoCircle size={14} />}
        title={t('common.labels.basicInfo')}
        padding="md"
      >
        <Grid gutter="md">
          {category ? (
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DetailField label={t('productsV2.form.category')}>
                <ColorBadge label={lookupLabelOf(categoryLabels, category)} size="sm" />
              </DetailField>
            </Grid.Col>
          ) : null}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('productsV2.form.unit')}>
              {row.unit ? (
                <ColorBadge label={lookupLabelOf(unitLabels, row.unit)} size="sm" />
              ) : undefined}
            </DetailField>
          </Grid.Col>
          {/* A field, not the card it used to be: one number under a heading
              that repeated its own label. Absent for a viewer without the
              price permission — same claim the old card made by not existing. */}
          {canSeePrice && (
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DetailField label={t('productsV2.form.price')}>
                {row.price === undefined ? undefined : formatNumber(row.price)}
              </DetailField>
            </Grid.Col>
          )}
        </Grid>
      </SectionCard>

      {/* Absent rather than empty, like the price card was: a heading over no
          rows claims the operator forgot to fill them in. */}
      {attributes.length > 0 && (
        <SectionCard
          icon={<IconListDetails size={14} />}
          title={t('productsV2.form.attributes')}
          padding="md"
        >
          <Stack gap="xs">
            {attributes.map((attribute, index) => (
              <Group key={index} justify="space-between" gap="md" wrap="nowrap" align="flex-start">
                <Text size="sm" c="dimmed">
                  {attribute.key}
                </Text>
                <Text size="sm" fw={500} ta="right">
                  {attribute.value}
                </Text>
              </Group>
            ))}
          </Stack>
        </SectionCard>
      )}

      {showPhotos && <ProductV2PhotoCard row={row} />}
    </Stack>
  );
}

export function ProductV2DetailSide({ row }: { readonly row: ProductV2Row }) {
  const unitLabels = useLookupV2Labels(PRODUCT_UNIT_CATEGORY);
  const unit = row.unit ? lookupLabelOf(unitLabels, row.unit) : undefined;

  return (
    <Stack gap="md">
      {showInventory && (
        <InventoryV2Section
          row={row}
          useStore={useProductInventoryV2Store}
          canManage={canManageInventory}
          unit={unit}
          minStock={row.extra?.minimumInventory?.value}
          alertsOff={row.extra?.ignoreStockAlert === true}
        />
      )}

      {showIncomingReceipts && <IncomingReceipts rowId={row.id} unit={unit} />}
      {showOutgoingOrders && <OutgoingOrders rowId={row.id} unit={unit} />}
    </Stack>
  );
}

function IncomingReceipts({
  rowId,
  unit,
}: {
  readonly rowId: string;
  readonly unit?: string | undefined;
}) {
  const { byItemId } = useInventoryV2(useProductInventoryV2Store, true);
  return <IncomingReceiptsCard stock={byItemId.get(rowId)} unit={unit} />;
}

function OutgoingOrders({
  rowId,
  unit,
}: {
  readonly rowId: string;
  readonly unit?: string | undefined;
}) {
  const { byItemId } = useInventoryV2(useProductInventoryV2Store, true);
  return <OutgoingOrdersCard stock={byItemId.get(rowId)} unit={unit} />;
}
