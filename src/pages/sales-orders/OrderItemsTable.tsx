import {
  Badge,
  Box,
  Card,
  Checkbox,
  Divider,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconBoxMultiple, IconMapPin } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { InlineTextareaField, type InlineEditLabels } from '@credo/base-ui/components';
import type { InventoryLinkageSnapshotEntry, InventoryLinkageState, SalesOrderItem } from '@/types';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types';
import { lookupLabelOf, useLookupV2Labels, useOpenInboundByProduct } from '@/hooks';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import {
  isExtraDeliveryQuantityAllowed,
  isLocationsEnabled,
  isPricingManagementEnabled,
  perms,
} from '@/utils/permission';
import { getLinePhysicalQuantity } from '@/utils/salesOrderItemQuantity';
import {
  getSequentialAvailability,
  getUnitAvailabilityAtLocation,
  indexInventoryByProduct,
} from '@/utils/inventoryCommitment';
import { ProductLink } from '@/components/ProductLink';
import { FieldRow } from '@/components/FieldRow';
import { isNoInventoryProduct } from '@/utils/productSet';
import { getProductSuggestedPrice, isBelowSuggestedPrice } from '@/utils/productPricing';
import { PRODUCT_SET_COLOR } from '@/config/misc';
import { AVAILABILITY_INCLUDES_INCOMING } from '@/config/inventoryDisplayDefaults';

const isMobile = device.isMobile;
const locationsEnabled = isLocationsEnabled();

const showPrice = isPricingManagementEnabled() && perms.salesOrder.canViewPrice();

const canViewSetComponentInventory = perms.salesOrder.canViewSetComponentInventory();

type OrderItemsTableProps = {
  items: SalesOrderItem[];
  showShortageAlert?: boolean;
  totalAmount?: number | null;

  ownReservedSnapshot?: readonly InventoryLinkageSnapshotEntry[];

  currentOrderNumber?: string;

  inventoryLinkageState?: InventoryLinkageState;

  canEditItemMemo?: boolean;
  onItemMemoSave?: (itemIndex: number, memo: string) => Promise<void>;

  showItemReady?: boolean;
  onItemReadySave?: (itemIndex: number, isReady: boolean) => Promise<void>;

  showItemWarehouseMemo?: boolean;
  onItemWarehouseMemoSave?: (itemIndex: number, warehouseMemo: string) => Promise<void>;

  productPhotoOnHover?: boolean;
};

export function OrderItemsTable({
  items,
  totalAmount,
  showShortageAlert = true,
  ownReservedSnapshot,
  inventoryLinkageState,
  canEditItemMemo = false,
  onItemMemoSave,
  showItemReady = false,
  onItemReadySave,
  showItemWarehouseMemo = false,
  onItemWarehouseMemoSave,
  productPhotoOnHover = false,
  currentOrderNumber,
}: OrderItemsTableProps) {
  const stockSettled = inventoryLinkageState === 'shipped' || inventoryLinkageState === 'released';
  const { t } = useTranslation();

  const extraQtyEnabled = isExtraDeliveryQuantityAllowed();

  const memoEditable = canEditItemMemo && !!onItemMemoSave;

  const [readySaving, setReadySaving] = useState<number | null>(null);
  const readyEditable = showItemReady && !!onItemReadySave;
  const renderReadyBox = (item: SalesOrderItem) => {
    const idx = items.indexOf(item);
    return (
      <Checkbox
        checked={item.isReady === true}
        disabled={!readyEditable || readySaving !== null || idx < 0}
        aria-label={t('salesOrders.detail.itemReady')}
        onChange={async (e) => {
          const next = e.currentTarget.checked;
          setReadySaving(idx);
          try {
            await onItemReadySave!(idx, next);
          } catch {
            // The handler already surfaced the conflict toast and re-seeded the
            // order; the box re-renders from that state, so there is nothing to
            // roll back here.
          } finally {
            setReadySaving(null);
          }
        }}
      />
    );
  };
  const inlineEditLabels: InlineEditLabels = {
    edit: t('__new__.01-common.actions.edit'),
    save: t('__new__.01-common.actions.save'),
    cancel: t('__new__.01-common.actions.cancel'),
  };
  const warehouseMemoEditable = showItemWarehouseMemo && !!onItemWarehouseMemoSave;
  const renderWarehouseMemo = (item: SalesOrderItem) =>
    warehouseMemoEditable ? (
      <InlineTextareaField
        canEdit
        value={item.warehouseMemo ?? ''}
        onSave={async (next) => {
          const idx = items.indexOf(item);
          if (idx >= 0) await onItemWarehouseMemoSave!(idx, next);
        }}
        placeholder={''}
        emptyPlaceholder={''}
        labels={inlineEditLabels}
      />
    ) : item.warehouseMemo ? (
      <Text size="sm" c="dimmed" fs="italic" style={{ wordBreak: 'break-word' }}>
        {item.warehouseMemo}
      </Text>
    ) : null;
  const renderMemoEditor = (item: SalesOrderItem) => (
    <InlineTextareaField
      canEdit
      value={item.memo ?? ''}
      onSave={async (next) => {
        const idx = items.indexOf(item);
        if (idx >= 0) await onItemMemoSave!(idx, next);
      }}
      placeholder={''}
      emptyPlaceholder={''}
      labels={inlineEditLabels}
    />
  );

  const products = useProductStore((s) => s.items);
  const locations = useLocationStore((s) => s.items);
  const inventoryRows = useProductInventoryStore((s) => s.items);
  const inventoryInitialized = useProductInventoryStore((s) => s.initialized);
  const loadInventory = useProductInventoryStore((s) => s.loadAll);
  const unitLabels = useLookupV2Labels('product-unit');

  const inboundByProduct = useOpenInboundByProduct();

  useEffect(() => {
    if (!inventoryInitialized) loadInventory();
  }, [inventoryInitialized, loadInventory]);

  const productByCode = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);
  const locationLabelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.code, l.name || l.code);
    return m;
  }, [locations]);
  const inventoryByProduct = useMemo(() => indexInventoryByProduct(inventoryRows), [inventoryRows]);

  function getSku(productCode: string): string {
    return productByCode.get(productCode)?.extra?.sku ?? '';
  }

  function getLocationLabel(code: string | undefined): string {
    if (!code || isDefaultLocation(code)) return t('common.labels.defaultLocation');
    return locationLabelByCode.get(code) ?? code;
  }

  function getAvailable(productCode: string, locationCode: string | undefined): number | null {
    if (stockSettled) return null;
    const product = productByCode.get(productCode);
    if (!product) return null;

    if (isNoInventoryProduct(product)) return null;
    const target = locationCode || DEFAULT_LOCATION_CODE;

    const incoming = AVAILABILITY_INCLUDES_INCOMING
      ? (inboundByProduct.get(productCode)?.totalBase ?? 0)
      : 0;
    return getSequentialAvailability(product, target, inventoryByProduct, {
      orderNumber: currentOrderNumber,
      incoming,
    });
  }

  function getUnitAvailable(
    productCode: string,
    locationCode: string | undefined,
    unit: string,
  ): number | null {
    if (stockSettled) return null;
    const product = productByCode.get(productCode);
    if (!product) return null;
    if (isNoInventoryProduct(product)) return null;
    const target = locationCode || DEFAULT_LOCATION_CODE;
    return getUnitAvailabilityAtLocation(
      product,
      target,
      unit,
      inventoryByProduct,
      ownReservedSnapshot,
    );
  }

  const displayItems = useMemo(
    () =>
      canViewSetComponentInventory ? items : items.filter((it) => it.role !== 'set-component'),
    [items],
  );

  if (isMobile) {
    return (
      <Stack gap="sm">
        {displayItems.map((item, idx) => {
          const isSetParent = item.role === 'set';
          const isSetChild = item.role === 'set-component';

          const available = isSetChild
            ? getUnitAvailable(item.productCode, item.fromLocationCode, item.unit)
            : getAvailable(item.productCode, item.fromLocationCode);
          const short = available !== null && available < getLinePhysicalQuantity(item);
          const unitLabel = lookupLabelOf(unitLabels, item.unit);
          const lineProduct = productByCode.get(item.productCode);
          const suggestedPrice = getProductSuggestedPrice(lineProduct);
          const belowSuggested =
            showPrice && !isSetChild && isBelowSuggestedPrice(lineProduct, item.unitPrice);
          return (
            <Card
              key={idx}
              withBorder
              radius="md"
              padding="md"
              ml={isSetChild ? 'md' : 0}
              bg={isSetParent ? `var(--mantine-color-${PRODUCT_SET_COLOR}-0)` : undefined}
            >
              <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                  {/* Deliberately NOT desktop-only. `mobile-workflow.md` §4 bars
                      inline-edit *pencils* — a value edited in place in a
                      read-only slot — and its line is "mobile doesn't AUTHOR a
                      record". A picking tick is neither: it is a control that
                      looks like a control, reversible in one tap, and the
                      warehouse does this on the floor with a phone. Desktop-only
                      here would be a picking feature that picking staff can't
                      reach. */}
                  {showItemReady && !isSetChild && <Box pt={2}>{renderReadyBox(item)}</Box>}
                  <Box style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                    <Group gap={6} wrap="nowrap">
                      {isSetParent && (
                        <IconBoxMultiple
                          size={14}
                          style={{
                            color: `var(--mantine-color-${PRODUCT_SET_COLOR}-6)`,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Text fw={700} size="md" component="div">
                        <ProductLink code={item.productCode} name={item.productName?.trim()} />
                      </Text>
                      {isSetParent && (
                        <Badge size="xs" variant="light" color={PRODUCT_SET_COLOR} radius="sm">
                          {t('salesOrders.form.setParentBadge')}
                        </Badge>
                      )}
                      {isSetChild && (
                        <Badge size="xs" variant="light" color="gray" radius="sm">
                          {t('salesOrders.form.setComponentBadge')}
                        </Badge>
                      )}
                    </Group>
                    {isSetChild && (
                      <Text size="xs" c="dimmed">
                        {t('salesOrders.form.setComponentChildLabel', {
                          setName: getSku(item.sourceSetCode ?? '') || item.sourceSetCode,
                        })}
                      </Text>
                    )}
                  </Box>
                </Group>

                <Stack gap={4}>
                  <FieldRow
                    label={t('salesOrders.detail.quantity')}
                    value={
                      <>
                        {item.quantity.toLocaleString()} {unitLabel}
                        {extraQtyEnabled && !isSetChild && (item.extraQuantity ?? 0) > 0 && (
                          <Text size="xs" c="dimmed" component="span" ml={6}>
                            {t('salesOrders.detail.extraQuantityHint', {
                              extra: (item.extraQuantity ?? 0).toLocaleString(),
                              physical: getLinePhysicalQuantity(item).toLocaleString(),
                            })}
                          </Text>
                        )}
                      </>
                    }
                  />
                  {showPrice && !isSetChild && (
                    <FieldRow
                      label={
                        isSetParent
                          ? t('salesOrders.form.setParentSubtotal')
                          : t('common.labels.unitPrice')
                      }
                      value={
                        <Text
                          size="sm"
                          fw={500}
                          component="span"
                          c={belowSuggested ? 'orange.7' : undefined}
                        >
                          {item.unitPrice.toLocaleString()}
                          {belowSuggested && suggestedPrice !== undefined && (
                            <Text size="xs" c="orange.7" component="span" ml={6}>
                              (
                              {t('salesOrders.detail.belowSuggestedPrice', {
                                price: suggestedPrice.toLocaleString(),
                              })}
                              )
                            </Text>
                          )}
                        </Text>
                      }
                    />
                  )}
                  {!isSetChild && item.memo && (
                    <FieldRow label={t('salesOrders.detail.itemMemo')} value={item.memo} />
                  )}
                  {showItemWarehouseMemo && !isSetChild && (
                    <FieldRow
                      label={t('salesOrders.detail.itemWarehouseMemo')}
                      value={renderWarehouseMemo(item)}
                    />
                  )}
                  {showPrice && !isSetChild && !isSetParent && (
                    <FieldRow
                      label={t('common.detail.lineTotal')}
                      value={
                        <Text size="sm" fw={700} ff="monospace" component="span">
                          {(item.quantity * item.unitPrice).toLocaleString()}
                        </Text>
                      }
                    />
                  )}
                  {locationsEnabled && !isSetParent && (
                    <FieldRow
                      label={t('salesOrders.detail.fromLocation')}
                      value={
                        <Group gap={4} wrap="nowrap">
                          <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
                          <Text size="sm" fw={500} component="span">
                            {getLocationLabel(item.fromLocationCode)}
                          </Text>
                        </Group>
                      }
                    />
                  )}
                  {showShortageAlert && available !== null && (
                    <>
                      <Divider variant="dashed" my="xs" />
                      <Group gap="xs" wrap="nowrap" justify="space-between">
                        <Text size="sm" c={short ? 'red' : 'dimmed'} fw={short ? 600 : undefined}>
                          {short
                            ? t('salesOrders.detail.availableShort', {
                                available: available.toLocaleString(),
                                unit: unitLabel,
                              })
                            : t('salesOrders.detail.availableOk', {
                                available: available.toLocaleString(),
                                unit: unitLabel,
                              })}
                        </Text>
                        {showShortageAlert && short && (
                          <Badge size="xs" color="red" variant="light" radius="sm" tt="lowercase">
                            {t('salesOrders.detail.availableShortBadge')}
                          </Badge>
                        )}
                      </Group>
                    </>
                  )}
                </Stack>
              </Stack>
            </Card>
          );
        })}
        {showPrice && (
          <Group justify="space-between" px="md" py="sm" bg="gray.0" style={{ borderRadius: 8 }}>
            <Text size="sm" fw={600} c="dimmed">
              {t('common.columns.totalAmount')}
            </Text>
            <Text size="md" fw={700} ff="monospace">
              {totalAmount?.toLocaleString() ?? '-'}
            </Text>
          </Group>
        )}
      </Stack>
    );
  }

  return (
    <>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40}>#</Table.Th>
            {/* Leading, not trailing: the warehouse scans down this column and
                nothing else, so it must not sit behind the price columns. */}
            {showItemReady && (
              <Table.Th w={64} style={{ textAlign: 'center' }}>
                <Tooltip label={t('salesOrders.detail.itemReadyTooltip')} withArrow>
                  <Text size="sm" fw={700} span>
                    {t('salesOrders.detail.itemReady')}
                  </Text>
                </Tooltip>
              </Table.Th>
            )}
            <Table.Th w={120}>{t('common.labels.sku')}</Table.Th>
            <Table.Th w={200}>{t('common.labels.productName')}</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>{t('salesOrders.detail.quantity')}</Table.Th>
            <Table.Th w={80}>{t('common.labels.unit')}</Table.Th>
            {locationsEnabled && (
              <Table.Th w={140}>{t('salesOrders.detail.fromLocation')}</Table.Th>
            )}
            {!stockSettled && (
              <Table.Th style={{ textAlign: 'right' }} w={120}>
                {t('salesOrders.detail.available')}
              </Table.Th>
            )}
            {showPrice && (
              <>
                <Table.Th style={{ textAlign: 'right' }} w={140}>
                  {t('common.labels.unitPrice')}
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }} w={140}>
                  {t('common.detail.lineTotal')}
                </Table.Th>
              </>
            )}
            <Table.Th style={{ textAlign: 'center' }} w={200} pr={showItemWarehouseMemo ? 0 : 'md'}>
              {t('salesOrders.form.itemMemoLabel')}
            </Table.Th>
            {/* Its own column, beside the sales note rather than merged into it:
                one says what to do with the line, the other says what happened
                to it, and reading them in one cell loses who is speaking. */}
            {showItemWarehouseMemo && (
              <Table.Th style={{ textAlign: 'center' }} w={200} pr="md">
                {t('salesOrders.detail.itemWarehouseMemo')}
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {displayItems.map((item, idx) => {
            const isSetParent = item.role === 'set';
            const isSetChild = item.role === 'set-component';

            const available = isSetChild
              ? getUnitAvailable(item.productCode, item.fromLocationCode, item.unit)
              : getAvailable(item.productCode, item.fromLocationCode);
            const short = available !== null && available < getLinePhysicalQuantity(item);
            const lineProduct = productByCode.get(item.productCode);
            const suggestedPrice = getProductSuggestedPrice(lineProduct);
            const belowSuggested =
              showPrice && !isSetChild && isBelowSuggestedPrice(lineProduct, item.unitPrice);
            return (
              <Table.Tr
                key={idx}
                bg={
                  isSetParent
                    ? `var(--mantine-color-${PRODUCT_SET_COLOR}-0)`
                    : isSetChild
                      ? 'gray.0'
                      : undefined
                }
              >
                <Table.Td c="dimmed">{idx + 1}</Table.Td>
                {showItemReady && (
                  <Table.Td style={{ textAlign: 'center' }}>
                    {/* Set children aren't picked individually — the parent line
                        is the thing that leaves the warehouse, same rule the
                        memo column follows. */}
                    {isSetChild ? null : renderReadyBox(item)}
                  </Table.Td>
                )}
                <Table.Td>
                  <Text size="sm" ff="monospace" c="dimmed">
                    {getSku(item.productCode) || '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    {isSetChild && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        ↳
                      </Text>
                    )}
                    {isSetParent && (
                      <IconBoxMultiple
                        size={14}
                        style={{
                          color: `var(--mantine-color-${PRODUCT_SET_COLOR}-6)`,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Stack gap={2}>
                      <ProductLink
                        code={item.productCode}
                        name={item.productName}
                        photoOnHover={productPhotoOnHover}
                      />
                      {isSetParent && (
                        <Badge
                          size="xs"
                          variant="light"
                          color={PRODUCT_SET_COLOR}
                          radius="sm"
                          w="fit-content"
                        >
                          {t('salesOrders.form.setParentBadge')}
                        </Badge>
                      )}
                      {isSetChild && (
                        <Text size="xs" c="dimmed">
                          {t('salesOrders.form.setComponentChildLabel', {
                            setName: getSku(item.sourceSetCode ?? '') || item.sourceSetCode,
                          })}
                        </Text>
                      )}
                      {item.memo && !isSetChild && !memoEditable && (
                        <Text size="xs" c="dimmed" fs="italic" style={{ wordBreak: 'break-word' }}>
                          {t('salesOrders.detail.itemMemo')}: {item.memo}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" ff="monospace">
                    {item.quantity.toLocaleString()}
                  </Text>
                  {extraQtyEnabled && !isSetChild && (item.extraQuantity ?? 0) > 0 && (
                    <Text size="xs" c="dimmed" ta="center">
                      {t('salesOrders.detail.extraQuantityHint', {
                        extra: (item.extraQuantity ?? 0).toLocaleString(),
                        physical: getLinePhysicalQuantity(item).toLocaleString(),
                      })}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td c="dimmed">{lookupLabelOf(unitLabels, item.unit)}</Table.Td>
                {locationsEnabled && (
                  <Table.Td>
                    {isSetParent ? (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    ) : (
                      <Group gap={4} wrap="nowrap">
                        <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
                        <Text
                          size="sm"
                          c={isDefaultLocation(item.fromLocationCode) ? 'dimmed' : undefined}
                        >
                          {getLocationLabel(item.fromLocationCode)}
                        </Text>
                      </Group>
                    )}
                  </Table.Td>
                )}
                {!stockSettled && (
                  <Table.Td style={{ textAlign: 'right' }}>
                    {available === null ? (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    ) : (
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        <Text size="sm" fw={short ? 600 : 400} c={short ? 'red' : undefined}>
                          {available.toLocaleString()}
                        </Text>
                        {showShortageAlert && short && (
                          <Badge size="xs" color="red" variant="light" radius="sm" tt="lowercase">
                            {t('salesOrders.detail.availableShortBadge')}
                          </Badge>
                        )}
                      </Group>
                    )}
                  </Table.Td>
                )}
                {showPrice && (
                  <>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isSetChild ? (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      ) : (
                        <Stack gap={0} align="flex-end">
                          <Text
                            size="sm"
                            ff="monospace"
                            c={belowSuggested ? 'orange.7' : undefined}
                            fw={belowSuggested ? 600 : undefined}
                          >
                            {item.unitPrice.toLocaleString()}
                          </Text>
                          {belowSuggested && suggestedPrice !== undefined && (
                            <Text size="xs" c="orange.7" ta="right" lh={1.2}>
                              {t('salesOrders.detail.belowSuggestedPrice', {
                                price: suggestedPrice.toLocaleString(),
                              })}
                            </Text>
                          )}
                        </Stack>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isSetChild ? (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      ) : (
                        <Text size="sm" ff="monospace">
                          {(item.quantity * item.unitPrice).toLocaleString()}
                        </Text>
                      )}
                    </Table.Td>
                  </>
                )}
                <Table.Td
                  style={{ textAlign: memoEditable && !isSetChild ? 'left' : 'right' }}
                  pr={showItemWarehouseMemo ? 0 : 'md'}
                >
                  {memoEditable && !isSetChild ? (
                    renderMemoEditor(item)
                  ) : item.memo ? (
                    <Text size="sm" c="dimmed" fs="italic" style={{ wordBreak: 'break-word' }}>
                      {item.memo}
                    </Text>
                  ) : null}
                </Table.Td>
                {showItemWarehouseMemo && (
                  <Table.Td
                    style={{ textAlign: warehouseMemoEditable && !isSetChild ? 'left' : 'right' }}
                    pr="md"
                  >
                    {isSetChild ? null : renderWarehouseMemo(item)}
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      {showPrice && (
        <Group
          justify="flex-end"
          px="md"
          py="sm"
          bg="gray.0"
          style={{ borderTop: '2px solid var(--mantine-color-gray-3)' }}
        >
          <Text size="sm" fw={600} c="dimmed">
            {t('common.columns.totalAmount')}
          </Text>
          <Text size="lg" fw={700} ff="monospace">
            {totalAmount?.toLocaleString() ?? '-'}
          </Text>
        </Group>
      )}
    </>
  );
}
