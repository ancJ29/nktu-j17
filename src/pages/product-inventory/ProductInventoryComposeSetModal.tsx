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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { CustomerSelector, type CustomerSelectorChange } from '@/components/selectors';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types';
import type {
  Customer,
  Location,
  Product,
  ProductInventoryExtra,
  ProductInventoryRow,
} from '@/types';
import { getCurrentActorId, lookupLabelOf, useLookupLabels } from '@/hooks';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { applyDelta, readRowBreakdown } from '@/utils/inventoryMath';
import { logActivity } from '@/utils/activityLogger';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { isLocationsEnabled } from '@/utils/permission';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { isProductSet } from '@/utils/productSet';
import { rebalanceForSetStockChange } from '@/utils/setRebalance';
import { PRODUCT_SET_COLOR } from '@/config/misc';
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
  readonly requiredQty: number;
  readonly requiredUnit: string;
  readonly row: ProductInventoryRow | null;
  readonly currentQtyInUnit: number;
  readonly shortage: number;
};

export function ProductInventoryComposeSetModal({
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

  const [customer, setCustomer] = useState<CustomerSelectorChange | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);

  const custAutoResolvedForRef = useRef<string | null>(null);
  const soAutoResolvedForRef = useRef<string | null>(null);

  const salesOrders = useSalesOrderStore((s) => s.items);
  const salesOrdersInitialized = useSalesOrderStore((s) => s.initialized);
  const loadSalesOrders = useSalesOrderStore((s) => s.loadAll);
  const refreshSalesOrders = useSalesOrderStore((s) => s.forceRefresh);
  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);

  const soFetchRange = useMemo(() => defaultLastNDaysRange(90), []);

  useEffect(() => {
    if (!opened) return;
    if (!customersInitialized) loadCustomers();
    setSalesOrderQueryRange(soFetchRange.from, soFetchRange.to);
    if (salesOrdersInitialized) refreshSalesOrders();
    else loadSalesOrders();
  }, [
    opened,
    customersInitialized,
    salesOrdersInitialized,
    loadCustomers,
    loadSalesOrders,
    refreshSalesOrders,
    soFetchRange,
  ]);

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

  const eligibleSalesOrders = useMemo(() => {
    if (!setProduct) return [];
    return salesOrders.filter(
      (so) =>
        !!so.extra?.customerCode &&
        !so.isClosed &&
        !so.extra?.isDeleted &&
        !so.extra?.cancellation &&
        so.items.some((it) => it.productCode === setProduct.code),
    );
  }, [salesOrders, setProduct]);

  const eligibleCustomerCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const so of eligibleSalesOrders) {
      if (so.extra?.customerCode) codes.add(so.extra.customerCode);
    }
    return codes;
  }, [eligibleSalesOrders]);

  const customerFilter = useCallback(
    (c: Customer) => c.isActive && !c.extra?.isDeleted && eligibleCustomerCodes.has(c.code),
    [eligibleCustomerCodes],
  );

  const eligibleCustomers = useMemo(
    () => customers.filter(customerFilter),
    [customers, customerFilter],
  );

  const salesOrderOptions = useMemo(() => {
    if (!customer) return [];
    return eligibleSalesOrders
      .filter((so) => so.extra?.customerCode === customer.customer.code)
      .map((so) => ({ value: so.id, label: so.orderNumber }));
  }, [eligibleSalesOrders, customer]);

  const selectedSalesOrder = useMemo(
    () => (salesOrderId ? (salesOrders.find((s) => s.id === salesOrderId) ?? null) : null),
    [salesOrderId, salesOrders],
  );

  const handleCustomerChange = useCallback((sel: CustomerSelectorChange | null) => {
    setCustomer(sel);

    setSalesOrderId(null);
  }, []);

  const handleSetChange = useCallback((code: string | null) => {
    setSetCode(code);
    setCustomer(null);
    setSalesOrderId(null);
  }, []);

  useEffect(() => {
    if (!customersInitialized || !salesOrdersInitialized || !setProduct) return;
    if (custAutoResolvedForRef.current === setProduct.code) return;
    if (eligibleCustomers.length === 0) return;
    custAutoResolvedForRef.current = setProduct.code;
    if (eligibleCustomers.length === 1) {
      const c = eligibleCustomers[0];

      setCustomer({ id: c.id, name: c.extra?.shortName?.trim() || c.name, customer: c });
    }
  }, [customersInitialized, salesOrdersInitialized, setProduct, eligibleCustomers]);

  useEffect(() => {
    if (!customer) return;
    if (soAutoResolvedForRef.current === customer.id) return;
    if (salesOrderOptions.length === 0) return;
    soAutoResolvedForRef.current = customer.id;
    if (salesOrderOptions.length === 1) {
      setSalesOrderId(salesOrderOptions[0].value);
    }
  }, [customer, salesOrderOptions]);

  const soNeeded = useMemo(() => {
    if (!selectedSalesOrder || !setProduct) return null;
    const lines = selectedSalesOrder.items.filter((it) => it.productCode === setProduct.code);
    if (lines.length === 0) return null;
    return { qty: lines.reduce((sum, it) => sum + it.quantity, 0), unit: lines[0].unit };
  }, [selectedSalesOrder, setProduct]);

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

  const componentPlans: ComponentPlan[] = useMemo(() => {
    if (!setProduct || qtyNum <= 0) return [];
    const items = setProduct.extra?.setItems ?? [];
    return items.map((si) => {
      const product = productByCode.get(si.productCode);
      const requiredQty = si.quantity * qtyNum;
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
          requiredQty,
          requiredUnit: si.unit,
          row: null,
          currentQtyInUnit: 0,
          shortage: requiredQty,
        };
      }
      const row = findRow(si.productCode, target);
      const baseUnit = getItemBaseUnit(product);
      const breakdown = row ? readRowBreakdown(row, baseUnit) : {};
      const currentQtyInUnit = breakdown[si.unit] ?? 0;
      const shortage = Math.max(requiredQty - currentQtyInUnit, 0);
      return {
        product,
        requiredQty,
        requiredUnit: si.unit,
        row,
        currentQtyInUnit,
        shortage,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProduct, qtyNum, target, rows, productByCode]);

  const parentRow = useMemo(() => {
    if (!setProduct) return null;
    return findRow(setProduct.code, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProduct, target, rows]);

  const parentBaseUnit = setProduct ? getItemBaseUnit(setProduct) : '';

  const blockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!setProduct) reasons.push(t('productInventory.composeSet.validation.pickSet'));
    if (!locationCode) reasons.push(t('productInventory.composeSet.validation.pickLocation'));
    if (qtyNum <= 0) reasons.push(t('productInventory.composeSet.validation.positiveQty'));
    if (setProduct && qtyNum > 0) {
      for (const c of componentPlans) {
        if (!c.product.id) {
          reasons.push(
            t('productInventory.composeSet.validation.componentUnknown', {
              code: c.product.code,
            }),
          );
          continue;
        }
        if (c.shortage > 0) {
          reasons.push(
            t('productInventory.composeSet.validation.componentShort', {
              code: c.product.code,
              short: c.shortage.toLocaleString(),
              unit: lookupLabelOf(unitLabels, c.requiredUnit),
            }),
          );
        }
      }
    }
    return reasons;
  }, [setProduct, locationCode, qtyNum, componentPlans, unitLabels, t]);

  const canCompose = blockingReasons.length === 0 && !submitting;

  const handleClose = useCallback(() => {
    if (submitting) return;
    setSetCode(null);
    setLocationCode(locationsEnabled ? null : DEFAULT_LOCATION_CODE);
    setQuantity(1);
    setCustomer(null);
    setSalesOrderId(null);

    custAutoResolvedForRef.current = null;
    soAutoResolvedForRef.current = null;
    onClose();
  }, [submitting, onClose]);

  const handleCompose = useCallback(async () => {
    if (!setProduct || qtyNum <= 0) return;
    setSubmitting(true);

    await useProductInventoryStore.getState().revalidate();
    const store = useProductInventoryStore.getState();
    const actorId = getCurrentActorId();
    const noteSuffix = t('productInventory.composeSet.note', {
      qty: qtyNum.toLocaleString(),
      code: setProduct.code,
    });

    const attributionMemo = {
      setCode: setProduct.code,
      setName: setProduct.name,
      ...(customer && { customerCode: customer.customer.code, customerName: customer.name }),
      ...(selectedSalesOrder && {
        salesOrderId: selectedSalesOrder.id,
        salesOrderNumber: selectedSalesOrder.orderNumber,
      }),
    };
    let written = 0;
    try {
      for (const c of componentPlans) {
        if (!c.row || !c.product.id) continue;
        const baseUnit = getItemBaseUnit(c.product);
        const breakdown = readRowBreakdown(c.row, baseUnit);
        const result = applyDelta(c.product, breakdown, { [c.requiredUnit]: -c.requiredQty });
        if (!result.ok) {
          throw new Error(
            result.reason === 'negative'
              ? t('productInventory.validation.insufficientStock', { unit: c.requiredUnit })
              : t('productInventory.validation.unknownUnit', { unit: c.requiredUnit }),
          );
        }
        const updatedExtra: ProductInventoryExtra = {
          ...c.row.extra,
          onHandByUnit: result.onHandByUnit,
          lastNote: `[compose-set] ${noteSuffix}`,
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
          via: 'compose-set',
          ...attributionMemo,
        });
        written += 1;
      }

      if (parentRow) {
        const baseUnit = getItemBaseUnit(setProduct);
        const breakdown = readRowBreakdown(parentRow, baseUnit);
        const result = applyDelta(setProduct, breakdown, { [parentBaseUnit]: qtyNum });
        if (!result.ok) {
          throw new Error(
            result.reason === 'unknown-unit'
              ? t('productInventory.validation.unknownUnit', { unit: parentBaseUnit })
              : t('productInventory.validation.bad'),
          );
        }
        const updatedExtra: ProductInventoryExtra = {
          ...parentRow.extra,
          onHandByUnit: result.onHandByUnit,
          lastNote: `[compose-set] ${noteSuffix}`,
          lastUpdatedBy: actorId,
        };
        await store.updateSafely({
          id: parentRow.id,
          version: parentRow.version,
          patch: { onHand: result.onHand, extra: updatedExtra },
        });

        logActivity('productInventory.adjust', setProduct.id, {
          locationCode: parentRow.locationCode,
          prevOnHand: parentRow.onHand,
          nextOnHand: result.onHand,
          delta: result.onHand - parentRow.onHand,
          via: 'compose-set',
          ...attributionMemo,
        });
        written += 1;
      } else {
        const baseUnit = getItemBaseUnit(setProduct);
        const extra: ProductInventoryExtra = {
          unit: baseUnit,
          onHandByUnit: { [parentBaseUnit]: qtyNum },
          lastNote: `[compose-set] ${noteSuffix}`,
          lastUpdatedBy: actorId,
        };
        await store.createSafely({
          patch: {
            itemCode: setProduct.code,
            locationCode: target,
            onHand: qtyNum,
            extra,
          },
        });

        logActivity('productInventory.create', setProduct.id, {
          locationCode: target,
          onHand: qtyNum,
          via: 'compose-set',
          ...attributionMemo,
        });
        written += 1;
      }

      notifications.show({
        color: 'green',
        message: t('productInventory.composeSet.success', {
          qty: qtyNum.toLocaleString(),
          code: setProduct.code,
        }),
      });
      handleClose();

      void rebalanceForSetStockChange([setProduct.code], 'compose');
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
          title: t('productInventory.composeSet.partialFailureTitle'),
          message: t('productInventory.composeSet.partialFailureMessage', {
            written,
            error: err instanceof Error ? err.message : String(err),
          }),
          autoClose: 10000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    setProduct,
    parentRow,
    parentBaseUnit,
    qtyNum,
    target,
    componentPlans,
    customer,
    selectedSalesOrder,
    handleClose,
    t,
  ]);

  const newParentOnHand =
    parentRow && setProduct && qtyNum > 0
      ? (() => {
          const baseUnit = getItemBaseUnit(setProduct);
          const breakdown = readRowBreakdown(parentRow, baseUnit);
          const r = applyDelta(setProduct, breakdown, { [parentBaseUnit]: qtyNum });
          return r.ok ? r.onHand : null;
        })()
      : null;

  return (
    <ResponsiveModal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={6}>
          <IconBoxMultiple size={16} color={`var(--mantine-color-${PRODUCT_SET_COLOR}-6)`} />
          <Text fw={600}>{t('productInventory.composeSet.title')}</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('productInventory.composeSet.description')}
        </Text>

        <Group grow align="flex-start">
          <Select
            label={t('productInventory.composeSet.setLabel')}
            placeholder={t('productInventory.composeSet.setPlaceholder')}
            data={setProductOptions}
            value={setCode}
            onChange={handleSetChange}
            searchable
            disabled={submitting}
          />
          {locationsEnabled && (
            <Select
              label={t('productInventory.composeSet.locationLabel')}
              placeholder={t('productInventory.composeSet.locationPlaceholder')}
              data={locationOptions}
              value={locationCode}
              onChange={setLocationCode}
              searchable
              disabled={submitting}
            />
          )}
          <NumberInput
            label={t('productInventory.composeSet.quantityLabel')}
            placeholder="1"
            value={quantity}
            onChange={(v) => setQuantity(typeof v === 'number' ? v : Number(v) || '')}
            min={1}
            disabled={submitting}
          />
        </Group>

        {/* Optional attribution — customer + one of their open sales orders.
            Recorded on the activity log only; never gates the compose. */}
        <Group grow align="flex-start">
          <CustomerSelector
            label={t('productInventory.composeSet.customerLabel')}
            placeholder={t('productInventory.composeSet.customerPlaceholder')}
            clearable
            filter={customerFilter}
            value={customer?.id ?? null}
            onChange={handleCustomerChange}
            disabled={submitting || !setProduct}
          />
          <Select
            label={t('productInventory.composeSet.salesOrderLabel')}
            placeholder={t('productInventory.composeSet.salesOrderPlaceholder')}
            data={salesOrderOptions}
            value={salesOrderId}
            onChange={setSalesOrderId}
            clearable
            searchable
            disabled={submitting || !customer}
            nothingFoundMessage={t('productInventory.composeSet.salesOrderEmpty')}
          />
        </Group>

        {soNeeded && (
          <Text size="xs" c="dimmed" mt={-8}>
            {t('productInventory.composeSet.soNeeded', {
              qty: soNeeded.qty.toLocaleString(),
              unit: lookupLabelOf(unitLabels, soNeeded.unit),
            })}
          </Text>
        )}

        {setProduct && qtyNum > 0 && (
          <>
            <Card
              withBorder
              padding="sm"
              radius="md"
              bg={`var(--mantine-color-${PRODUCT_SET_COLOR}-0)`}
            >
              <Stack gap={4}>
                <Group justify="space-between">
                  <Group gap={6}>
                    <IconBoxMultiple
                      size={14}
                      color={`var(--mantine-color-${PRODUCT_SET_COLOR}-6)`}
                    />
                    <Text size="sm" fw={600}>
                      {setProduct.extra?.sku ?? setProduct.code} — {setProduct.name}
                    </Text>
                    <Badge size="xs" color={PRODUCT_SET_COLOR} variant="light" radius="sm">
                      {t('salesOrders.form.setParentBadge')}
                    </Badge>
                  </Group>
                  {parentRow ? (
                    <Text size="sm" ff="monospace">
                      {parentRow.onHand.toLocaleString()} →{' '}
                      <Text span fw={700}>
                        {newParentOnHand?.toLocaleString() ?? '?'}
                      </Text>{' '}
                      {lookupLabelOf(unitLabels, parentBaseUnit)}
                    </Text>
                  ) : (
                    <Group gap={6} wrap="nowrap">
                      <Badge color="teal" variant="light" size="xs" radius="sm">
                        {t('productInventory.composeSet.parentWillCreate')}
                      </Badge>
                      <Text size="sm" ff="monospace">
                        0 →{' '}
                        <Text span fw={700}>
                          {qtyNum.toLocaleString()}
                        </Text>{' '}
                        {lookupLabelOf(unitLabels, parentBaseUnit)}
                      </Text>
                    </Group>
                  )}
                </Group>
              </Stack>
            </Card>

            <Table withTableBorder striped fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('productInventory.composeSet.componentCol')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }} w={140}>
                    {t('productInventory.composeSet.requiredCol')}
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }} w={140}>
                    {t('productInventory.composeSet.currentCol')}
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right' }} w={140}>
                    {t('productInventory.composeSet.resultCol')}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {componentPlans.map((c) => {
                  const result = c.currentQtyInUnit - c.requiredQty;
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
                        <Text size="sm" ff="monospace">
                          {c.requiredQty.toLocaleString()}{' '}
                          {lookupLabelOf(unitLabels, c.requiredUnit)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" ff="monospace">
                          {c.currentQtyInUnit.toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} wrap="nowrap" justify="flex-end">
                          <Text
                            size="sm"
                            ff="monospace"
                            fw={c.shortage > 0 ? 600 : 400}
                            c={c.shortage > 0 ? 'red' : undefined}
                          >
                            {result.toLocaleString()}
                          </Text>
                          {c.shortage > 0 && (
                            <Badge size="xs" color="red" variant="light" radius="sm">
                              {t('productInventory.composeSet.shortBadge', {
                                short: c.shortage.toLocaleString(),
                              })}
                            </Badge>
                          )}
                        </Group>
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
            title={t('productInventory.composeSet.blockedTitle')}
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
            color={PRODUCT_SET_COLOR}
            onClick={handleCompose}
            disabled={!canCompose}
            loading={submitting}
          >
            {t('productInventory.composeSet.submit', {
              qty: qtyNum > 0 ? qtyNum.toLocaleString() : '',
            })}
          </Button>
        </Group>
      </Stack>
    </ResponsiveModal>
  );
}
