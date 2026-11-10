import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  FileButton,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { appConfig } from '@/config';
import { DEFAULT_PURCHASE_ORDER_LEAD_TIMES } from '@/config/schema';
import { DateField } from '@/components/DateField';
import { isoToVnDateString, todayInVnDateString, vnDateStringToIso } from '@/utils/dateTimeField';
import { formatDate } from '@/utils/dateFormat';
import { featureFlags } from '@/utils/features';
import { addDaysToDay, followDeadline } from '@/utils/paymentTerms';
import { useForm, type FormValidateInput, type UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCopy,
  IconDownload,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { purchaseOrderBundle, usePurchaseOrderStore } from '@/stores/usePurchaseOrderStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductStore } from '@/stores/useProductStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device, logger } from '@credo/base-ui/utils';
import { lookupLabelOf, useInitFormFromFetch, useLookupV2Labels } from '@/hooks';
import {
  getPurchaseOrderPicDepartments,
  hasImagesForProducts,
  isLocationsEnabled,
  isPricingManagementEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import { isNoInventoryProduct } from '@/utils/productSet';
import { ProductPhotoModal } from '@/pages/sales-orders/ProductPhotoModal';
import { packageCountOf } from '@/pages/goods-receipts/goodsReceiptPackageCount';
import {
  CustomerSelector,
  EmployeeSelector,
  ProductSelector,
  VendorSelector,
} from '@/components/selectors';
import { DEFAULT_LOCATION_CODE } from '@/types';
import type {
  Product,
  PurchaseOrder,
  PurchaseOrderCopyFrom,
  PurchaseOrderCurrency,
  PurchaseOrderItem,
} from '@/types';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { NumberField } from '@/components/NumberField';
import { Form } from '@/components/Form';
import {
  ExcelParseError,
  generatePurchaseOrderItemsTemplate,
  parsePurchaseOrderItemsExcelFile,
} from '@/utils/excelParser';
import {
  asLeadTime,
  formatMoney,
  leadTimeLabel,
  leadTimeTag,
  currencyDecimals,
  lineTax,
  lineTotal,
  orderSubtotal,
  orderTax,
  orderTotal,
  roundMoney,
  poCurrency,
  parseLeadTimeTag,
  poCustomer,
  poItems,
  poLeadTime,
  poOrderDay,
  proposePurchaseOrderDeadline,
  unitPriceDecimals,
} from './purchaseOrderModel';
import { savePurchaseOrder } from './savePurchaseOrder';

const isMobile = device.isMobile;
const locationsEnabled = isLocationsEnabled();
const picEmployeeFilter = makeEmployeeDepartmentFilter(getPurchaseOrderPicDepartments());
const pricingOn = isPricingManagementEnabled();

const showPrice = pricingOn && perms.purchaseOrder.canViewPrice();
const formClosedForViewer = pricingOn && !showPrice;

const isOrderableProduct = (p: Product) => !p.extra?.isDeleted && !isNoInventoryProduct(p);

type ItemFormValues = {
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;

  packageCount: number | undefined;
  unitPrice: number | undefined;

  taxAmount: number | undefined;
  note: string;
};

type FormValues = {
  orderNumber: string;
  vendorCode: string;
  vendorName: string;

  customerCode: string;
  customerName: string;
  locationCode: string;
  locationName: string;
  currency: PurchaseOrderCurrency;

  orderDate: string | null;

  leadTime: string | null;
  paymentDeadline: string | null;
  reference: string;
  notes: string;
  assignedTo: string;
  items: ItemFormValues[];
};

const emptyItem: ItemFormValues = {
  itemCode: '',
  itemName: '',
  quantity: 1,
  unit: '',
  packageCount: undefined,
  unitPrice: undefined,
  taxAmount: undefined,
  note: '',
};

function isEmptyRow(row: ItemFormValues): boolean {
  return (
    !row.itemCode &&
    !row.itemName &&
    !row.note &&
    row.packageCount === undefined &&
    row.unitPrice === undefined &&
    row.taxAmount === undefined &&
    row.quantity === emptyItem.quantity &&
    row.unit === emptyItem.unit
  );
}

type ItemRowProps = ItemFormValues & {
  idx: number;
  currency: PurchaseOrderCurrency;
  itemUnits: readonly string[] | undefined;
  unitLabels: Map<string, string>;
  itemCodeError: ReactNode;

  showPhotoButton: boolean;
  hasPhoto: boolean;
  onShowPhotos: (code: string, name: string) => void;
  removable: boolean;
  setFieldValue: UseFormReturnType<FormValues>['setFieldValue'];
  removeListItem: UseFormReturnType<FormValues>['removeListItem'];
};

const ItemRow = memo(function ItemRow({
  idx,
  currency,
  itemCode,
  itemName,
  quantity,
  unit,
  packageCount,
  unitPrice,
  taxAmount,
  note,
  itemUnits,
  unitLabels,
  itemCodeError,
  showPhotoButton,
  hasPhoto,
  onShowPhotos,
  removable,
  setFieldValue,
  removeListItem,
}: ItemRowProps) {
  const { t } = useTranslation();
  const unitOptions = Array.from(new Set([...(itemUnits ?? []), ...(unit ? [unit] : [])])).map(
    (u) => ({ value: u, label: lookupLabelOf(unitLabels, u) }),
  );
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {idx + 1}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap" align="flex-start">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <ProductSelector
              size="xs"
              placeholder={t('common.labels.name')}
              code={itemCode || null}
              name={itemName || null}
              filter={isOrderableProduct}
              error={itemCodeError}
              onChange={(opt) => {
                if (!opt) {
                  setFieldValue(`items.${idx}.itemCode`, '');
                  setFieldValue(`items.${idx}.itemName`, '');
                  return;
                }
                setFieldValue(`items.${idx}.itemCode`, opt.code);
                setFieldValue(`items.${idx}.itemName`, opt.name);
                setFieldValue(`items.${idx}.unit`, opt.units[0] ?? '');
              }}
            />
          </Box>
          {/* Verify the picked goods: the sales order's photo button. Dimmed when the
              product has no photo, so the row says whether a reference shot exists. */}
          {showPhotoButton && itemCode && (
            <Tooltip
              label={
                hasPhoto
                  ? t('salesOrders.detail.tabProductPhotos')
                  : t('products.detail.noPhotoHint')
              }
              withArrow
            >
              <ActionIcon
                variant="subtle"
                size="sm"
                mt={4}
                aria-label={t('salesOrders.detail.viewProductPhotos')}
                disabled={!hasPhoto}
                onClick={() => onShowPhotos(itemCode, itemName)}
              >
                <IconPhoto size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <NumberField
          size="xs"
          min={0}
          value={quantity}
          emptyValue={0}
          onChange={(next) => setFieldValue(`items.${idx}.quantity`, next)}
        />
      </Table.Td>
      <Table.Td>
        <Select
          size="xs"
          placeholder={t('common.labels.unit')}
          data={unitOptions}
          value={unit || null}
          onChange={(v) => setFieldValue(`items.${idx}.unit`, v ?? '')}
          disabled={unitOptions.length === 0}
          allowDeselect={false}
        />
      </Table.Td>
      <Table.Td>
        <NumberField
          size="xs"
          min={0}
          allowDecimal={false}
          value={packageCount}
          onChange={(next) => setFieldValue(`items.${idx}.packageCount`, next)}
        />
      </Table.Td>
      {showPrice && (
        <>
          <Table.Td>
            <NumberField
              size="xs"
              min={0}
              decimalScale={unitPriceDecimals(currency)}
              value={unitPrice}
              onChange={(next) => setFieldValue(`items.${idx}.unitPrice`, next)}
            />
          </Table.Td>
          <Table.Td>
            <NumberField
              size="xs"
              min={0}
              decimalScale={currencyDecimals(currency)}
              value={taxAmount}
              onChange={(next) => setFieldValue(`items.${idx}.taxAmount`, next)}
            />
          </Table.Td>
          <Table.Td>
            <Text size="sm" ta="right">
              {unitPrice === undefined
                ? '—'
                : formatMoney(lineTotal({ quantity, unitPrice, taxAmount }, currency), currency)}
            </Text>
          </Table.Td>
        </>
      )}
      <Table.Td>
        <TextInput
          size="xs"
          placeholder={t('__new__.01-common.labels.note')}
          value={note}
          onChange={(e) => setFieldValue(`items.${idx}.note`, e.currentTarget.value)}
        />
      </Table.Td>
      <Table.Td>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          onClick={() => removeListItem('items', idx)}
          disabled={!removable}
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );
});

export function PurchaseOrderFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isEdit = !!id;

  const copyFrom = !isEdit
    ? (location.state as { copyFrom?: PurchaseOrderCopyFrom } | null)?.copyFrom
    : undefined;
  const invalidateCache = usePurchaseOrderStore((s) => s.invalidate);
  const snapshotRef = useRef<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const unitLabels = useLookupV2Labels('product-unit');

  useEffect(() => {
    if (!isMobile && !formClosedForViewer) return;
    notifications.show({
      color: 'yellow',
      message: formClosedForViewer
        ? t('purchaseOrders.notifications.noPriceAccess')
        : t('purchaseOrders.notifications.mobileFormBlocked'),
      autoClose: 4000,
    });
    navigate(
      isEdit && id ? ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', id) : ROUTES.PURCHASE_ORDERS.LIST,
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocked = isMobile || formClosedForViewer;

  const {
    items: locations,
    initialized: locationsInitialized,
    loadAll: loadLocations,
  } = useLocationStore();
  const {
    items: products,
    initialized: productsInitialized,
    loadAll: loadProducts,
  } = useProductStore();
  const vendorsInitialized = useVendorStore((s) => s.initialized);
  const vendorItems = useVendorStore((s) => s.items);
  const loadVendors = useVendorStore((s) => s.loadAll);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const getCustomerByCode = useCustomerStore((s) => s.getByCode);

  useEffect(() => {
    if (blocked) return;
    if (!vendorsInitialized) loadVendors();
    if (!customersInitialized) loadCustomers();

    if (!locationsInitialized) loadLocations();
    if (!productsInitialized) loadProducts();
  }, [
    blocked,
    vendorsInitialized,
    customersInitialized,
    loadCustomers,
    locationsInitialized,
    productsInitialized,
    loadVendors,
    loadLocations,
    loadProducts,
  ]);

  const currentEmployeeId = useMyEmployee()?.id ?? '';

  const locationSelectData = useMemo(
    () => locations.map((l) => ({ value: l.code, label: `${l.code} — ${l.name}`, name: l.name })),
    [locations],
  );
  const locationMap = useMemo(() => {
    const m = new Map<string, (typeof locationSelectData)[number]>();
    for (const l of locationSelectData) m.set(l.value, l);
    return m;
  }, [locationSelectData]);

  const [photoProduct, setPhotoProduct] = useState<{ code: string; name: string } | null>(null);
  const showPhotos = useCallback(
    (code: string, name: string) => setPhotoProduct({ code, name }),
    [],
  );

  const productImagesEnabled = hasImagesForProducts();
  const codesWithPhoto = useMemo(() => {
    const s = new Set<string>();
    for (const p of products) if ((p.extra?.images?.length ?? 0) > 0) s.add(p.code);
    return s;
  }, [products]);

  const productUnitsByCode = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of products) {
      m.set(p.code, p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : []);
    }
    return m;
  }, [products]);

  const validate = useMemo<FormValidateInput<FormValues>>(
    () => ({
      vendorCode: (v) => (!v ? t('purchaseOrders.validation.vendorRequired') : null),
      orderDate: (v) => (!v ? t('purchaseOrders.validation.orderDateRequired') : null),
      ...(locationsEnabled && {
        locationCode: (v: string) => (!v ? t('purchaseOrders.validation.locationRequired') : null),
      }),
      items: {
        itemCode: (v, vals, path) => {
          const m = path.match(/^items\.(\d+)\./);
          if (!m) return null;
          const idx = Number(m[1]);
          const row = vals.items[idx];
          if (!row || isEmptyRow(row)) return null;
          const code = v.trim();
          if (!code) return null;
          const unit = row.unit.trim();
          const dup = vals.items.some(
            (other, i) =>
              i !== idx &&
              !isEmptyRow(other) &&
              other.itemCode.trim() === code &&
              other.unit.trim() === unit,
          );
          return dup ? t('purchaseOrders.validation.itemCodeUnitDuplicate') : null;
        },
      },
    }),
    [t],
  );

  const form = useForm<FormValues>({
    initialValues: {
      orderNumber: '',
      vendorCode: '',
      vendorName: '',
      customerCode: '',
      customerName: '',
      locationCode: locationsEnabled ? '' : DEFAULT_LOCATION_CODE,
      locationName: '',
      currency: 'VND',
      orderDate: todayInVnDateString(),
      leadTime: null,
      paymentDeadline: null,
      reference: '',
      notes: '',
      assignedTo: currentEmployeeId,
      items: [{ ...emptyItem }],
    },
    validate,
  });

  const fetching = useInitFormFromFetch(
    form,
    blocked ? undefined : id,
    async (id) => {
      const { item: r } = await purchaseOrderBundle.fetchById(id);
      snapshotRef.current = r;

      if (r.status !== 'draft') {
        navigate(ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', id), { replace: true });
        return null;
      }
      return {
        orderNumber: r.orderNumber,
        vendorCode: r.vendorCode ?? '',
        vendorName: r.vendorName ?? '',
        customerCode: poCustomer(r)?.code ?? '',
        customerName: poCustomer(r)?.name ?? '',
        locationCode: r.locationCode ?? '',
        locationName: r.locationName ?? '',
        currency: poCurrency(r),
        orderDate: poOrderDay(r) || todayInVnDateString(),
        leadTime: poLeadTime(r) ? leadTimeTag(poLeadTime(r)!) : null,
        paymentDeadline: isoToVnDateString(r.paymentDeadline) || null,
        reference: r.reference || '',
        notes: r.notes || '',
        assignedTo: r.extra?.assignedTo ?? '',
        items: poItems(r).length
          ? poItems(r).map((item) => ({
              itemCode: item.itemCode,
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              packageCount: packageCountOf(item) ?? undefined,
              unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
              taxAmount:
                showPrice && lineTax(item, poCurrency(r)) > 0
                  ? lineTax(item, poCurrency(r))
                  : undefined,
              note: item.note ?? '',
            }))
          : [{ ...emptyItem }],
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('purchaseOrders.notifications.fetchError') });
      navigate(ROUTES.PURCHASE_ORDERS.LIST);
    },
  );

  const lastDeadlineProposalRef = useRef('');
  const vendorCodeNow = form.values.vendorCode;
  const deadlineNow = form.values.paymentDeadline;
  const orderDateNow = form.values.orderDate;
  useEffect(() => {
    if (!featureFlags.paymentTerms.enabled || blocked || fetching) return;
    if (isEdit && !snapshotRef.current) return;
    const orderDay = orderDateNow ?? '';
    if (!orderDay) return;
    const vendor = vendorItems.find((v) => v.code === vendorCodeNow);
    const proposal = proposePurchaseOrderDeadline(
      orderDay,
      vendor?.extra,
      featureFlags.paymentTerms.defaultDays,
    );
    const step = followDeadline(deadlineNow, lastDeadlineProposalRef.current, proposal);
    lastDeadlineProposalRef.current = step.last;
    if (step.value !== (deadlineNow ?? '')) form.setFieldValue('paymentDeadline', step.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, fetching, isEdit, vendorItems, vendorCodeNow, deadlineNow, orderDateNow]);

  useEffect(() => {
    if (isEdit || !currentEmployeeId || form.getValues().assignedTo) return;
    form.setFieldValue('assignedTo', currentEmployeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployeeId, isEdit]);

  useEffect(() => {
    if (!copyFrom) return;
    form.setValues({
      orderNumber: '',
      vendorCode: copyFrom.vendorCode,
      vendorName: copyFrom.vendorName,
      customerCode: copyFrom.customerCode ?? '',
      customerName: copyFrom.customerName ?? '',
      locationCode: copyFrom.locationCode,
      locationName: copyFrom.locationName,
      currency: copyFrom.currency,
      orderDate: todayInVnDateString(),
      leadTime: asLeadTime(copyFrom.leadTime) ? leadTimeTag(copyFrom.leadTime!) : null,
      paymentDeadline: null,
      reference: copyFrom.reference,
      notes: copyFrom.notes,
      assignedTo: copyFrom.assignedTo ?? currentEmployeeId,
      items:
        copyFrom.items.length > 0
          ? copyFrom.items.map((item) => ({
              itemCode: item.itemCode,
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              packageCount: packageCountOf(item) ?? undefined,
              unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
              taxAmount:
                showPrice && lineTax(item, copyFrom.currency) > 0
                  ? lineTax(item, copyFrom.currency)
                  : undefined,
              note: item.note ?? '',
            }))
          : [{ ...emptyItem }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyFrom]);

  const handleLocationSelect = useCallback(
    (code: string | null) => {
      form.setFieldValue('locationCode', code ?? '');
      form.setFieldValue('locationName', code ? (locationMap.get(code)?.name ?? '') : '');
    },

    [locationMap],
  );

  const handleDownloadTemplate = useCallback(() => {
    const sampleItems: Array<{ sku: string; unit: string; name: string }> = [];
    for (const p of products) {
      if (sampleItems.length >= 3) break;
      const sku = p.extra?.sku?.trim();
      if (!sku) continue;
      sampleItems.push({ sku, unit: p.extra?.units?.[0] || p.unit || '', name: p.name });
    }
    generatePurchaseOrderItemsTemplate({
      language: i18n.language,
      sampleItems,
      withPrice: showPrice,
    });
  }, [products, i18n.language]);

  const handleImportItems = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const rows = await parsePurchaseOrderItemsExcelFile(file);
        if (rows.length === 0) {
          notifications.show({
            color: 'yellow',
            message: t('purchaseOrders.notifications.importEmpty'),
          });
          return;
        }
        const skuMap = new Map<string, { code: string; name: string; units: string[] }>();
        for (const p of products) {
          if (!isOrderableProduct(p)) continue;
          const sku = p.extra?.sku?.trim();
          if (!sku) continue;
          skuMap.set(sku.toLowerCase(), {
            code: p.code,
            name: p.name,
            units: p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : [],
          });
        }
        const matched: ItemFormValues[] = [];
        const unmatched: string[] = [];
        for (const row of rows) {
          const hit = skuMap.get(row.sku.toLowerCase());
          if (!hit) {
            unmatched.push(row.sku);
            continue;
          }
          const typed = row.unit?.toLowerCase();
          const unit =
            (typed && hit.units.find((u) => u.toLowerCase() === typed)) ?? hit.units[0] ?? '';
          matched.push({
            itemCode: hit.code,
            itemName: hit.name,
            quantity: row.quantity,
            unit,
            packageCount: undefined,
            unitPrice: showPrice ? row.unitPrice : undefined,
            taxAmount: showPrice ? row.taxAmount : undefined,
            note: row.memo ?? '',
          });
        }
        if (matched.length === 0) {
          notifications.show({
            color: 'red',
            title: t('purchaseOrders.notifications.importNoMatchTitle'),
            message: t('purchaseOrders.notifications.importUnmatched', {
              count: unmatched.length,
              skus: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
          return;
        }
        const current = form.getValues().items;
        form.setFieldValue('items', current.every(isEmptyRow) ? matched : [...current, ...matched]);
        if (unmatched.length > 0) {
          notifications.show({
            color: 'yellow',
            title: t('purchaseOrders.notifications.importPartialTitle', { added: matched.length }),
            message: t('purchaseOrders.notifications.importUnmatched', {
              count: unmatched.length,
              skus: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('purchaseOrders.notifications.importSuccess', { count: matched.length }),
          });
        }
      } catch (err) {
        if (err instanceof ExcelParseError) {
          notifications.show({
            color: 'red',
            title: t('purchaseOrders.notifications.importMissingColumnTitle'),
            message: t('purchaseOrders.notifications.importMissingColumn', {
              columns: err.missing.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          logger.error('Excel import failed:', err);
          notifications.show({
            color: 'red',
            message: t('purchaseOrders.notifications.importError'),
          });
        }
      }
    },

    [products, t],
  );

  const handleCurrencyChange = (next: PurchaseOrderCurrency) => {
    form.setFieldValue('currency', next);
    const f = 10 ** unitPriceDecimals(next);
    form.getValues().items.forEach((row, idx) => {
      if (row.unitPrice !== undefined) {
        form.setFieldValue(`items.${idx}.unitPrice`, Math.round(row.unitPrice * f) / f);
      }
      if (row.taxAmount !== undefined) {
        form.setFieldValue(`items.${idx}.taxAmount`, roundMoney(row.taxAmount, next));
      }
    });
  };

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const rows = values.items.filter((r) => !isEmptyRow(r));
      if (rows.length === 0) {
        notifications.show({ color: 'red', message: t('purchaseOrders.validation.itemsRequired') });
        return;
      }
      let locationCode = values.locationCode.trim();
      let locationName = values.locationName.trim();
      if (!locationsEnabled) {
        const defaultRow = locations.find((l) => l.code === DEFAULT_LOCATION_CODE);
        if (!defaultRow) {
          notifications.show({
            color: 'red',
            message: t('purchaseOrders.notifications.defaultLocationMissing'),
          });
          return;
        }
        locationCode = DEFAULT_LOCATION_CODE;
        locationName = defaultRow.name;
      }

      setLoading(true);
      const items: PurchaseOrderItem[] = rows.map((item) => {
        const packageCount = packageCountOf(item);
        return {
          itemType: 'product',
          itemCode: item.itemCode.trim(),
          itemName: item.itemName.trim(),
          quantity: item.quantity,
          unit: item.unit.trim(),
          ...(item.note.trim() ? { note: item.note.trim() } : {}),
          ...(packageCount !== null ? { packageCount } : {}),
          ...(showPrice && item.unitPrice !== undefined ? { unitPrice: item.unitPrice } : {}),
          ...(showPrice && item.taxAmount !== undefined && item.taxAmount > 0
            ? { taxAmount: roundMoney(item.taxAmount, values.currency) }
            : {}),
        };
      });

      const orderDate = vnDateStringToIso(values.orderDate);
      const leadTime = values.leadTime ? parseLeadTimeTag(values.leadTime) : null;
      const paymentDeadline = values.paymentDeadline
        ? vnDateStringToIso(values.paymentDeadline)
        : undefined;

      try {
        const saved = await savePurchaseOrder({
          id,
          snapshot: snapshotRef.current,
          invalidate: invalidateCache,
          copyFromId: copyFrom?.sourceId,
          write: {
            vendorCode: values.vendorCode.trim(),
            vendorName: values.vendorName.trim(),

            customerCode: values.customerCode.trim(),
            customerName: values.customerName.trim(),
            locationCode,
            locationName,
            reference: values.reference.trim(),
            notes: values.notes.trim(),
            currency: values.currency,
            items,
            orderDate,
            leadTime,
            ...(paymentDeadline ? { paymentDeadline } : {}),
            ...(values.assignedTo.trim() ? { assignedTo: values.assignedTo.trim() } : {}),
          },
        });
        notifications.show({
          color: 'green',
          message: isEdit
            ? t('purchaseOrders.notifications.updateSuccess')
            : t('purchaseOrders.notifications.createSuccess'),
        });
        navigate(ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', saved.id));
      } catch (err) {
        logger.error('Purchase order submit failed:', err);
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as PurchaseOrder;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('purchaseOrders.notifications.updateError')
              : t('purchaseOrders.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, locations, t, navigate, invalidateCache, copyFrom],
  );

  if (fetching) return null;
  if (blocked) return null;

  const values = form.getValues();
  const pageTitle = isEdit ? t('purchaseOrders.editItem') : t('purchaseOrders.addItem');

  const leadTimeOptions = (() => {
    const tags = (
      appConfig.features.purchaseOrders.leadTimes ?? DEFAULT_PURCHASE_ORDER_LEAD_TIMES
    ).map(leadTimeTag);
    if (values.leadTime && !tags.includes(values.leadTime)) tags.push(values.leadTime);
    return tags.flatMap((tag) => {
      const lt = parseLeadTimeTag(tag);
      return lt
        ? [
            {
              value: tag,
              label: leadTimeLabel(lt, (min, max) =>
                t('purchaseOrders.leadTime.range', { min, max }),
              ),
            },
          ]
        : [];
    });
  })();
  const pickedLeadTime = values.leadTime ? parseLeadTimeTag(values.leadTime) : null;
  const plannedDay =
    pickedLeadTime && values.orderDate
      ? addDaysToDay(values.orderDate, pickedLeadTime.maxDays)
      : '';
  const plannedArrivalText = plannedDay ? formatDate(vnDateStringToIso(plannedDay)) : '—';
  const priced = {
    currency: values.currency,
    items: values.items.map((r) => ({
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      taxAmount: r.taxAmount,
    })),
  };
  const subtotal = orderSubtotal(priced);
  const tax = orderTax(priced);
  const total = orderTotal(priced);

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <Button
          onClick={() => window.history.back()}
          variant="subtle"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('common.actions.back')}
        </Button>
      </Group>

      <Title order={3}>{pageTitle}</Title>

      {copyFrom && (
        <Alert icon={<IconCopy size={16} />} color="blue" variant="light" radius="md" py="xs">
          {t('purchaseOrders.form.copyingFrom', { orderNumber: copyFrom.sourceOrderNumber })}
        </Alert>
      )}

      <Card withBorder radius="md" p="xl">
        <Form
          form={form}
          onSubmit={handleSubmit}
          onError={() => {
            notifications.show({ color: 'red', message: t('common.validation.formInvalid') });
          }}
        >
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('purchaseOrders.form.orderNumberLabel')}
                placeholder={t('purchaseOrders.form.orderNumberAutoPlaceholder')}
                disabled
                {...form.getInputProps('orderNumber')}
              />
              <Select
                label={t('purchaseOrders.form.currencyLabel')}
                withAsterisk
                allowDeselect={false}
                data={[
                  { value: 'VND', label: 'VND' },
                  { value: 'CNY', label: 'CNY' },
                ]}
                value={values.currency}
                onChange={(v) => handleCurrencyChange(v === 'CNY' ? 'CNY' : 'VND')}
              />
              <VendorSelector
                label={t('common.labels.vendor')}
                placeholder={t('purchaseOrders.form.vendorPlaceholder')}
                withAsterisk
                value={values.vendorCode || null}
                onChange={(v) => {
                  form.setFieldValue('vendorCode', v?.code ?? '');
                  form.setFieldValue('vendorName', v?.name ?? '');
                }}
                error={form.errors.vendorCode}
              />
              <CustomerSelector
                label={t('purchaseOrders.form.customerLabel')}
                placeholder={t('purchaseOrders.form.customerPlaceholder')}
                clearable

                value={
                  values.customerCode ? (getCustomerByCode(values.customerCode)?.id ?? null) : null
                }
                onChange={(sel) => {
                  form.setFieldValue('customerCode', sel?.customer.code ?? '');
                  form.setFieldValue('customerName', sel?.name ?? '');
                }}
              />
              {locationsEnabled && (
                <Select
                  label={t('purchaseOrders.form.locationLabel')}
                  placeholder={t('purchaseOrders.form.locationPlaceholder')}
                  data={locationSelectData}
                  searchable
                  withAsterisk
                  value={values.locationCode || null}
                  onChange={handleLocationSelect}
                  error={form.errors.locationCode}
                />
              )}
              <DateField
                label={t('purchaseOrders.form.orderDateLabel')}
                withAsterisk
                clearable={false}
                {...form.getInputProps('orderDate')}
              />
              <Stack gap={4}>
                <Select
                  label={t('purchaseOrders.form.leadTimeLabel')}
                  placeholder={t('purchaseOrders.form.leadTimePlaceholder')}
                  data={leadTimeOptions}
                  clearable
                  value={values.leadTime}
                  onChange={(v) => form.setFieldValue('leadTime', v)}
                />
                <Text size="xs" c="dimmed" data-testid="planned-arrival">
                  {t('purchaseOrders.form.plannedArrivalLabel')}: {plannedArrivalText}
                </Text>
              </Stack>
              <DateField
                label={t('purchaseOrders.form.paymentDeadlineLabel')}
                {...form.getInputProps('paymentDeadline')}
              />
              <TextInput
                label={t('purchaseOrders.form.referenceLabel')}
                placeholder={t('purchaseOrders.form.referencePlaceholder')}
                {...form.getInputProps('reference')}
              />
              <EmployeeSelector
                label={t('common.labels.assignedTo')}
                placeholder={t('purchaseOrders.form.assignedToPlaceholder')}
                clearable
                filter={picEmployeeFilter}
                value={values.assignedTo || null}
                onChange={(v) => form.setFieldValue('assignedTo', v?.id ?? '')}
              />
            </SimpleGrid>

            <Textarea
              label={t('__new__.01-common.labels.note')}
              placeholder={t('purchaseOrders.form.notesPlaceholder')}
              autosize
              minRows={2}
              {...form.getInputProps('notes')}
            />

            <Stack gap="xs">
              <Group justify="space-between" align="center" wrap="wrap">
                <Title order={6}>{t('purchaseOrders.form.itemsTitle')}</Title>
                <Group gap="xs" wrap="wrap">
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconDownload size={14} />}
                    onClick={handleDownloadTemplate}
                  >
                    {t('purchaseOrders.form.downloadTemplateButton')}
                  </Button>
                  <FileButton onChange={handleImportItems} accept=".xlsx,.xls,.csv">
                    {(props) => (
                      <Button
                        {...props}
                        variant="light"
                        size="compact-sm"
                        leftSection={<IconUpload size={14} />}
                      >
                        {t('purchaseOrders.form.importItemsButton')}
                      </Button>
                    )}
                  </FileButton>
                  <Button
                    variant="light"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => form.insertListItem('items', { ...emptyItem })}
                  >
                    {t('common.actions.addEntry')}
                  </Button>
                </Group>
              </Group>

              <Box style={{ overflowX: 'auto' }}>
                <Table withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>#</Table.Th>
                      <Table.Th>{t('common.labels.name')}</Table.Th>
                      <Table.Th w={110}>{t('common.labels.quantity')}</Table.Th>
                      <Table.Th w={120}>{t('common.labels.unit')}</Table.Th>
                      <Table.Th w={100}>{t('purchaseOrders.columns.packageCount')}</Table.Th>
                      {showPrice && (
                        <>
                          <Table.Th w={140}>{t('purchaseOrders.columns.unitPrice')}</Table.Th>
                          <Table.Th w={130}>{t('purchaseOrders.columns.tax')}</Table.Th>
                          <Table.Th w={150} ta="right">
                            {t('purchaseOrders.columns.amount')}
                          </Table.Th>
                        </>
                      )}
                      <Table.Th>{t('__new__.01-common.labels.note')}</Table.Th>
                      <Table.Th w={48} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {values.items.map((row, idx, items) => (
                      <ItemRow
                        key={idx}
                        idx={idx}
                        currency={values.currency}
                        itemCode={row.itemCode}
                        itemName={row.itemName}
                        quantity={row.quantity}
                        unit={row.unit}
                        packageCount={row.packageCount}
                        unitPrice={row.unitPrice}
                        taxAmount={row.taxAmount}
                        note={row.note}
                        itemUnits={row.itemCode ? productUnitsByCode.get(row.itemCode) : undefined}
                        unitLabels={unitLabels}
                        itemCodeError={form.errors[`items.${idx}.itemCode`]}
                        showPhotoButton={productImagesEnabled}
                        hasPhoto={codesWithPhoto.has(row.itemCode)}
                        onShowPhotos={showPhotos}
                        removable={items.length > 1}
                        setFieldValue={form.setFieldValue}
                        removeListItem={form.removeListItem}
                      />
                    ))}
                  </Table.Tbody>
                  {showPrice && (
                    <Table.Tfoot>
                      <Table.Tr>
                        <Table.Td colSpan={7} ta="right">
                          <Text size="sm" fw={600}>
                            {t('purchaseOrders.columns.subtotal')}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right" data-testid="po-subtotal">
                          <Text size="sm">{formatMoney(subtotal, values.currency)}</Text>
                        </Table.Td>
                        <Table.Td colSpan={2} />
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td colSpan={7} ta="right">
                          <Text size="sm" fw={600}>
                            {t('purchaseOrders.columns.tax')}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right" data-testid="po-tax">
                          <Text size="sm">{formatMoney(tax, values.currency)}</Text>
                        </Table.Td>
                        <Table.Td colSpan={2} />
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Th colSpan={7} ta="right">
                          {t('purchaseOrders.form.totalLabel', { currency: values.currency })}
                        </Table.Th>
                        <Table.Th ta="right" data-testid="po-total">
                          {formatMoney(total, values.currency)}
                        </Table.Th>
                        <Table.Th colSpan={2} />
                      </Table.Tr>
                    </Table.Tfoot>
                  )}
                </Table>
              </Box>
            </Stack>

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                size="sm"
                disabled={loading}
                onClick={() => navigate(ROUTES.PURCHASE_ORDERS.LIST)}
              >
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" loading={loading} size="sm">
                {isEdit
                  ? t('purchaseOrders.form.updateButton')
                  : t('purchaseOrders.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </Form>
      </Card>

      {/* Per-line product photos; keyed by code so switching lines resets the gallery. */}
      {photoProduct && (
        <ProductPhotoModal
          key={photoProduct.code}
          opened
          onClose={() => setPhotoProduct(null)}
          productCode={photoProduct.code}
          productName={photoProduct.name}
        />
      )}
    </Stack>
  );
}
