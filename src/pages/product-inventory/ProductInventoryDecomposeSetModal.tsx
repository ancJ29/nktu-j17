import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconBoxMultiple, IconCheck } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types';
import type { Location, Product, ProductInventoryExtra, ProductInventoryRow } from '@/types';
import { getCurrentActorId, lookupLabelOf, useLookupLabels } from '@/hooks';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { applyDelta, readRowBreakdown } from '@/utils/inventoryMath';
import { logActivity } from '@/utils/activityLogger';
import { isLocationsEnabled } from '@/utils/permission';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { isProductSet } from '@/utils/productSet';
import { rebalanceForSetStockChange } from '@/utils/setRebalance';

const locationsEnabled = isLocationsEnabled();

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly products: readonly Product[];
  readonly rows: readonly ProductInventoryRow[];
  readonly locations: readonly Location[];
};

type ComponentPlan = {
  readonly product: Product;
  readonly returnQty: number;
  readonly returnUnit: string;
  readonly row: ProductInventoryRow | null;
  readonly currentQtyInUnit: number;
};

export function ProductInventoryDecomposeSetModal({
  opened,
  onClose,
  products,
  rows,
  locations,
}: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupLabels('unit');

  const [setCode, setSetCode] = useState<string | null>(null);
  
  
  const [locationCode, setLocationCode] = useState<string | null>(
    locationsEnabled ? null : DEFAULT_LOCATION_CODE,
  );
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [submitting, setSubmitting] = useState(false);

  const setProducts = useMemo(
    () => products.filter((p) => p.isActive && isProductSet(p)),
    [products],
  );
  const setProductOptions = useMemo(
    () =>
      setProducts.map((p) => ({
        value: p.code,
        label: `${p.extra?.sku ?? p.code} — ${p.name}`,
      })),
    [setProducts],
  );
  const locationOptions = useMemo(
    () => [
      { value: DEFAULT_LOCATION_CODE, label: t('common.labels.defaultLocation') },
      ...locations
        .filter((l) => l.isActive && !isDefaultLocation(l.code))
        .map((l) => ({ value: l.code, label: `${l.name} (${l.code})` })),
    ],
    [locations, t],
  );

  const setProduct = useMemo(
    () => (setCode ? (setProducts.find((p) => p.code === setCode) ?? null) : null),
    [setCode, setProducts],
  );

  const productByCode = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);

  function findRow(productCode: string, target: string): ProductInventoryRow | null {
    return (
      rows.find(
        (r) =>
          r.itemCode === productCode &&
          (r.locationCode === target ||
            (isDefaultLocation(r.locationCode) && isDefaultLocation(target))),
      ) ?? null
    );
  }

  const target = locationCode || DEFAULT_LOCATION_CODE;
  const qtyNum = typeof quantity === 'number' && quantity > 0 ? quantity : 0;

  const parentRow = useMemo(() => {
    if (!setProduct) return null;
    return findRow(setProduct.code, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProduct, target, rows]);
  const parentPrimaryUnit = setProduct?.unit ?? '';
  const parentCurrentQty = useMemo(() => {
    if (!setProduct || !parentRow) return 0;
    const baseUnit = getItemBaseUnit(setProduct);
    const breakdown = readRowBreakdown(parentRow, baseUnit);
    return breakdown[parentPrimaryUnit] ?? 0;
  }, [setProduct, parentRow, parentPrimaryUnit]);

  const componentPlans: ComponentPlan[] = useMemo(() => {
    if (!setProduct || qtyNum <= 0) return [];
    const items = setProduct.extra?.setItems ?? [];
    return items.map((si) => {
      const product = productByCode.get(si.productCode);
      const returnQty = si.quantity * qtyNum;
      if (!product) {
        return {
          product: {
            id: '',
            code: si.productCode,
            name: si.productCode,
            unit: si.unit,
            price: 0,
            isActive: true,
            extra: {},
            createdAt: '',
            updatedAt: '',
            version: '',
          } as unknown as Product,
          returnQty,
          returnUnit: si.unit,
          row: null,
          currentQtyInUnit: 0,
        };
      }
      const row = findRow(si.productCode, target);
      const baseUnit = getItemBaseUnit(product);
      const breakdown = row ? readRowBreakdown(row, baseUnit) : {};
      const currentQtyInUnit = breakdown[si.unit] ?? 0;
      return {
        product,
        returnQty,
        returnUnit: si.unit,
        row,
        currentQtyInUnit,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProduct, qtyNum, target, rows, productByCode]);

  const parentShortage = qtyNum > 0 ? Math.max(qtyNum - parentCurrentQty, 0) : 0;

  const blockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!setProduct) reasons.push(t('productInventory.decomposeSet.validation.pickSet'));
    if (!locationCode) reasons.push(t('productInventory.decomposeSet.validation.pickLocation'));
    if (qtyNum <= 0) reasons.push(t('productInventory.decomposeSet.validation.positiveQty'));
    if (setProduct && qtyNum > 0) {
      if (!parentRow) {
        reasons.push(
          t('productInventory.decomposeSet.validation.parentMissing', {
            code: setProduct.code,
          }),
        );
      } else if (parentShortage > 0) {
        reasons.push(
          t('productInventory.decomposeSet.validation.parentShort', {
            code: setProduct.code,
            short: parentShortage.toLocaleString(),
            unit: lookupLabelOf(unitLabels, parentPrimaryUnit),
          }),
        );
      }
      for (const c of componentPlans) {
        if (!c.product.id) {
          reasons.push(
            t('productInventory.decomposeSet.validation.componentUnknown', {
              code: c.product.code,
            }),
          );
          continue;
        }
        if (!c.row) {
          reasons.push(
            t('productInventory.decomposeSet.validation.componentRowMissing', {
              code: c.product.code,
            }),
          );
        }
      }
    }
    return reasons;
  }, [
    setProduct,
    locationCode,
    qtyNum,
    parentRow,
    parentShortage,
    componentPlans,
    parentPrimaryUnit,
    unitLabels,
    t,
  ]);

  const canDecompose = blockingReasons.length === 0 && !submitting;

  const handleClose = useCallback(() => {
    if (submitting) return;
    setSetCode(null);
    setLocationCode(locationsEnabled ? null : DEFAULT_LOCATION_CODE);
    setQuantity(1);
    onClose();
  }, [submitting, onClose]);

  const handleDecompose = useCallback(async () => {
    if (!setProduct || !parentRow || qtyNum <= 0) return;
    setSubmitting(true);
    
    
    
    
    
    await useProductInventoryStore.getState().revalidate();
    const store = useProductInventoryStore.getState();
    const actorId = getCurrentActorId();
    const noteSuffix = t('productInventory.decomposeSet.note', {
      qty: qtyNum.toLocaleString(),
      code: setProduct.code,
    });
    let written = 0;
    try {
      
      
      
      
      
      
      
      const parentBase = getItemBaseUnit(setProduct);
      const parentBreakdown = readRowBreakdown(parentRow, parentBase);
      const parentResult = applyDelta(setProduct, parentBreakdown, {
        [parentPrimaryUnit]: -qtyNum,
      });
      if (!parentResult.ok) {
        throw new Error(
          parentResult.reason === 'negative'
            ? t('productInventory.validation.insufficientStock', { unit: parentPrimaryUnit })
            : t('productInventory.validation.unknownUnit', { unit: parentPrimaryUnit }),
        );
      }
      const parentExtra: ProductInventoryExtra = {
        ...parentRow.extra,
        onHandByUnit: parentResult.onHandByUnit,
        lastNote: `[decompose-set] ${noteSuffix}`,
        lastUpdatedBy: actorId,
      };
      await store.updateSafely({
        id: parentRow.id,
        version: parentRow.version,
        patch: { onHand: parentResult.onHand, extra: parentExtra },
      });
      
      logActivity('productInventory.adjust', setProduct.id, {
        locationCode: parentRow.locationCode,
        prevOnHand: parentRow.onHand,
        nextOnHand: parentResult.onHand,
        delta: parentResult.onHand - parentRow.onHand,
        via: 'decompose-set',
        setCode: setProduct.code,
        setName: setProduct.name,
        note: `[decompose-set] ${noteSuffix}`,
      });
      written += 1;

      
      for (const c of componentPlans) {
        if (!c.row || !c.product.id) continue; 
        const baseUnit = getItemBaseUnit(c.product);
        const breakdown = readRowBreakdown(c.row, baseUnit);
        const result = applyDelta(c.product, breakdown, { [c.returnUnit]: c.returnQty });
        if (!result.ok) {
          throw new Error(
            result.reason === 'unknown-unit'
              ? t('productInventory.validation.unknownUnit', { unit: c.returnUnit })
              : t('productInventory.validation.bad'),
          );
        }
        const updatedExtra: ProductInventoryExtra = {
          ...c.row.extra,
          onHandByUnit: result.onHandByUnit,
          lastNote: `[decompose-set] ${noteSuffix}`,
          lastUpdatedBy: actorId,
        };
        await store.updateSafely({
          id: c.row.id,
          version: c.row.version,
          patch: { onHand: result.onHand, extra: updatedExtra },
        });
        
        
        logActivity('productInventory.adjust', c.product.id, {
          locationCode: c.row.locationCode,
          prevOnHand: c.row.onHand,
          nextOnHand: result.onHand,
          delta: result.onHand - c.row.onHand,
          via: 'decompose-set',
          setCode: setProduct.code,
          setName: setProduct.name,
          note: `[decompose-set] ${noteSuffix}`,
        });
        written += 1;
      }

      notifications.show({
        color: 'green',
        message: t('productInventory.decomposeSet.success', {
          qty: qtyNum.toLocaleString(),
          code: setProduct.code,
        }),
      });
      handleClose();
      
      
      
      void rebalanceForSetStockChange([setProduct.code], 'decompose');
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
      } else {
        notifications.show({
          color: 'red',
          title: t('productInventory.decomposeSet.partialFailureTitle'),
          message: t('productInventory.decomposeSet.partialFailureMessage', {
            written,
            error: err instanceof Error ? err.message : String(err),
          }),
          autoClose: 10000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [setProduct, parentRow, parentPrimaryUnit, qtyNum, componentPlans, handleClose, t]);

  const newParentOnHand =
    parentRow && setProduct && qtyNum > 0
      ? (() => {
          const baseUnit = getItemBaseUnit(setProduct);
          const breakdown = readRowBreakdown(parentRow, baseUnit);
          const r = applyDelta(setProduct, breakdown, { [parentPrimaryUnit]: -qtyNum });
          return r.ok ? r.onHand : null;
        })()
      : null;

  return (
    <ResponsiveModal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={6}>
          <IconBoxMultiple size={16} color="var(--mantine-color-orange-6)" />
          <Text fw={600}>{t('productInventory.decomposeSet.title')}</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('productInventory.decomposeSet.description')}
        </Text>

        <Group grow align="flex-start">
          <Select
            label={t('productInventory.decomposeSet.setLabel')}
            placeholder={t('productInventory.decomposeSet.setPlaceholder')}
            data={setProductOptions}
            value={setCode}
            onChange={setSetCode}
            searchable
            disabled={submitting}
          />
          {locationsEnabled && (
            <Select
              label={t('productInventory.decomposeSet.locationLabel')}
              placeholder={t('productInventory.decomposeSet.locationPlaceholder')}
              data={locationOptions}
              value={locationCode}
              onChange={setLocationCode}
              searchable
              disabled={submitting}
            />
          )}
          <NumberInput
            label={t('productInventory.decomposeSet.quantityLabel')}
            placeholder="1"
            value={quantity}
            onChange={(v) => setQuantity(typeof v === 'number' ? v : Number(v) || '')}
            min={1}
            disabled={submitting}
          />
        </Group>

        {setProduct && qtyNum > 0 && (
          <>
            <Card withBorder padding="sm" radius="md" bg="orange.0">
              <Stack gap={4}>
                <Group justify="space-between">
                  <Group gap={6}>
                    <IconBoxMultiple size={14} color="var(--mantine-color-orange-6)" />
                    <Text size="sm" fw={600}>
                      {setProduct.extra?.sku ?? setProduct.code} — {setProduct.name}
                    </Text>
                    <Badge size="xs" color="orange" variant="light" radius="sm">
                      {t('salesOrders.form.setParentBadge')}
                    </Badge>
                  </Group>
                  {parentRow ? (
                    <Text size="sm" ff="monospace" c={parentShortage > 0 ? 'red' : undefined}>
                      {parentRow.onHand.toLocaleString()} →{' '}
                      <Text span fw={700}>
                        {newParentOnHand?.toLocaleString() ?? '?'}
                      </Text>{' '}
                      {lookupLabelOf(unitLabels, parentPrimaryUnit)}
                      {parentShortage > 0 && (
                        <Text span c="red" fw={600}>
                          {' '}
                          ·{' '}
                          {t('productInventory.decomposeSet.shortBadge', {
                            short: parentShortage.toLocaleString(),
                          })}
                        </Text>
                      )}
                    </Text>
                  ) : (
                    <Badge color="red" variant="light" size="xs" radius="sm">
                      {t('productInventory.decomposeSet.parentMissing')}
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Card>

            <Table withTableBorder striped fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('productInventory.decomposeSet.componentCol')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }} w={140}>
                    {t('productInventory.decomposeSet.returnCol')}
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }} w={140}>
                    {t('productInventory.decomposeSet.currentCol')}
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }} w={140}>
                    {t('productInventory.decomposeSet.resultCol')}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {componentPlans.map((c) => {
                  const result = c.currentQtyInUnit + c.returnQty;
                  return (
                    <Table.Tr key={c.product.code}>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm" fw={500}>
                            {c.product.extra?.sku ?? c.product.code} — {c.product.name}
                          </Text>
                          {!c.product.id && (
                            <Text size="xs" c="red">
                              {t('productInventory.composeSet.unknownProduct')}
                            </Text>
                          )}
                          {c.product.id && !c.row && (
                            <Text size="xs" c="red">
                              {t('productInventory.composeSet.noRowAtLocation')}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" ff="monospace" c="green">
                          +{c.returnQty.toLocaleString()} {lookupLabelOf(unitLabels, c.returnUnit)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" ff="monospace">
                          {c.currentQtyInUnit.toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" ff="monospace" fw={c.row ? 600 : 400}>
                          {c.row ? result.toLocaleString() : '—'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}

        {blockingReasons.length > 0 && setProduct && qtyNum > 0 && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title={t('productInventory.decomposeSet.blockedTitle')}
          >
            <Stack gap={2}>
              {blockingReasons.map((r, i) => (
                <Text key={i} size="xs">
                  • {r}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={handleClose} disabled={submitting}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button
            leftSection={<IconCheck size={14} />}
            color="orange"
            onClick={handleDecompose}
            disabled={!canDecompose}
            loading={submitting}
          >
            {t('productInventory.decomposeSet.submit', {
              qty: qtyNum > 0 ? qtyNum.toLocaleString() : '',
            })}
          </Button>
        </Group>
      </Stack>
    </ResponsiveModal>
  );
}
