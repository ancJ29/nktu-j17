import { Badge, Button, Card, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import {
  IconAlertTriangle,
  IconBuildingWarehouse,
  IconPackage,
  IconPlus,
  IconTruckLoading,
} from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryRowCard } from '@/components/inventory/InventoryRowCard';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import type { Product } from '@/types';
import { useOpenInboundForProduct } from '@/hooks';

import { useInventorySection } from '@/hooks/useInventorySection';
import { ProductInventoryFormModal } from '../product-inventory/ProductInventoryFormModal';
import { ProductInventoryUpdateModal } from '../product-inventory/ProductInventoryUpdateModal';
import { isLocationsEnabled, perms } from '@/utils/permission';
import { isNoInventoryProduct } from '@/utils/productSet';

const canEditInventory = perms.productInventory.canEdit();
const canCreateInventory = perms.productInventory.canCreate();
const canViewGoodsReceipts = perms.goodsReceipt.canView();
const locationsEnabled = isLocationsEnabled();
const MAX_DRAFT_CODES_IN_TOOLTIP = 5;

type Props = {
  readonly product: Product;
  
  readonly createOpened?: boolean;
  readonly onOpenCreate?: () => void;
  readonly onCloseCreate?: () => void;
};

export function ProductInventorySection({
  product,
  createOpened: controlledOpened,
  onOpenCreate,
  onCloseCreate,
}: Props) {
  const { t } = useTranslation();

  const inventoryStore = useProductInventoryStore();
  const section = useInventorySection({ entity: product, store: inventoryStore });
  const {
    rows,
    allRows,
    totalOnHand,
    baseUnit,
    baseUnitLabel,
    hasMultipleUnits,
    unitLabels,
    locationByCode,
    forceRefresh,
    isReady,
    update,
    create,
  } = section;

  
  const goodsReceiptsInitialized = useGoodsReceiptStore((s) => s.initialized);
  const loadGoodsReceipts = useGoodsReceiptStore((s) => s.loadAll);
  const inboundEntry = useOpenInboundForProduct(product.code);

  useEffect(() => {
    if (!canViewGoodsReceipts) return;
    if (!goodsReceiptsInitialized) loadGoodsReceipts();
  }, [goodsReceiptsInitialized, loadGoodsReceipts]);

  
  
  
  
  const isCreateControlled = controlledOpened !== undefined;
  const createOpened = isCreateControlled ? controlledOpened : create.opened;
  const openCreate = isCreateControlled ? (onOpenCreate ?? create.open) : create.open;
  const closeCreate = isCreateControlled ? (onCloseCreate ?? create.close) : create.close;

  
  const noInventory = isNoInventoryProduct(product);
  
  
  const canShowAddButton = canCreateInventory && !noInventory && rows.length === 0;
  const canShowAddMoreRowButton = canCreateInventory && !noInventory && locationsEnabled;

  
  const minInv = product.extra?.minimumInventory?.value;

  
  const rowOnClickHandlers = useMemo(() => {
    if (!canEditInventory) return new Map<string, () => void>();
    const m = new Map<string, () => void>();
    for (const row of rows) m.set(row.id, () => update.open(row));
    return m;
  }, [rows, update]);

  if (!isReady) return null;

  return (
    <>
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={28} radius="md" variant="light" color="teal">
                <IconBuildingWarehouse size={16} stroke={1.75} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="sm" fw={600}>
                  {t('products.detail.inventoryTab.title')}
                </Text>
                {rows.length > 0 && (
                  <Group gap={6}>
                    <Text size="xs" fw={600} c="dimmed">
                      {t('products.detail.inventoryTab.totalOnHand', {
                        count: totalOnHand,
                        unit: baseUnitLabel,
                      })}
                    </Text>
                    {locationsEnabled && (
                      <>
                        <Text size="xs" c="dimmed">
                          ·
                        </Text>
                        <Text size="xs" c="dimmed">
                          {t('common.detail.inventoryTab.locationCount', { count: rows.length })}
                        </Text>
                      </>
                    )}
                  </Group>
                )}
                {inboundEntry && inboundEntry.totalBase > 0 && (
                  <Tooltip
                    label={
                      <Stack gap={2}>
                        <Text size="xs" fw={600}>
                          {t('productInventory.inbound.fromDrafts', {
                            count: inboundEntry.draftCount,
                          })}
                        </Text>
                        {inboundEntry.draftRefs.length > 0 && (
                          <Text size="xs">
                            {inboundEntry.draftRefs
                              .slice(0, MAX_DRAFT_CODES_IN_TOOLTIP)
                              .map((r) => r.receiptNumber)
                              .join(', ')}
                            {inboundEntry.draftRefs.length > MAX_DRAFT_CODES_IN_TOOLTIP
                              ? ` ${t('productInventory.inbound.moreDrafts', {
                                  count: inboundEntry.draftRefs.length - MAX_DRAFT_CODES_IN_TOOLTIP,
                                })}`
                              : ''}
                          </Text>
                        )}
                        {inboundEntry.unmappedCount > 0 && (
                          <Text size="xs" c="orange">
                            {t('productInventory.inbound.unmappedWarning', {
                              count: inboundEntry.unmappedCount,
                            })}
                          </Text>
                        )}
                      </Stack>
                    }
                    withArrow
                    multiline
                    maw={280}
                  >
                    <Group gap={6} wrap="nowrap">
                      <IconTruckLoading size={12} color="var(--mantine-color-teal-6)" aria-hidden />
                      <Text size="xs" fw={600} c="teal">
                        {t('productInventory.inbound.detailLabel')}:{' '}
                        {inboundEntry.totalBase.toLocaleString()} {baseUnitLabel}
                      </Text>
                      {inboundEntry.unmappedCount > 0 && (
                        <IconAlertTriangle size={12} color="var(--mantine-color-orange-6)" />
                      )}
                    </Group>
                  </Tooltip>
                )}
              </Stack>
            </Group>
            {canShowAddMoreRowButton && (
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconPlus size={14} />}
                onClick={openCreate}
              >
                {t('__new__.01-common.actions.addEntry')}
              </Button>
            )}
          </Group>

          {noInventory && (
            <Group gap={6} wrap="nowrap" align="center">
              <IconAlertTriangle size={14} color="var(--mantine-color-gray-6)" />
              <Text size="xs" c="dimmed">
                {t('products.detail.inventoryTab.noInventoryNote')}
              </Text>
            </Group>
          )}

          {/* Rows */}
          {rows.length === 0 ? (
            <Stack align="center" gap="sm" py="md">
              <ThemeIcon size={40} radius="xl" variant="light" color="gray">
                <IconPackage size={20} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {t('products.detail.inventoryTab.empty')}
              </Text>
              {canShowAddButton && (
                <Button
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={openCreate}
                >
                  {t('common.detail.inventoryTab.addFirst')}
                </Button>
              )}
            </Stack>
          ) : (
            <Stack gap="xs">
              {rows.map((row) => {
                const isLow = typeof minInv === 'number' && row.onHand > 0 && row.onHand <= minInv;
                const isNegative = row.onHand < 0;
                const onHandColor = isNegative ? 'red' : isLow ? 'orange' : undefined;
                return (
                  <InventoryRowCard
                    key={row.id}
                    locationCode={row.locationCode}
                    onHand={row.onHand}
                    baseUnit={baseUnit}
                    baseUnitLabel={baseUnitLabel}
                    unitLabels={unitLabels}
                    locationsEnabled={locationsEnabled}
                    locationName={locationByCode.get(row.locationCode)?.name}
                    onHandByUnit={row.extra?.onHandByUnit}
                    showBreakdown={hasMultipleUnits}
                    clickable={canEditInventory}
                    onClick={rowOnClickHandlers.get(row.id)}
                    caption={
                      typeof row.extra?.lastNote === 'string' ? row.extra.lastNote : undefined
                    }
                    onHandColor={onHandColor}
                    negativeStateLabel={t('productInventory.stockState.negative')}
                    trailingBadges={
                      isLow && !isNegative ? (
                        <Badge size="xs" variant="light" color="orange" radius="sm">
                          {t('productInventory.stockState.low')}
                        </Badge>
                      ) : undefined
                    }
                  />
                );
              })}
              {/* Refresh hint */}
              {canEditInventory && (
                <Text
                  size="xs"
                  c="dimmed"
                  ta="right"
                  fs="italic"
                  style={{ cursor: 'pointer' }}
                  onClick={forceRefresh}
                >
                  {t('common.detail.inventoryTab.refresh')}
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Card>

      <ProductInventoryUpdateModal
        opened={update.opened}
        onClose={update.close}
        row={update.activeRow}
        product={product}
        contextLabel={
          update.noLocation ? undefined : `${product.name} · ${update.contextLabel ?? ''}`
        }
      />

      <ProductInventoryFormModal
        opened={createOpened}
        onClose={closeCreate}
        product={product}
        existingRows={allRows}
      />
    </>
  );
}
