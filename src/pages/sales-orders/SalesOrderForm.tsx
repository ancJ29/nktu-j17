import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  FileButton,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { SegmentTabs } from '@/components/SegmentTabs';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBoxMultiple,
  IconDownload,
  IconPhoto,
  IconPlus,
  IconScissors,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useProductStore } from '@/stores/useProductStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { device, logger } from '@credo/base-ui/utils';
import {
  ExcelParseError,
  generateSalesOrderItemsTemplate,
  generateSalesOrderItemsByNameTemplate,
  parseSalesOrderItemsExcelFile,
  parseSalesOrderItemsByNameExcelFile,
} from '@/utils/excelParser';
import { lookupLabelOf, useInitFormFromFetch, useLookupV2Labels } from '@/hooks';
import { getCurrentEmployeeStamp } from '@/hooks/useCurrentEmployee';
import {
  getDeliveryRequestDriverDepartments,
  getSalesOrderPicDepartments,
  hasImagesForProducts,
  isDeliveryRequestsEnabled,
  isInternalDeliveryAllowed,
  isLocationsEnabled,
  isPricingManagementEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import { EmployeeSelector } from '@/components/selectors';
import {
  getOwnReservedAtLocation,
  getProductLocationAvailability,
  getUnitAvailabilityAtLocation,
  indexInventoryByProduct,
  type LocationAvailability,
} from '@/utils/inventoryCommitment';
import type {
  InventoryLinkageSnapshotEntry,
  InventoryLinkageState,
  SalesOrder,
  SalesOrderItem,
  SalesOrderExtra,
  SalesOrderAttachment,
  Customer,
  Product,
} from '@/types';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types';
import { AttachmentPanel } from '@/components/AttachmentPanel';
import type { AttachmentEntry } from '@/components/AttachmentPanel';
import {
  CustomerSelector,
  type CustomerSelectorChange,
  ProductSelector,
  type ProductSelectorChange,
} from '@/components/selectors';
import { appConfig } from '@/config';
import { buildExpiringUploadDirectory } from '@/utils/uploadPath';
import { ProductPhotoModal } from './ProductPhotoModal';
import { salesOrderFieldOptions } from './useSalesOrderFieldOptions';
import {
  getCreateSkipInitialTargetValue,
  getInitialStatusValue,
  isReadyToProcessStatus,
  runTransition,
  shouldLockLineEdits,
} from './transitionEngine';
import { dispatchSoFollowUp } from './followUps';
import {
  executeReservationPlan,
  planReservationDiff,
  rollbackAppliedOps,
  type AppliedOp,
  type PlanFailure,
} from '@/utils/inventoryReservation';
import { emitInventoryActivityForApplied } from '@/utils/inventoryActivityEmit';
import { buildReservedLinkage } from '@/utils/inventoryLinkage';
import { getShortagePolicy, isExtraDeliveryQuantityAllowed } from '@/utils/permission';
import { getLinePhysicalQuantity } from '@/utils/salesOrderItemQuantity';
import { formatPlanFailures } from './planFailures';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { logActivity } from '@/utils/activityLogger';
import { markQuotationConverted } from '@/pages/quotations/useQuotationStore';
import { customerMemo, diffCustomer, diffItems, toMemoItem } from './activityMemo';
import type { SalesOrderFormVariant } from './salesOrderFormVariant';
import { buildDailySequentialCode, businessDateString } from '@/utils/code';
import { isBundleSet, isProductSet, isNoInventoryProduct, newSetGroupId } from '@/utils/productSet';
import {
  buildBreakdownParentIndex,
  planBreakdownCoverage,
  type BreakdownCoverage,
} from '@/utils/breakdownSet';
import {
  getProductDefaultUnitPrice,
  getProductSuggestedPrice,
  isBelowSuggestedPrice,
} from '@/utils/productPricing';
import { convertUnit } from '@/utils/unitConversion';
import { PRODUCT_SET_COLOR } from '@/config/misc';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { Form } from '@/components/Form';

const locationsEnabled = isLocationsEnabled();
const deliveryRequestsEnabled = isDeliveryRequestsEnabled();
const internalDeliveryAllowed = isInternalDeliveryAllowed();
const pricingEnabled = isPricingManagementEnabled();

const canViewSetComponentInventory = perms.salesOrder.canViewSetComponentInventory();
const picEmployeeFilter = makeEmployeeDepartmentFilter(getSalesOrderPicDepartments());
const salesOrderCodePrefix = appConfig.features.salesOrders.codePrefix;

const soDriverDepartments = getDeliveryRequestDriverDepartments();

const createSkipInitialTarget = getCreateSkipInitialTargetValue();

const BILLING_ADDRESS_ID = '__billing__';

const DEFAULT_VAT_PERCENT = 8;

const isMobile = device.isMobile;

function extractCopyFromState(state: unknown): Record<string, unknown> | undefined {
  if (state == null || typeof state !== 'object') return undefined;
  const copyFrom = (state as { copyFrom?: unknown }).copyFrom;
  if (copyFrom == null || typeof copyFrom !== 'object') return undefined;
  return copyFrom as Record<string, unknown>;
}

type ItemFormValues = {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;

  fromLocationCode: string;

  groupId?: string;

  role?: 'set' | 'set-component';

  sourceSetCode?: string;

  memo?: string;

  extraQuantity?: number;
};

type SalesOrderFormValues = {
  orderNumber: string;
  customerPONumber: string;
  customerId: string;
  customerName: string;
  isIndividualCustomer: boolean;
  isInternalDelivery: boolean;
  orderDate: Date | null;
  deliveryAddress: string;
  googleMapUrl: string;
  deliveryDate: Date | null;
  deliveryMethod: string;
  assignedStaff: string;
  isUrgent: boolean;
  tags: string[];

  needVAT: boolean;
  needShippingFee: boolean;

  vatRatePercent: number | '';
  vatTag: string;
  shippingFee: number | '';
  isPaid: boolean;

  paidAmount: number | '';
  invoiceIssued: boolean;
  notes: string;

  warehouseNote: string;
  driverNote: string;
  items: ItemFormValues[];
};

const emptyItem: ItemFormValues = {
  productCode: '',
  productName: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
  fromLocationCode: DEFAULT_LOCATION_CODE,
};

function isEmptyRow(row: ItemFormValues): boolean {
  return (
    !row.productCode &&
    !row.productName &&
    row.quantity === emptyItem.quantity &&
    row.unit === emptyItem.unit &&
    row.unitPrice === emptyItem.unitPrice &&
    row.fromLocationCode === emptyItem.fromLocationCode
  );
}

function isEmptyRowAt(items: ItemFormValues[], path: string): boolean {
  const m = path.match(/^items\.(\d+)\./);
  if (!m) return false;
  const row = items[Number(m[1])];
  return row != null && isEmptyRow(row);
}

const COMPACT_FORM_COLS = { base: 1, sm: 2, md: 4 } as const;

export function SalesOrderForm({ variant }: { variant: SalesOrderFormVariant }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const copyFrom = !isEdit ? extractCopyFromState(location.state) : undefined;
  const forceRefresh = useSalesOrderStore((s) => s.forceRefresh);
  const { deliveryMethodOptions, tagOptions } = salesOrderFieldOptions;

  const customers = useCustomerStore((s) => s.items);
  const products = useProductStore((s) => s.items);

  const locations = useLocationStore((s) => s.items);
  const allInventoryRows = useProductInventoryStore((s) => s.items);
  const inventoryInitialized = useProductInventoryStore((s) => s.initialized);
  const loadInventory = useProductInventoryStore((s) => s.loadAll);
  const unitLabels = useLookupV2Labels('unit');

  useEffect(() => {
    if (!inventoryInitialized) loadInventory();
  }, [inventoryInitialized, loadInventory]);

  const inventoryByProduct = useMemo(
    () => indexInventoryByProduct(allInventoryRows),
    [allInventoryRows],
  );
  const productByCode = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);
  const locationByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) {
      if (l.isActive) m.set(l.code, l.name || l.code);
    }
    return m;
  }, [locations]);

  const [ownReservedSnapshot, setOwnReservedSnapshot] = useState<
    readonly InventoryLinkageSnapshotEntry[] | undefined
  >(undefined);

  const [inventoryLinkageState, setInventoryLinkageState] = useState<
    InventoryLinkageState | undefined
  >(undefined);
  const stockSettled = inventoryLinkageState === 'shipped' || inventoryLinkageState === 'released';

  const lineAvailability = useCallback(
    (productCode: string, locationCode: string): LocationAvailability | null => {
      if (stockSettled) return null;
      const prod = productByCode.get(productCode);
      if (!prod) return null;

      if (isNoInventoryProduct(prod)) return null;
      const target = locationCode || DEFAULT_LOCATION_CODE;
      const base = getProductLocationAvailability(prod, target, inventoryByProduct);

      const ownReserved = getOwnReservedAtLocation(prod, target, ownReservedSnapshot);
      return { ...base, available: base.available + ownReserved };
    },
    [productByCode, inventoryByProduct, ownReservedSnapshot, stockSettled],
  );

  const unitAvailability = useCallback(
    (productCode: string, locationCode: string, unit: string): number | null => {
      if (stockSettled) return null;
      const prod = productByCode.get(productCode);
      if (!prod) return null;
      if (isNoInventoryProduct(prod)) return null;
      const target = locationCode || DEFAULT_LOCATION_CODE;
      return getUnitAvailabilityAtLocation(
        prod,
        target,
        unit,
        inventoryByProduct,
        ownReservedSnapshot,
      );
    },
    [productByCode, inventoryByProduct, ownReservedSnapshot, stockSettled],
  );

  const breakdownParentIndex = useMemo(() => buildBreakdownParentIndex(products), [products]);
  const breakdownCoverage = useCallback(
    (productCode: string, locationCode: string, quantity: number, unit: string) => {
      if (stockSettled || breakdownParentIndex.size === 0) return null;
      const prod = productByCode.get(productCode);
      if (!prod || isNoInventoryProduct(prod)) return null;
      return planBreakdownCoverage({
        component: prod,
        quantity,
        unit,
        locationCode: locationCode || DEFAULT_LOCATION_CODE,
        parentIndex: breakdownParentIndex,
        inventoryByProduct,
        ownReservedSnapshot,
      });
    },
    [breakdownParentIndex, productByCode, inventoryByProduct, ownReservedSnapshot, stockSettled],
  );

  const locationSelectData = useMemo(() => {
    if (!locationsEnabled) return [];
    const out = locations
      .filter((l) => l.isActive)
      .map((l) => ({ value: l.code, label: l.name || l.code }));

    if (!out.some((o) => isDefaultLocation(o.value))) {
      out.unshift({ value: DEFAULT_LOCATION_CODE, label: t('common.labels.defaultLocation') });
    }
    return out;
  }, [locations, t]);

  const hasCustomerRegistry = useMemo(
    () => customers.some((c) => c.isActive && !c.extra?.isDeleted),
    [customers],
  );

  const customerMap = useMemo(() => {
    const m = new Map<string, Customer>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const customerNameCodeData = useMemo(
    () =>
      variant.customerPicker === 'nameCodeSelect'
        ? customers
            .filter((c) => c.isActive && !c.extra?.isDeleted)
            .map((c) => {
              const name = c.extra?.shortName?.trim() || c.name;
              return { value: c.id, label: c.code ? `${name} — ${c.code}` : name };
            })
        : [],
    [customers, variant.customerPicker],
  );

  const currentEmployee = useMyEmployee();
  const currentEmployeeId = currentEmployee?.id ?? '';

  const productSelectData = useMemo(
    () =>
      products
        .filter((p) => p.isActive)
        .map((p) => ({
          value: p.code,

          label: `${p.code} — ${p.name}${isBundleSet(p) ? ' [SET]' : ''}`,
          name: p.name,
          unit: p.unit,
          price: p.price,
          isSet: isBundleSet(p),
          product: p,
        })),
    [products],
  );

  const productMap = useMemo(() => {
    const m = new Map<string, (typeof productSelectData)[number]>();
    for (const p of productSelectData) m.set(p.value, p);
    return m;
  }, [productSelectData]);

  const defaultStatus = getInitialStatusValue() ?? '';

  useEffect(() => {
    if (isMobile) {
      notifications.show({
        color: 'yellow',
        message: t('salesOrders.notifications.formDesktopOnly'),
      });
      navigate(ROUTES.SALES_ORDERS.LIST, { replace: true });
      return;
    }
    if ((isEdit && !perms.salesOrder.canEdit()) || (!isEdit && !perms.salesOrder.canCreate())) {
      navigate(ROUTES.SALES_ORDERS.LIST, { replace: true });
    }
  }, [navigate, isEdit, t]);

  const [loading, setLoading] = useState(false);
  const [formAttachments, setFormAttachments] = useState<SalesOrderAttachment[]>([]);

  const [shippingAddressId, setShippingAddressId] = useState<string>('');
  const snapshotRef = useRef<SalesOrder | null>(null);

  const quotationLinkRef = useRef<{ id: string; code?: string } | null>(null);

  const [lockedByReservation, setLockedByReservation] = useState(false);

  const [skipInitial, setSkipInitial] = useState(!!createSkipInitialTarget);

  const [photoProduct, setPhotoProduct] = useState<{ code: string; name: string } | null>(null);

  const productImagesEnabled = hasImagesForProducts();

  const [generatedUploadId] = useState(() => Math.random().toString(36).slice(2, 10));
  const uploadId = id ?? generatedUploadId;
  const imageDirectory = useMemo(
    () => buildExpiringUploadDirectory({ type: 'sales-order', id: uploadId }),
    [uploadId],
  );

  const splitNotesCfg = variant.clientSpecific?.NKTU?.splitNotes;
  const noteDept = currentEmployee?.department ?? null;
  const isNoteDriverDept = noteDept != null && soDriverDepartments.includes(noteDept);
  const isNoteWarehouseDept =
    noteDept != null && noteDept === splitNotesCfg?.warehouseDepartmentCode;

  const form = useForm<SalesOrderFormValues>({
    initialValues: {
      orderNumber: '',
      customerPONumber: '',
      customerId: '',
      customerName: '',
      isIndividualCustomer: false,
      isInternalDelivery: true,
      orderDate: new Date(),
      deliveryAddress: '',
      googleMapUrl: '',
      deliveryDate: null,
      deliveryMethod: variant.defaultDeliveryMethod,
      assignedStaff: currentEmployeeId,
      isUrgent: false,
      tags: [],
      needVAT: true,
      needShippingFee: false,
      vatRatePercent: DEFAULT_VAT_PERCENT,
      vatTag: '',
      shippingFee: '',
      isPaid: false,
      paidAmount: '',
      invoiceIssued: false,
      notes: '',
      warehouseNote: '',
      driverNote: '',
      items: [{ ...emptyItem }],
    },
    validate: {
      orderNumber: () => null,
      customerId: (v, vals) =>
        vals.isIndividualCustomer || v.trim() ? null : t('salesOrders.validation.customerRequired'),
      customerName: (v, vals) =>
        vals.isIndividualCustomer && !v.trim()
          ? t('salesOrders.validation.customerNameRequired')
          : null,

      items: {
        productCode: (v, vals, path) => {
          if (isEmptyRowAt(vals.items, path)) return null;
          const code = v.trim();
          if (!code) return t('salesOrders.validation.productCodeRequired');

          const m = path.match(/^items\.(\d+)\./);
          const idx = m ? Number(m[1]) : -1;
          if (idx < 0 || vals.items[idx]?.role === 'set-component') return null;
          const dup = vals.items.some(
            (row, i) =>
              i !== idx &&
              row.role !== 'set-component' &&
              !isEmptyRow(row) &&
              row.productCode.trim() === code,
          );
          return dup ? t('salesOrders.validation.productCodeDuplicate') : null;
        },
        productName: (v, vals, path) =>
          isEmptyRowAt(vals.items, path) || v.trim()
            ? null
            : t('salesOrders.validation.productNameRequired'),
        quantity: (v, vals, path) => {
          if (isEmptyRowAt(vals.items, path)) return null;

          const m = path.match(/^items\.(\d+)\./);
          if (m && vals.items[Number(m[1])]?.role === 'set-component') return null;
          return v > 0 ? null : t('common.validation.quantityRequired');
        },
        unit: (v, vals, path) =>
          isEmptyRowAt(vals.items, path) || v.trim() ? null : t('common.validation.unitRequired'),
        unitPrice: (v, vals, path) =>
          isEmptyRowAt(vals.items, path) || v >= 0
            ? null
            : t('salesOrders.validation.unitPriceRequired'),
        // fromLocationCode — never required; defaults to DEFAULT_LOCATION_CODE
        // for clients without locations. Operators can override per line.
      },
    },
  });

  useEffect(() => {
    if (!isEdit && currentEmployeeId && !form.getValues().assignedStaff) {
      form.setFieldValue('assignedStaff', currentEmployeeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployeeId, isEdit]);

  useEffect(() => {
    if (!copyFrom) return;

    const link = copyFrom.quotationLink as { id?: string; code?: string } | undefined;
    quotationLinkRef.current = link?.id ? { id: link.id, code: link.code } : null;
    const items =
      (copyFrom.items as {
        productCode: string;
        productName: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        fromLocationCode?: string;
        groupId?: string;
        role?: 'set' | 'set-component';
        sourceSetCode?: string;
        extraQuantity?: number;
      }[]) ?? [];

    const copyFromCode = (copyFrom.customerCode as string) ?? '';
    const copyFromId = copyFromCode
      ? (customers.find((c) => c.code === copyFromCode)?.id ?? '')
      : '';
    form.setValues({
      orderNumber: '',
      customerPONumber: '',
      customerId: copyFromId,
      customerName: (copyFrom.customerName as string) ?? '',
      isIndividualCustomer: (copyFrom.isIndividualCustomer as boolean) ?? false,
      isInternalDelivery: (copyFrom.isInternalDelivery as boolean) ?? true,
      orderDate: new Date(),
      deliveryAddress: (copyFrom.deliveryAddress as string) ?? '',
      googleMapUrl: (copyFrom.googleMapUrl as string) ?? '',
      deliveryDate: null,
      deliveryMethod: (copyFrom.deliveryMethod as string) ?? '',
      assignedStaff: (copyFrom.assignedStaff as string) ?? currentEmployeeId,
      isUrgent: (copyFrom.isUrgent as boolean) ?? false,
      tags: (copyFrom.tags as string[]) ?? [],

      needVAT: (copyFrom.needVAT as boolean | undefined) ?? true,
      needShippingFee: (copyFrom.needShippingFee as boolean | undefined) ?? false,
      vatRatePercent:
        typeof copyFrom.vatRate === 'number' ? copyFrom.vatRate * 100 : DEFAULT_VAT_PERCENT,
      vatTag: (copyFrom.vatTag as string) ?? '',
      shippingFee: typeof copyFrom.shippingFee === 'number' ? copyFrom.shippingFee : '',
      isPaid: false,
      paidAmount: '',
      invoiceIssued: false,
      notes: (copyFrom.notes as string) ?? '',

      warehouseNote: '',
      driverNote: '',
      items:
        items.length > 0
          ? items.map((item) => ({
              productCode: item.productCode,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              fromLocationCode: item.fromLocationCode || DEFAULT_LOCATION_CODE,
              ...(item.groupId && { groupId: item.groupId }),
              ...(item.role && { role: item.role }),
              ...(item.sourceSetCode && { sourceSetCode: item.sourceSetCode }),
              ...(item.extraQuantity ? { extraQuantity: item.extraQuantity } : {}),
            }))
          : [{ ...emptyItem }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyFrom]);

  const handleCustomerChange = useCallback(
    (selection: CustomerSelectorChange | null) => {
      if (!selection) {
        setShippingAddressId('');
        form.setFieldValue('customerId', '');
        form.setFieldValue('customerName', '');
        form.setFieldValue('deliveryAddress', '');
        form.setFieldValue('googleMapUrl', '');
        return;
      }
      const { customer } = selection;
      form.setFieldValue('customerId', customer.id);
      form.setFieldValue('customerName', customer.name);
      const firstShipping = customer.extra?.shippingAddresses?.[0];
      if (firstShipping) {
        setShippingAddressId(firstShipping.id);
        form.setFieldValue('deliveryAddress', firstShipping.address);
        form.setFieldValue('googleMapUrl', firstShipping.googleMapUrl ?? '');
      } else if (customer.address) {
        setShippingAddressId(BILLING_ADDRESS_ID);
        form.setFieldValue('deliveryAddress', customer.address);
        form.setFieldValue('googleMapUrl', customer.extra?.addressGoogleMapUrl ?? '');
      } else {
        setShippingAddressId('');
        form.setFieldValue('deliveryAddress', '');
        form.setFieldValue('googleMapUrl', '');
      }
    },

    [],
  );

  const handlePickAddress = useCallback(
    (id: string | null) => {
      setShippingAddressId(id ?? '');
      if (!id) return;
      const customer = customerMap.get(form.getValues().customerId);
      if (!customer) return;
      if (id === BILLING_ADDRESS_ID) {
        form.setFieldValue('deliveryAddress', customer.address ?? '');
        form.setFieldValue('googleMapUrl', customer.extra?.addressGoogleMapUrl ?? '');
        return;
      }
      const sa = customer.extra?.shippingAddresses?.find((s) => s.id === id);
      if (sa) {
        form.setFieldValue('deliveryAddress', sa.address);
        form.setFieldValue('googleMapUrl', sa.googleMapUrl ?? '');
      }
    },

    [customerMap],
  );

  const handleIndividualCustomerToggle = useCallback(
    (checked: boolean) => {
      form.setFieldValue('isIndividualCustomer', checked);
      setShippingAddressId('');
      if (checked) {
        form.setFieldValue('customerId', '');
      } else {
        form.setFieldValue('customerName', '');
        form.setFieldValue('deliveryAddress', '');
        form.setFieldValue('googleMapUrl', '');
      }
    },

    [],
  );

  const buildSetExpansion = useCallback(
    (parentProduct: Product, parentQty: number, groupId: string): ItemFormValues[] => {
      const setItems = parentProduct.extra?.setItems ?? [];
      const baseUnitPrice = getProductDefaultUnitPrice(parentProduct);
      const parent: ItemFormValues = {
        productCode: parentProduct.code,
        productName: parentProduct.name,
        quantity: parentQty,
        unit: parentProduct.unit,

        unitPrice: baseUnitPrice,
        fromLocationCode: DEFAULT_LOCATION_CODE,
        groupId,
        role: 'set',
      };
      const children: ItemFormValues[] = setItems.map((c) => {
        const componentProduct = productMap.get(c.productCode)?.product;

        const unitsPool = componentProduct?.extra?.units ?? [componentProduct?.unit ?? c.unit];
        let unit = c.unit;
        let quantity = c.quantity * parentQty;
        if (componentProduct && !unitsPool.includes(c.unit)) {
          const primaryUnit = unitsPool[0] ?? c.unit;
          const converted = convertUnit(
            quantity,
            c.unit,
            primaryUnit,
            componentProduct.extra?.unitConversions ?? [],
          );
          if (converted !== null) {
            quantity = converted;
            unit = primaryUnit;
          } else {
            logger?.warn?.(
              `[product-set] no conversion from ${c.unit} → ${primaryUnit} for ${c.productCode}; ` +
                `keeping declared unit. Set: ${parentProduct.code}.`,
            );
          }
        }
        return {
          productCode: c.productCode,
          productName: componentProduct?.name ?? c.productCode,
          quantity,
          unit,
          unitPrice: 0,
          fromLocationCode: DEFAULT_LOCATION_CODE,
          groupId,
          role: 'set-component',
          sourceSetCode: parentProduct.code,
        };
      });
      return [parent, ...children];
    },
    [productMap],
  );

  const handleProductSelect = useCallback(
    (idx: number, opt: ProductSelectorChange | null) => {
      const currentItems = form.getValues().items;
      const target = currentItems[idx];
      const outgoingGroupId = target?.role === 'set' && target.groupId ? target.groupId : null;

      const base = outgoingGroupId
        ? currentItems.filter((l, i) => i === idx || l.groupId !== outgoingGroupId)
        : currentItems;
      const detach = (l: ItemFormValues): ItemFormValues => {
        const { groupId: _g, role: _r, sourceSetCode: _s, ...rest } = l;
        void _g;
        void _r;
        void _s;
        return rest;
      };

      if (!opt) {
        const next = base.map((l, i) =>
          i === idx ? { ...detach(l), productCode: '', productName: '' } : l,
        );
        form.setFieldValue('items', next);
        return;
      }
      const { product, code, name, units } = opt;

      if (isBundleSet(product)) {
        const currentQty = base[idx]?.quantity ?? 1;
        const expansion = buildSetExpansion(product, currentQty || 1, newSetGroupId());
        const next = [...base];
        next.splice(idx, 1, ...expansion);
        form.setFieldValue('items', next);
        notifications.show({
          color: 'blue',
          message: t('salesOrders.notifications.setExpanded', {
            count: expansion.length - 1,
            setName: name,
          }),
          autoClose: 4000,
        });
        return;
      }
      const next = base.map((l, i) =>
        i === idx
          ? {
              ...detach(l),
              productCode: code,
              productName: name,
              unit: units[0] ?? product.unit ?? '',
              unitPrice: getProductDefaultUnitPrice(product),
            }
          : l,
      );
      form.setFieldValue('items', next);
    },

    [buildSetExpansion, t],
  );

  const handleExplodeSet = useCallback(
    (groupId: string) => {
      const current = form.getValues().items;
      let count = 0;
      const next = current.map((l) => {
        if (l.groupId !== groupId) return l;
        count += 1;
        const { groupId: _g, role: _r, sourceSetCode: _s, ...rest } = l;
        void _g;
        void _r;
        void _s;
        return rest;
      });
      form.setFieldValue('items', next);
      notifications.show({
        color: 'blue',
        message: t('salesOrders.notifications.setExploded', { count }),
        autoClose: 3500,
      });
    },

    [t],
  );

  const handleParentQuantityChange = useCallback(
    (parentIdx: number, nextQty: number) => {
      const current = form.getValues().items;
      const parent = current[parentIdx];
      if (!parent || parent.role !== 'set' || !parent.groupId) {
        form.setFieldValue(`items.${parentIdx}.quantity`, nextQty);
        return;
      }
      const parentProduct = productMap.get(parent.productCode)?.product;
      if (!parentProduct || !isProductSet(parentProduct)) {
        form.setFieldValue(`items.${parentIdx}.quantity`, nextQty);
        return;
      }
      const rebuilt = buildSetExpansion(parentProduct, nextQty, parent.groupId);

      rebuilt[0] = {
        ...rebuilt[0],
        unitPrice: parent.unitPrice,
        fromLocationCode: parent.fromLocationCode,
      };

      const groupId = parent.groupId;
      let firstIdx = parentIdx;
      let lastIdx = parentIdx;
      while (firstIdx > 0 && current[firstIdx - 1]?.groupId === groupId) firstIdx -= 1;
      while (lastIdx + 1 < current.length && current[lastIdx + 1]?.groupId === groupId) {
        lastIdx += 1;
      }
      const next = [...current.slice(0, firstIdx), ...rebuilt, ...current.slice(lastIdx + 1)];
      form.setFieldValue('items', next);
    },

    [buildSetExpansion, productMap],
  );

  const handleParentLocationChange = useCallback(
    (parentIdx: number, nextLocation: string) => {
      const current = form.getValues().items;
      const parent = current[parentIdx];
      const location = nextLocation || DEFAULT_LOCATION_CODE;
      if (!parent || parent.role !== 'set' || !parent.groupId) {
        form.setFieldValue(`items.${parentIdx}.fromLocationCode`, location);
        return;
      }
      const next = current.map((l, i) => {
        if (i === parentIdx) return { ...l, fromLocationCode: location };
        if (l.groupId === parent.groupId && l.role === 'set-component') {
          return { ...l, fromLocationCode: location };
        }
        return l;
      });
      form.setFieldValue('items', next);
    },

    [],
  );

  const handleRemoveItem = useCallback(
    (idx: number) => {
      const current = form.getValues().items;
      const target = current[idx];
      if (!target) return;
      if (target.role === 'set-component') {
        return;
      }
      if (target.role === 'set' && target.groupId) {
        const groupId = target.groupId;
        form.setFieldValue(
          'items',
          current.filter((l) => l.groupId !== groupId),
        );
        return;
      }
      form.removeListItem('items', idx);
    },

    [],
  );

  const handleDownloadTemplate = useCallback(() => {
    if (variant.excelMode === 'by-name') {
      const sampleItems = products.slice(0, 3).map((p) => ({ name: p.name }));
      generateSalesOrderItemsByNameTemplate({ language: i18n.language, sampleItems });
      return;
    }
    const sampleItems: Array<{ sku: string; unit: string; unitPrice: number }> = [];
    for (const p of products) {
      if (sampleItems.length >= 3) break;
      const sku = p.extra?.sku?.trim();
      if (!sku) continue;
      const unit = p.extra?.units?.[0] || p.unit || '';
      sampleItems.push({ sku, unit, unitPrice: p.price ?? 0 });
    }
    generateSalesOrderItemsTemplate({ language: i18n.language, sampleItems, pricingEnabled });
  }, [products, i18n.language, variant.excelMode]);

  const handleImportItemsBySku = useCallback(
    async (file: File) => {
      try {
        const rows = await parseSalesOrderItemsExcelFile(file, { pricingEnabled });
        if (rows.length === 0) {
          notifications.show({
            color: 'yellow',
            message: t('salesOrders.notifications.importEmpty'),
          });
          return;
        }

        type SkuHit = {
          code: string;
          name: string;
          units: string[];
          price: number;
        };
        const skuMap = new Map<string, SkuHit>();
        for (const p of products) {
          const sku = p.extra?.sku?.trim();
          if (!sku) continue;
          skuMap.set(sku.toLowerCase(), {
            code: p.code,
            name: p.name,
            units: p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : [],
            price: getProductDefaultUnitPrice(p),
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

          const typedUnit = row.unit?.toLowerCase();
          const unit =
            (typedUnit && hit.units.find((u) => u.toLowerCase() === typedUnit)) ??
            hit.units[0] ??
            '';
          matched.push({
            productCode: hit.code,
            productName: hit.name,
            quantity: row.quantity,
            unit,
            unitPrice: typeof row.unitPrice === 'number' ? row.unitPrice : hit.price,
            fromLocationCode: DEFAULT_LOCATION_CODE,
          });
        }

        if (matched.length === 0) {
          notifications.show({
            color: 'red',
            title: t('salesOrders.notifications.importNoMatchTitle'),
            message: t('salesOrders.notifications.importUnmatched', {
              count: unmatched.length,

              skus: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
          return;
        }

        const current = form.getValues().items;
        const allEmpty = current.every(isEmptyRow);
        form.setFieldValue('items', allEmpty ? matched : [...current, ...matched]);

        if (unmatched.length > 0) {
          notifications.show({
            color: 'yellow',
            title: t('salesOrders.notifications.importPartialTitle', { added: matched.length }),
            message: t('salesOrders.notifications.importUnmatched', {
              count: unmatched.length,
              skus: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('salesOrders.notifications.importSuccess', { count: matched.length }),
          });
        }
      } catch (err) {
        if (err instanceof ExcelParseError) {
          notifications.show({
            color: 'red',
            title: t('salesOrders.notifications.importMissingColumnTitle'),
            message: t('salesOrders.notifications.importMissingColumn', {
              columns: err.missing.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          logger.error('Excel import failed:', err);
          notifications.show({
            color: 'red',
            message: t('salesOrders.notifications.importError'),
          });
        }
      }
    },

    [products, t],
  );

  const handleImportItemsByName = useCallback(
    async (file: File) => {
      try {
        const { items: rows, customerPONumber } = await parseSalesOrderItemsByNameExcelFile(file);
        if (rows.length === 0) {
          notifications.show({
            color: 'yellow',
            message: t('salesOrders.notifications.importEmpty'),
          });
          return;
        }

        const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        type NameHit = { code: string; name: string; units: string[]; price: number };
        const nameMap = new Map<string, NameHit>();
        for (const p of products) {
          const hit: NameHit = {
            code: p.code,
            name: p.name,
            units: p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : [],
            price: getProductDefaultUnitPrice(p),
          };
          for (const alias of [p.name, ...(p.extra?.alternativeNames ?? [])]) {
            const key = norm(alias ?? '');
            if (key) nameMap.set(key, hit);
          }
        }

        const matched: ItemFormValues[] = [];
        const unmatched: string[] = [];
        for (const row of rows) {
          const hit = nameMap.get(norm(row.name));
          if (!hit) {
            unmatched.push(row.name);
            continue;
          }
          matched.push({
            productCode: hit.code,
            productName: hit.name,
            quantity: row.quantity,
            unit: hit.units[0] ?? '',

            unitPrice: typeof row.unitPrice === 'number' ? row.unitPrice : hit.price,
            fromLocationCode: DEFAULT_LOCATION_CODE,
          });
        }

        if (matched.length === 0) {
          notifications.show({
            color: 'red',
            title: t('salesOrders.notifications.importNoMatchByNameTitle'),
            message: t('salesOrders.notifications.importUnmatchedByName', {
              count: unmatched.length,
              names: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
          return;
        }

        const current = form.getValues().items;
        const allEmpty = current.every(isEmptyRow);
        form.setFieldValue('items', allEmpty ? matched : [...current, ...matched]);

        if (customerPONumber) {
          form.setFieldValue('customerPONumber', customerPONumber);
        }

        if (unmatched.length > 0) {
          notifications.show({
            color: 'yellow',
            title: t('salesOrders.notifications.importPartialTitle', { added: matched.length }),
            message: t('salesOrders.notifications.importUnmatchedByName', {
              count: unmatched.length,
              names: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('salesOrders.notifications.importSuccess', { count: matched.length }),
          });
        }
      } catch (err) {
        if (err instanceof ExcelParseError) {
          notifications.show({
            color: 'red',
            title: t('salesOrders.notifications.importMissingColumnTitle'),
            message: t('salesOrders.notifications.importMissingColumnByName'),
            autoClose: 8000,
          });
        } else {
          logger.error('Excel import (by name) failed:', err);
          notifications.show({
            color: 'red',
            message: t('salesOrders.notifications.importError'),
          });
        }
      }
    },

    [products, t],
  );

  const handleImportItems = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (variant.excelMode === 'by-name') await handleImportItemsByName(file);
      else await handleImportItemsBySku(file);
    },
    [variant.excelMode, handleImportItemsBySku, handleImportItemsByName],
  );

  const handleClaimExcelFiles = useCallback(
    (files: File[]) => {
      const isExcel = (f: File) => /\.(xlsx|xls|csv)$/i.test(f.name);
      const excel = files.filter(isExcel);
      if (excel.length > 0) {
        if (lockedByReservation) {
          notifications.show({ color: 'blue', message: t('salesOrders.form.lockedByReservation') });
        } else {
          void handleImportItems(excel[0]);
        }
      }
      return files.filter((f) => !isExcel(f));
    },
    [lockedByReservation, handleImportItems, t],
  );

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSalesOrderById({ id });
      const o = res.salesOrder as SalesOrder;
      snapshotRef.current = o;
      const extra = o.extra as SalesOrderExtra;

      if (o.isClosed || extra?.cancellation != null) {
        navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', id), { replace: true });
        return null;
      }
      setFormAttachments(extra?.attachments ?? []);
      setLockedByReservation(shouldLockLineEdits(extra?.status ?? ''));
      setOwnReservedSnapshot(extra?.inventoryLinkage?.reservedSnapshot);
      setInventoryLinkageState(extra?.inventoryLinkage?.state);

      const persistedCode = extra?.customerCode ?? '';
      const persistedCustomer = persistedCode
        ? customers.find((c) => c.code === persistedCode)
        : undefined;
      const persistedId = persistedCustomer?.id ?? '';
      const persistedCustomerName = extra?.isIndividualCustomer
        ? (extra?.customerName ?? '')
        : (persistedCustomer?.name ?? o.customerName);
      return {
        orderNumber: o.orderNumber,
        customerPONumber: extra?.customerPONumber ?? '',
        customerId: persistedId,
        customerName: persistedCustomerName,
        isIndividualCustomer: extra?.isIndividualCustomer ?? false,
        isInternalDelivery: extra?.isInternalDelivery ?? true,
        orderDate: extra?.orderDate ? new Date(extra.orderDate) : null,
        deliveryAddress: extra?.deliveryAddress ?? '',
        googleMapUrl: extra?.googleMapUrl ?? '',
        deliveryDate: extra?.deliveryDate ? new Date(extra.deliveryDate) : null,
        deliveryMethod: extra?.deliveryMethod ?? '',
        assignedStaff: extra?.assignedStaff ?? '',
        isUrgent: extra?.isUrgent ?? false,
        tags: extra?.tags ?? [],
        needVAT: extra?.needVAT ?? true,
        needShippingFee: extra?.needShippingFee ?? false,
        vatRatePercent:
          typeof extra?.vatRate === 'number' ? extra.vatRate * 100 : DEFAULT_VAT_PERCENT,
        vatTag: extra?.vatTag ?? '',
        shippingFee: typeof extra?.shippingFee === 'number' ? extra.shippingFee : ('' as const),
        isPaid: extra?.isPaid ?? false,
        paidAmount: typeof extra?.paidAmount === 'number' ? extra.paidAmount : ('' as const),
        invoiceIssued: extra?.invoiceIssued ?? false,
        notes: o.notes || '',
        warehouseNote: extra?.clientSpecific?.NKTU?.warehouseNote ?? '',
        driverNote: extra?.clientSpecific?.NKTU?.driverNote ?? '',
        items: o.items.map((item) => ({
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          fromLocationCode: item.fromLocationCode || DEFAULT_LOCATION_CODE,
          ...(item.groupId && { groupId: item.groupId }),
          ...(item.role && { role: item.role }),
          ...(item.sourceSetCode && { sourceSetCode: item.sourceSetCode }),
          ...(item.memo && { memo: item.memo }),
          ...(item.extraQuantity ? { extraQuantity: item.extraQuantity } : {}),
        })),
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('salesOrders.notifications.fetchError') });
      navigate(ROUTES.SALES_ORDERS.LIST);
    },
  );

  const totalAmount = useMemo(
    () => form.getValues().items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),

    [form.getValues().items],
  );

  type LineShortage = {
    idx: number;
    productCode: string;
    productName: string;
    quantity: number;
    unit: string;
    locationCode: string;
    available: number;
    short: number;
  };
  const lineShortages: LineShortage[] = useMemo(() => {
    const out: LineShortage[] = [];
    form.getValues().items.forEach((item, idx) => {
      if (!item.productCode) return;

      if (item.role === 'set-component') return;
      const avail = lineAvailability(item.productCode, item.fromLocationCode);
      if (!avail) return;

      const physicalQty = getLinePhysicalQuantity(item);

      const coverage = breakdownCoverage(
        item.productCode,
        item.fromLocationCode,
        physicalQty,
        item.unit,
      );
      const short = coverage ? coverage.residual : physicalQty - avail.available;
      if (short <= 0) return;
      out.push({
        idx,
        productCode: item.productCode,
        productName: item.productName,
        quantity: physicalQty,
        unit: item.unit,
        locationCode: item.fromLocationCode || DEFAULT_LOCATION_CODE,
        available: avail.available,
        short,
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- intentional: recompute against live form values on every render (see comment above)
  }, [form.getValues().items, lineAvailability, breakdownCoverage]);

  const handleAttachmentsChange = useCallback(async (updated: AttachmentEntry[]) => {
    setFormAttachments(updated as SalesOrderAttachment[]);
  }, []);

  const handleSubmit = useCallback(
    async (values: SalesOrderFormValues) => {
      const filledRows = values.items.filter((row) => !isEmptyRow(row));

      setLoading(true);
      const items: SalesOrderItem[] = filledRows.map((item) => ({
        productCode: item.productCode.trim(),
        productName: item.productName.trim(),
        quantity: item.quantity,
        unit: item.unit.trim(),

        unitPrice: item.role === 'set-component' ? 0 : item.unitPrice,
        fromLocationCode: item.fromLocationCode || DEFAULT_LOCATION_CODE,
        ...(item.groupId && { groupId: item.groupId }),
        ...(item.role && { role: item.role }),
        ...(item.sourceSetCode && { sourceSetCode: item.sourceSetCode }),

        ...(item.role !== 'set-component' && item.memo?.trim() && { memo: item.memo.trim() }),

        ...(!item.role &&
          item.extraQuantity &&
          item.extraQuantity > 0 && { extraQuantity: item.extraQuantity }),
      }));

      const selectedCustomer = values.customerId ? customerMap.get(values.customerId) : undefined;

      const quotationLink =
        quotationLinkRef.current ??
        (() => {
          const snapExtra = snapshotRef.current?.extra;
          const qId = snapExtra?.quotationId ?? snapExtra?.clientSpecific?.NKTU?.quotationId;
          const qCode = snapExtra?.quotationCode ?? snapExtra?.clientSpecific?.NKTU?.quotationCode;
          return qId ? { id: qId, code: qCode } : null;
        })();

      const extra: SalesOrderExtra = {
        ...(values.isIndividualCustomer
          ? { isIndividualCustomer: true, customerName: values.customerName.trim() }
          : selectedCustomer && { customerCode: selectedCustomer.code }),
        ...(quotationLink && {
          quotationId: quotationLink.id,
          ...(quotationLink.code && { quotationCode: quotationLink.code }),
        }),
        ...(deliveryRequestsEnabled &&
          (!internalDeliveryAllowed || !values.isInternalDelivery) && {
            isInternalDelivery: false,
          }),
        ...(values.orderDate && { orderDate: new Date(values.orderDate).getTime() }),
        ...(values.customerPONumber.trim() && { customerPONumber: values.customerPONumber.trim() }),
        ...(values.deliveryAddress && { deliveryAddress: values.deliveryAddress }),
        ...(values.googleMapUrl.trim() && { googleMapUrl: values.googleMapUrl.trim() }),
        ...(values.deliveryDate && { deliveryDate: new Date(values.deliveryDate).getTime() }),
        ...(values.deliveryMethod && { deliveryMethod: values.deliveryMethod }),
        ...(values.assignedStaff && { assignedStaff: values.assignedStaff }),
        ...(values.isUrgent && { isUrgent: true }),
        ...(values.tags.length > 0 && { tags: values.tags }),

        ...(pricingEnabled && values.needVAT === false && { needVAT: false }),
        ...(pricingEnabled && values.needShippingFee && { needShippingFee: true }),
        ...(pricingEnabled &&
          typeof values.vatRatePercent === 'number' && {
            vatRate: values.vatRatePercent / 100,
          }),
        ...(pricingEnabled && values.vatTag.trim() && { vatTag: values.vatTag.trim() }),
        ...(pricingEnabled &&
          typeof values.shippingFee === 'number' &&
          values.shippingFee > 0 && { shippingFee: values.shippingFee }),
        ...(pricingEnabled && values.isPaid && { isPaid: true }),

        ...(pricingEnabled &&
          !values.isPaid &&
          typeof values.paidAmount === 'number' &&
          values.paidAmount > 0 && { paidAmount: values.paidAmount }),
        ...(pricingEnabled && values.invoiceIssued && { invoiceIssued: true }),
        ...(formAttachments.length > 0 && { attachments: formAttachments }),

        ...(splitNotesCfg && {
          clientSpecific: {
            NKTU: {
              ...(values.warehouseNote.trim() && { warehouseNote: values.warehouseNote.trim() }),
              ...(values.driverNote.trim() && { driverNote: values.driverNote.trim() }),
            },
          },
        }),
      };

      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Sales order snapshot missing');

          const snapshotExtra = (snapshot.extra ?? {}) as SalesOrderExtra;

          const oldLinkage = snapshotExtra.inventoryLinkage;
          const linkageActive =
            oldLinkage?.state === 'reserved' &&
            oldLinkage.reservedSnapshot != null &&
            oldLinkage.reservedSnapshot.length > 0;

          let nextLinkage = snapshotExtra.inventoryLinkage;
          let appliedInventoryOps: readonly AppliedOp[] = [];

          if (linkageActive) {
            await useProductInventoryStore.getState().revalidate();
            const freshInventoryByProduct = indexInventoryByProduct(
              useProductInventoryStore.getState().items,
            );
            const diffResult = planReservationDiff({
              oldSnapshot: oldLinkage!.reservedSnapshot!,
              newItems: items,
              so: snapshot,
              productsByCode: productByCode,
              inventoryByProduct: freshInventoryByProduct,
            });
            if (!diffResult.ok) {
              notifications.show({
                color: 'red',
                title: t('salesOrders.notifications.reservationPlanFailedTitle'),
                message: formatPlanFailures(diffResult.failures, t, productByCode),
                autoClose: 12000,
              });
              setLoading(false);
              return;
            }

            if (getShortagePolicy() === 'block') {
              const shortageFailures: PlanFailure[] = [];
              for (const op of diffResult.plan.ops) {
                const product = productByCode.get(op.itemCode);
                if (!product) continue;

                let positiveBaseDelta = 0;
                const baseUnit = getItemBaseUnit(product);
                for (const [u, q] of Object.entries(op.deltas)) {
                  if (q > 0) {
                    const inBase = convertUnit(
                      q,
                      u,
                      baseUnit,
                      product.extra?.unitConversions ?? [],
                    );
                    if (typeof inBase === 'number') positiveBaseDelta += inBase;
                  }
                }
                if (positiveBaseDelta === 0) continue;
                const avail = getProductLocationAvailability(
                  product,
                  op.locationCode,
                  freshInventoryByProduct,
                );

                const ownReserved = getOwnReservedAtLocation(
                  product,
                  op.locationCode,
                  oldLinkage!.reservedSnapshot,
                );
                const effectiveAvailable = avail.available + ownReserved;
                if (positiveBaseDelta > effectiveAvailable) {
                  shortageFailures.push({
                    kind: 'shortage',
                    productCode: op.itemCode,
                    locationCode: op.locationCode,
                    requested: positiveBaseDelta,
                    available: effectiveAvailable,
                  });
                }
              }
              if (shortageFailures.length > 0) {
                notifications.show({
                  color: 'red',
                  title: t('salesOrders.notifications.reservationPlanFailedTitle'),
                  message: formatPlanFailures(shortageFailures, t, productByCode),
                  autoClose: 12000,
                });
                setLoading(false);
                return;
              }
            }

            if (diffResult.plan.ops.length > 0) {
              const exec = await executeReservationPlan(diffResult.plan.ops);
              if (!exec.ok) {
                useProductInventoryStore.getState().forceRefresh();
                notifications.show({
                  color: 'red',
                  title: t('salesOrders.notifications.reservationPlanFailedTitle'),
                  message: exec.error.message,
                  autoClose: 12000,
                });
                setLoading(false);
                return;
              }
              appliedInventoryOps = exec.applied as typeof appliedInventoryOps;
            }

            const actor = currentEmployee
              ? { id: currentEmployee.id, name: currentEmployee.name }
              : undefined;
            const transitionAt = Date.now();
            if (diffResult.newSnapshot.length > 0) {
              nextLinkage = buildReservedLinkage(diffResult.newSnapshot, transitionAt, actor, {
                kind: 'form-edit-diff',
              });
            } else {
              nextLinkage = {
                state: 'released',
                lastTransition: {
                  action: 'release',
                  at: transitionAt,
                  ...(actor && { by: actor }),
                  via: { kind: 'form-edit-diff' },
                },
              };
            }
          }

          const mergedExtra: SalesOrderExtra = {
            ...(snapshotExtra.createdBy !== undefined && { createdBy: snapshotExtra.createdBy }),
            ...(snapshotExtra.status !== undefined && { status: snapshotExtra.status }),
            ...(snapshotExtra.readyAt !== undefined && { readyAt: snapshotExtra.readyAt }),
            ...(snapshotExtra.cancellation !== undefined && {
              cancellation: snapshotExtra.cancellation,
            }),
            ...(nextLinkage !== undefined && { inventoryLinkage: nextLinkage }),
            ...(snapshotExtra.activityLog !== undefined && {
              activityLog: snapshotExtra.activityLog,
            }),
            ...(snapshotExtra.chatHistory !== undefined && {
              chatHistory: snapshotExtra.chatHistory,
            }),
            ...(snapshotExtra.photos !== undefined && { photos: snapshotExtra.photos }),

            ...(snapshotExtra.billingNotRequired !== undefined && {
              billingNotRequired: snapshotExtra.billingNotRequired,
            }),
            ...extra,
          };
          let updated: SalesOrder;
          try {
            updated = await useSalesOrderStore.getState().updateSafely({
              id,
              version: snapshot.version,
              patch: {
                customerName: values.customerName.trim(),
                notes: values.notes.trim(),
                items,
                extra: mergedExtra,
              },
            });
          } catch (err) {
            if (appliedInventoryOps.length > 0) {
              const rb = await rollbackAppliedOps(appliedInventoryOps);
              useProductInventoryStore.getState().forceRefresh();
              if (!rb.rollbackOk) {
                logger.error(
                  '[SalesOrderFormPage] reservation rollback failed — orphaned rows:',
                  rb.orphanedRowIds,
                );
              }
            }
            throw err;
          }
          snapshotRef.current = updated;
          forceRefresh();
          if (linkageActive) useProductInventoryStore.getState().forceRefresh();

          if (appliedInventoryOps.length > 0) {
            emitInventoryActivityForApplied(appliedInventoryOps, {
              kind: 'SO',
              id: updated.id,
              label: updated.orderNumber,
              suffix: '(edit)',
            });
          }

          const itemDiff = diffItems(snapshot.items, items);
          const customerDiff = diffCustomer(snapshotExtra, mergedExtra);
          logActivity('salesOrder.update', id, {
            orderNumber: updated.orderNumber,
            lineCount: items.length,
            itemDiff,
            ...(customerDiff && { customerDiff }),
            ...(linkageActive && {
              reservationDiff: {
                affectedRows: appliedInventoryOps.length,
                ...(appliedInventoryOps.length > 0 &&
                  nextLinkage?.state === 'released' && { fullyReleased: true }),
              },
            }),
          });
          notifications.show({
            color: 'green',
            message: t('salesOrders.notifications.updateSuccess'),
          });
          navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', id));
        } else {
          const activityLog = [
            {
              timestamp: Date.now(),
              action: 'created',
              toStatus: defaultStatus,
              ...getCurrentEmployeeStamp(),
            },
          ];

          const today = businessDateString();
          const todaysOrders = await cMngtConnector.querySalesOrders<SalesOrderExtra>({
            fromPeriod: today,
            toPeriod: today,
          });
          const orderNumber = buildDailySequentialCode(
            salesOrderCodePrefix,
            todaysOrders.salesOrders.map((o) => o.orderNumber),
          );

          const res = await cMngtConnector.createSalesOrder({
            orderNumber,
            customerName: values.customerName.trim(),
            notes: values.notes.trim(),
            items,
            extra: {
              ...extra,
              status: defaultStatus,

              createdBy: currentEmployeeId,
              activityLog,

              ...(isReadyToProcessStatus(defaultStatus) ? { readyAt: Date.now() } : {}),
            },
          });
          forceRefresh();

          if (quotationLink) {
            const poDateRaw = res.salesOrder.extra?.orderDate ?? res.salesOrder.createdAt;
            void markQuotationConverted(quotationLink.id, {
              id: res.salesOrder.id,
              number: res.salesOrder.orderNumber,
              poDate: poDateRaw ? new Date(poDateRaw).getTime() : Date.now(),
            });
          }

          logActivity('salesOrder.create', res.salesOrder.id, {
            orderNumber: res.salesOrder.orderNumber,
            ...customerMemo(extra),
            lineCount: items.length,
            items: items.map(toMemoItem),
          });
          notifications.show({
            color: 'green',
            message: t('salesOrders.notifications.createSuccess'),
          });

          if (createSkipInitialTarget && skipInitial) {
            const created = res.salesOrder as SalesOrder;
            const actor = currentEmployee
              ? { id: currentEmployee.id, name: currentEmployee.name }
              : undefined;
            const transitionResult = await runTransition({
              order: created,
              toStatusValue: createSkipInitialTarget,
              actor,
              productsByCode: productByCode,
              inventoryByProduct,
            });
            if (transitionResult.ok) {
              for (const followUp of transitionResult.followUps) {
                await dispatchSoFollowUp(followUp, transitionResult.updated, actor, t);
              }

              const advancedExtra = (transitionResult.updated.extra ?? {}) as SalesOrderExtra;
              const inventoryAction =
                advancedExtra.inventoryLinkage?.lastTransition?.via?.kind === 'completion-auto-ship'
                  ? 'auto-ship-on-completion'
                  : advancedExtra.inventoryLinkage?.lastTransition?.action;
              logActivity('salesOrder.statusChange', created.id, {
                orderNumber: transitionResult.updated.orderNumber,
                fromStatus: defaultStatus,
                toStatus: createSkipInitialTarget,
                autoAdvanceOnCreate: true,
                ...(inventoryAction ? { inventoryAction } : {}),
              });
            } else {
              notifications.show({
                color: 'yellow',
                title: t('salesOrders.notifications.createAutoAdvanceFailedTitle'),
                message: t('salesOrders.notifications.createAutoAdvanceFailedBody'),
                autoClose: 30_000,
              });
            }
          }

          navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', res.salesOrder.id));
        }
      } catch (err) {
        logger.error('Sales order form submit failed:', err);
        if (err instanceof EntityConflictError) {
          if (err.latest) {
            const latest = err.latest as SalesOrder;
            snapshotRef.current = latest;

            const latestExtra = latest.extra as SalesOrderExtra | undefined;
            setLockedByReservation(shouldLockLineEdits(latestExtra?.status ?? ''));
            setOwnReservedSnapshot(latestExtra?.inventoryLinkage?.reservedSnapshot);
            setInventoryLinkageState(latestExtra?.inventoryLinkage?.state);
          }
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
              ? t('salesOrders.notifications.updateError')
              : t('salesOrders.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [
      isEdit,
      id,
      t,
      navigate,
      forceRefresh,
      defaultStatus,
      currentEmployeeId,
      currentEmployee,
      skipInitial,
      productByCode,
      inventoryByProduct,
      formAttachments,
      customerMap,
      splitNotesCfg,
    ],
  );

  if (isMobile) return null;
  if (fetching) return null;

  const pageTitle = isEdit ? t('salesOrders.editItem') : t('salesOrders.addItem');

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <Button
          onClick={() => window.history.back()}
          variant="subtle"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('__new__.01-common.actions.back')}
        </Button>
      </Group>

      <Title order={3}>{pageTitle}</Title>

      <Card withBorder radius="md" p="xl">
        <Form
          form={form}
          onSubmit={handleSubmit}
          onError={() => {
            notifications.show({
              color: 'red',
              message: t('common.validation.formInvalid'),
            });
          }}
        >
          <Stack gap="md">
            {/* Initial-status intent — create-only, only when the initial
                status carries `autoAdvancesOnCreate`. Default = advance.
                Operator flips to "stay in initial" for orders that need a
                review step before reservation. */}
            {!isEdit && createSkipInitialTarget && (
              <SegmentTabs<'initial' | 'advance'>
                value={skipInitial ? 'advance' : 'initial'}
                onChange={(v) => setSkipInitial(v === 'advance')}
                data={[
                  {
                    value: 'initial',
                    label:
                      salesOrderFieldOptions.resolveStatus(defaultStatus).label || defaultStatus,
                  },
                  {
                    value: 'advance',
                    label:
                      salesOrderFieldOptions.resolveStatus(createSkipInitialTarget).label ||
                      createSkipInitialTarget,
                  },
                ]}
              />
            )}

            {/* Order Number + Customer PO Number. The compact layout hides the
                auto-generated (disabled) SO-number field entirely — it's still
                set on save — and moves the PO number into the header grid below. */}
            {variant.headerLayout === 'twoColumn' && (
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label={t('salesOrders.form.orderNumberLabel')}
                  placeholder={t('salesOrders.form.orderNumberAutoPlaceholder')}
                  disabled
                  {...form.getInputProps('orderNumber')}
                />
                <TextInput
                  label={t('salesOrders.form.customerPONumberLabel')}
                  placeholder={t('salesOrders.form.customerPONumberPlaceholder')}
                  {...form.getInputProps('customerPONumber')}
                />
              </SimpleGrid>
            )}

            {/* Customer + Delivery Address */}
            {hasCustomerRegistry && (
              <Switch
                label={t('salesOrders.form.isIndividualCustomerLabel')}
                description={t('salesOrders.form.isIndividualCustomerDesc')}
                checked={form.getValues().isIndividualCustomer}
                onChange={(e) => handleIndividualCustomerToggle(e.currentTarget.checked)}
              />
            )}
            {(() => {
              const selectedCustomer = form.getValues().customerId
                ? customerMap.get(form.getValues().customerId)
                : undefined;
              const billing = selectedCustomer?.address?.trim();
              const shipping = selectedCustomer?.extra?.shippingAddresses ?? [];

              const addressOptionGroups = [
                ...(billing
                  ? [
                      {
                        group: t('customers.detail.billingAddress'),
                        items: [{ value: BILLING_ADDRESS_ID, label: billing }],
                      },
                    ]
                  : []),
                ...(shipping.length > 0
                  ? [
                      {
                        group: t('customers.detail.shippingAddress'),
                        items: shipping.map((s) => ({ value: s.id, label: s.address })),
                      },
                    ]
                  : []),
              ];
              const showAddressPicker =
                variant.showAddressPicker &&
                !form.getValues().isIndividualCustomer &&
                addressOptionGroups.length > 0;
              const customerField =
                hasCustomerRegistry && !form.getValues().isIndividualCustomer ? (
                  variant.customerPicker === 'nameCodeSelect' ? (
                    <Select
                      label={t('common.labels.customer')}
                      placeholder={t('salesOrders.form.customerPlaceholder')}
                      withAsterisk
                      searchable
                      data={customerNameCodeData}
                      value={form.getValues().customerId || null}
                      onChange={(id) => {
                        const c = id ? customerMap.get(id) : undefined;
                        handleCustomerChange(
                          c
                            ? { id: c.id, name: c.extra?.shortName?.trim() || c.name, customer: c }
                            : null,
                        );
                      }}
                      error={form.errors.customerId}
                    />
                  ) : (
                    <CustomerSelector
                      label={t('common.labels.customer')}
                      placeholder={t('salesOrders.form.customerPlaceholder')}
                      withAsterisk
                      value={form.getValues().customerId || null}
                      onChange={handleCustomerChange}
                      error={form.errors.customerId}
                    />
                  )
                ) : (
                  <TextInput
                    label={t('salesOrders.form.customerNameLabel')}
                    placeholder={t('salesOrders.form.customerNamePlaceholder')}
                    withAsterisk
                    {...form.getInputProps('customerName')}
                  />
                );
              const addressPickerField = showAddressPicker && (
                <Select
                  label={t('salesOrders.form.savedAddressLabel')}
                  placeholder={t('salesOrders.form.savedAddressPlaceholder')}
                  data={addressOptionGroups}
                  searchable
                  clearable
                  value={shippingAddressId || null}
                  onChange={handlePickAddress}
                />
              );
              const deliveryAddressField = (
                <TextInput
                  label={t('common.labels.deliveryAddress')}
                  placeholder={t('salesOrders.form.deliveryAddressPlaceholder')}
                  disabled={!form.getValues().customerId && !form.getValues().isIndividualCustomer}
                  {...form.getInputProps('deliveryAddress')}
                />
              );
              const googleMapField = (
                <TextInput
                  label={t('salesOrders.form.googleMapUrlLabel')}
                  placeholder={t('salesOrders.form.googleMapUrlPlaceholder')}
                  {...form.getInputProps('googleMapUrl')}
                />
              );
              return variant.headerLayout === 'compactFourColumn' ? (
                <SimpleGrid cols={COMPACT_FORM_COLS}>
                  <TextInput
                    label={t('salesOrders.form.customerPONumberLabel')}
                    placeholder={t('salesOrders.form.customerPONumberPlaceholder')}
                    {...form.getInputProps('customerPONumber')}
                  />
                  {customerField}
                  {addressPickerField}
                  {deliveryAddressField}
                  {googleMapField}
                </SimpleGrid>
              ) : (
                <>
                  <SimpleGrid cols={{ base: 1, sm: showAddressPicker ? 2 : 1 }}>
                    {customerField}
                    {addressPickerField}
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {deliveryAddressField}
                    {googleMapField}
                  </SimpleGrid>
                </>
              );
            })()}

            {/* Assigned Staff + Delivery Method + dates — one packed 4-col row
                in the compact layout, two 2-col grids otherwise. */}
            {(() => {
              const staffField = (
                <EmployeeSelector
                  label={t('salesOrders.form.assignedStaffLabel')}
                  placeholder={t('salesOrders.form.assignedStaffPlaceholder')}
                  clearable
                  filter={picEmployeeFilter}
                  value={form.getValues().assignedStaff || null}
                  onChange={(v) => form.setFieldValue('assignedStaff', v?.id ?? '')}
                />
              );
              const deliveryMethodField = deliveryMethodOptions.length > 0 && (
                <Select
                  label={t('salesOrders.form.deliveryMethodLabel')}
                  placeholder={t('salesOrders.form.deliveryMethodPlaceholder')}
                  data={deliveryMethodOptions}
                  value={form.getValues().deliveryMethod || null}
                  onChange={(v) => {
                    form.setFieldValue('deliveryMethod', v ?? '');

                    if (variant.clientSpecific?.NKTU?.deliveryMethodDrivesInternalDelivery) {
                      form.setFieldValue('isInternalDelivery', v === 'internal' || v === 'freight');
                    }
                  }}
                  clearable
                />
              );
              const orderDateField = (
                <DateField
                  label={t('salesOrders.form.orderDateLabel')}
                  placeholder={t('salesOrders.form.orderDatePlaceholder')}
                  value={form.getValues().orderDate}
                  {...form.getInputProps('orderDate')}
                />
              );
              const deliveryDateField = (
                <DateField
                  futureOnly
                  label={t('salesOrders.form.deliveryDateLabel')}
                  placeholder={t('salesOrders.form.deliveryDatePlaceholder')}
                  value={form.getValues().deliveryDate}
                  {...form.getInputProps('deliveryDate')}
                />
              );
              return variant.headerLayout === 'compactFourColumn' ? (
                <SimpleGrid cols={COMPACT_FORM_COLS}>
                  {staffField}
                  {deliveryMethodField}
                  {orderDateField}
                  {deliveryDateField}
                </SimpleGrid>
              ) : (
                <>
                  <SimpleGrid cols={{ base: 1, sm: deliveryMethodOptions.length > 0 ? 2 : 1 }}>
                    {staffField}
                    {deliveryMethodField}
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {orderDateField}
                    {deliveryDateField}
                  </SimpleGrid>
                </>
              );
            })()}

            {/* Tags */}
            {tagOptions.length > 0 && (
              <MultiSelect
                label={t('salesOrders.form.tagsLabel')}
                placeholder={t('salesOrders.form.tagsPlaceholder')}
                data={tagOptions}
                searchable
                clearable
                {...form.getInputProps('tags')}
              />
            )}

            {/* Urgent + Internal-delivery flags */}
            <SimpleGrid
              cols={{
                base: 1,
                sm:
                  variant.showInternalDeliverySwitch &&
                  deliveryRequestsEnabled &&
                  internalDeliveryAllowed
                    ? 2
                    : 1,
              }}
            >
              <Switch
                label={t('salesOrders.form.isUrgentLabel')}
                description={t('salesOrders.form.isUrgentDesc')}
                color="red"
                checked={form.getValues().isUrgent}
                onChange={(e) => form.setFieldValue('isUrgent', e.currentTarget.checked)}
              />
              {variant.showInternalDeliverySwitch &&
                deliveryRequestsEnabled &&
                internalDeliveryAllowed && (
                  <Switch
                    label={t('salesOrders.form.isInternalDeliveryLabel')}
                    description={t('salesOrders.form.isInternalDeliveryDesc')}
                    checked={form.getValues().isInternalDelivery}
                    onChange={(e) =>
                      form.setFieldValue('isInternalDelivery', e.currentTarget.checked)
                    }
                  />
                )}
            </SimpleGrid>

            {/* Notes — with `splitNotes`, the general order note stays
                authorable ALONGSIDE the two department-scoped notes
                (2026-07-02); the visibility gates hide the other department's
                note, never the general one. Every other client keeps the
                single order note. */}
            {splitNotesCfg ? (
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Textarea
                  label={t('salesOrders.form.generalNoteLabel')}
                  autosize
                  minRows={2}
                  maxRows={4}
                  {...form.getInputProps('notes')}
                />
                {!isNoteDriverDept && (
                  <Textarea
                    label={t('salesOrders.form.warehouseNoteLabel')}
                    autosize
                    minRows={2}
                    maxRows={4}
                    {...form.getInputProps('warehouseNote')}
                  />
                )}
                {!isNoteWarehouseDept && (
                  <Textarea
                    label={t('salesOrders.form.driverNoteLabel')}
                    autosize
                    minRows={2}
                    maxRows={4}
                    {...form.getInputProps('driverNote')}
                  />
                )}
              </SimpleGrid>
            ) : (
              <Textarea
                label={t('__new__.01-common.labels.note')}
                placeholder={t('salesOrders.form.notesPlaceholder')}
                autosize
                minRows={2}
                maxRows={4}
                {...form.getInputProps('notes')}
              />
            )}

            {/* Line items */}
            <Stack gap="xs">
              <Group justify="space-between" align="center" wrap="wrap">
                <Title order={6}>{t('salesOrders.form.itemsTitle')}</Title>
                <Group gap="xs" wrap="wrap">
                  {variant.showDownloadTemplateButton && (
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      leftSection={<IconDownload size={14} />}
                      onClick={handleDownloadTemplate}
                    >
                      {t('salesOrders.form.downloadTemplateButton')}
                    </Button>
                  )}
                  <FileButton onChange={handleImportItems} accept=".xlsx,.xls,.csv">
                    {(props) => (
                      <Button
                        {...props}
                        variant="light"
                        size="compact-sm"
                        disabled={lockedByReservation}
                        leftSection={<IconUpload size={14} />}
                      >
                        {t('salesOrders.form.importItemsButton')}
                      </Button>
                    )}
                  </FileButton>
                  <Button
                    variant="light"
                    size="compact-sm"
                    disabled={lockedByReservation}
                    leftSection={<IconPlus size={14} />}
                    onClick={() => form.insertListItem('items', { ...emptyItem })}
                  >
                    {t('salesOrders.form.addItem')}
                  </Button>
                </Group>
              </Group>

              {lockedByReservation && (
                <Alert color="blue" variant="light" icon={<IconAlertTriangle size={16} />}>
                  {t('salesOrders.form.lockedByReservation')}
                </Alert>
              )}

              {lineShortages.length > 0 && (
                <Alert
                  color="orange"
                  variant="light"
                  icon={<IconAlertTriangle size={16} />}
                  title={t('salesOrders.form.shortageAlertTitle')}
                >
                  <Stack gap={2}>
                    {lineShortages.map((s) => {
                      const locationLabel = isDefaultLocation(s.locationCode)
                        ? t('common.labels.defaultLocation')
                        : (locationByCode.get(s.locationCode) ?? s.locationCode);
                      return (
                        <Text key={`${s.idx}-${s.productCode}`} size="sm">
                          {t('salesOrders.form.shortageAlertLine', {
                            productName: s.productName || s.productCode,
                            requested: s.quantity.toLocaleString(),
                            unit: lookupLabelOf(unitLabels, s.unit),
                            available: s.available.toLocaleString(),
                            location: locationLabel,
                            short: s.short.toLocaleString(),
                          })}
                        </Text>
                      );
                    })}
                  </Stack>
                </Alert>
              )}

              <DesktopItemTable
                form={form}
                productSelectData={productSelectData}
                onProductSelect={handleProductSelect}
                onParentQuantityChange={handleParentQuantityChange}
                onParentLocationChange={handleParentLocationChange}
                onRemove={handleRemoveItem}
                onExplodeSet={handleExplodeSet}
                t={t}
                locationSelectData={locationSelectData}
                lineAvailability={lineAvailability}
                breakdownCoverage={breakdownCoverage}
                unitAvailability={unitAvailability}
                locationByCode={locationByCode}
                unitLabels={unitLabels}
                productByCode={productByCode}
                locked={lockedByReservation}
                showPhotoButton={variant.itemProductPhotoButton && productImagesEnabled}
                onShowPhotos={(code, name) => setPhotoProduct({ code, name })}
              />

              {/* Total amount */}
              {pricingEnabled && (
                <Group justify="flex-end" mt="xs">
                  <Text size="sm" fw={600}>
                    {t('salesOrders.form.totalAmountLabel')}:
                  </Text>
                  <Text size="sm" fw={700}>
                    {totalAmount.toLocaleString()}
                  </Text>
                </Group>
              )}

              {/* Billing / payment — pricing-gated */}
              {pricingEnabled && (
                <Stack gap="sm" mt="xs">
                  <Divider label={t('salesOrders.billing.section')} labelPosition="left" />
                  {variant.showVatShippingToggles && (
                    <Group gap="xl">
                      <Switch
                        label={t('salesOrders.billing.needVatLabel')}
                        {...form.getInputProps('needVAT', { type: 'checkbox' })}
                      />
                      <Switch
                        label={t('salesOrders.billing.needShippingFeeLabel')}
                        {...form.getInputProps('needShippingFee', { type: 'checkbox' })}
                      />
                    </Group>
                  )}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <NumberInput
                      label={t('salesOrders.billing.vatRateLabel')}
                      placeholder={String(DEFAULT_VAT_PERCENT)}
                      suffix="%"
                      min={0}
                      max={100}
                      {...form.getInputProps('vatRatePercent')}
                    />
                    {variant.showVatTag && (
                      <TextInput
                        label={t('salesOrders.billing.vatTagLabel')}
                        placeholder={t('salesOrders.billing.vatTagPlaceholder')}
                        {...form.getInputProps('vatTag')}
                      />
                    )}
                    {variant.showShippingFee && (
                      <NumberInput
                        label={t('salesOrders.billing.shippingFeeLabel')}
                        placeholder={t('salesOrders.billing.shippingFeePlaceholder')}
                        min={0}
                        thousandSeparator=","
                        {...form.getInputProps('shippingFee')}
                      />
                    )}
                    <NumberInput
                      label={t('salesOrders.billing.paidAmountLabel')}
                      description={t('salesOrders.billing.paidAmountDescription')}
                      placeholder={t('salesOrders.billing.paidAmountPlaceholder')}
                      min={0}
                      thousandSeparator=","
                      {...form.getInputProps('paidAmount')}
                    />
                  </SimpleGrid>
                  <Group gap="xl">
                    <Switch
                      label={t('salesOrders.billing.isPaidLabel')}
                      {...form.getInputProps('isPaid', { type: 'checkbox' })}
                    />
                    <Switch
                      label={t('salesOrders.billing.invoiceIssuedLabel')}
                      {...form.getInputProps('invoiceIssued', { type: 'checkbox' })}
                    />
                  </Group>
                </Stack>
              )}
            </Stack>

            {/* Attachments */}
            <Divider label={t('attachments.title')} labelPosition="left" />
            <AttachmentPanel
              attachments={formAttachments}
              onChange={handleAttachmentsChange}
              imageDirectory={imageDirectory}
              editable
              currentUserId={currentEmployee?.id}
              currentUserName={currentEmployee?.name}
              onClaimFiles={handleClaimExcelFiles}
              claimHint={t('salesOrders.form.dropExcelHint')}
            />

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                size="sm"
                disabled={loading}
                onClick={() => navigate(ROUTES.SALES_ORDERS.LIST)}
              >
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" loading={loading} size="sm">
                {isEdit ? t('salesOrders.form.updateButton') : t('salesOrders.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </Form>
      </Card>

      {/* Per-line product photos. Keyed by code so switching lines remounts it
          with a fresh active-photo index — no effect to keep them in sync. */}
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

type ProductSelectOption = {
  value: string;
  label: string;
  name: string;
  unit: string;
  price: number;
  isSet: boolean;
  product: Product;
};

type ItemEditorProps = {
  form: ReturnType<typeof useForm<SalesOrderFormValues>>;
  productSelectData: ProductSelectOption[];
  onProductSelect: (idx: number, opt: ProductSelectorChange | null) => void;

  onParentQuantityChange: (idx: number, nextQty: number) => void;

  onParentLocationChange: (idx: number, nextLocation: string) => void;

  onRemove: (idx: number) => void;

  onExplodeSet: (groupId: string) => void;
  t: TFunction;
  locationSelectData: { value: string; label: string }[];
  lineAvailability: (productCode: string, locationCode: string) => LocationAvailability | null;

  breakdownCoverage: (
    productCode: string,
    locationCode: string,
    quantity: number,
    unit: string,
  ) => BreakdownCoverage | null;

  unitAvailability: (productCode: string, locationCode: string, unit: string) => number | null;
  locationByCode: Map<string, string>;

  unitLabels: Map<string, string>;

  productByCode: Map<string, Product>;

  locked: boolean;

  showPhotoButton: boolean;

  onShowPhotos: (productCode: string, productName: string) => void;
};

function AvailabilityHint({
  productCode,
  locationCode,
  quantity,
  unit,
  lineAvailability,
  breakdownCoverage,
  locationByCode,
  unitLabels,
  productByCode,
  t,
}: {
  productCode: string;
  locationCode: string;
  quantity: number;
  unit: string;
  lineAvailability: ItemEditorProps['lineAvailability'];
  breakdownCoverage: ItemEditorProps['breakdownCoverage'];
  locationByCode: Map<string, string>;
  unitLabels: Map<string, string>;
  productByCode: Map<string, Product>;
  t: TFunction;
}) {
  if (!productCode) return null;
  const avail = lineAvailability(productCode, locationCode);
  if (!avail) {
    return (
      <Text size="xs" c="dimmed">
        {t('salesOrders.form.availabilityUnknown')}
      </Text>
    );
  }
  const locLabel = isDefaultLocation(avail.locationCode)
    ? t('common.labels.defaultLocation')
    : (locationByCode.get(avail.locationCode) ?? avail.locationCode);
  const unitLabel = unit ? lookupLabelOf(unitLabels, unit) : '';

  const coverage = breakdownCoverage(productCode, locationCode, quantity, unit);
  if (coverage?.parentLock) {
    const lockLine = (
      <Text size="xs" c="dimmed">
        {t('salesOrders.form.availabilityBreakdownLock', {
          count: coverage.parentLock.quantity.toLocaleString(),
          parentName: coverage.parentLock.product.name,
        })}
      </Text>
    );
    if (coverage.residual <= 0) {
      return (
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t('salesOrders.form.availabilityOk', {
              available: avail.available.toLocaleString(),
              unit: unitLabel,
              location: locLabel,
            })}
          </Text>
          {lockLine}
        </Stack>
      );
    }
    return (
      <Stack gap={2}>
        <Text size="xs" c="red" fw={500}>
          {t('salesOrders.form.availabilityShort', {
            available: avail.available.toLocaleString(),
            unit: unitLabel,
            location: locLabel,
            short: coverage.residual.toLocaleString(),
          })}
        </Text>
        {lockLine}
      </Stack>
    );
  }

  const short = quantity - avail.available;
  if (short > 0) {
    const product = productByCode.get(productCode);
    const isSet = (product?.extra?.setItems?.length ?? 0) > 0;
    return (
      <Stack gap={2}>
        <Text size="xs" c="red" fw={500}>
          {t('salesOrders.form.availabilityShort', {
            available: avail.available.toLocaleString(),
            unit: unitLabel,
            location: locLabel,
            short: short.toLocaleString(),
          })}
        </Text>
        {isSet && canViewSetComponentInventory && (
          <Text size="xs" c="dimmed">
            {t('salesOrders.form.setComponentsAvailableTitle', {
              count: short.toLocaleString(),
              unit: unitLabel,
            })}
          </Text>
        )}
      </Stack>
    );
  }
  return (
    <Text size="xs" c="dimmed">
      {t('salesOrders.form.availabilityOk', {
        available: avail.available.toLocaleString(),
        unit: unitLabel,
        location: locLabel,
      })}
    </Text>
  );
}

function ChildAvailabilityHint({
  productCode,
  locationCode,
  unit,
  componentNeed,
  unitAvailability,
  unitLabels,
  t,
}: {
  productCode: string;
  locationCode: string;
  unit: string;
  componentNeed: number;
  unitAvailability: ItemEditorProps['unitAvailability'];
  unitLabels: Map<string, string>;
  t: TFunction;
}) {
  if (!productCode) return null;
  const available = unitAvailability(productCode, locationCode, unit);
  if (available === null) {
    return (
      <Text size="xs" c="dimmed">
        {t('salesOrders.form.availabilityUnknown')}
      </Text>
    );
  }
  const unitLabel = unit ? lookupLabelOf(unitLabels, unit) : '';
  const shortBy = componentNeed > 0 ? componentNeed - available : 0;
  if (componentNeed > 0) {
    return (
      <Text size="xs" c={shortBy > 0 ? 'red' : 'dimmed'} fw={shortBy > 0 ? 500 : undefined}>
        {t('salesOrders.form.availabilityChildNeedOk', {
          available: available.toLocaleString(),
          unit: unitLabel,
          required: componentNeed.toLocaleString(),
        })}
        {shortBy > 0 &&
          ` · ${t('salesOrders.form.setComponentShortSuffix', { short: shortBy.toLocaleString() })}`}
      </Text>
    );
  }
  return (
    <Text size="xs" c="dimmed">
      {t('salesOrders.form.availabilityChildOk', {
        available: available.toLocaleString(),
        unit: unitLabel,
      })}
    </Text>
  );
}

function UnitField({
  form,
  idx,
  unit,
  unitLabels,
  productSelectData,
  locked,
  label,
  t,
}: {
  form: ReturnType<typeof useForm<SalesOrderFormValues>>;
  idx: number;
  unit: string;
  unitLabels: Map<string, string>;
  productSelectData: ItemEditorProps['productSelectData'];
  locked: boolean;
  label?: string;
  t: TFunction;
}) {
  const isReadOnly = productSelectData.length > 0 || locked;
  if (isReadOnly) {
    return (
      <TextInput
        size="xs"
        label={label}
        placeholder={t('common.labels.unit')}
        readOnly
        value={lookupLabelOf(unitLabels, unit, '')}
      />
    );
  }
  return (
    <TextInput
      size="xs"
      label={label}
      placeholder={t('common.labels.unit')}
      {...form.getInputProps(`items.${idx}.unit`)}
    />
  );
}

function DesktopItemTable({
  form,
  productSelectData,
  onProductSelect,
  onParentQuantityChange,
  onParentLocationChange,
  onRemove,
  onExplodeSet,
  t,
  locationSelectData,
  lineAvailability,
  breakdownCoverage,
  unitAvailability,
  locationByCode,
  unitLabels,
  productByCode,
  locked,
  showPhotoButton,
  onShowPhotos,
}: ItemEditorProps) {
  const extraQtyEnabled = isExtraDeliveryQuantityAllowed();
  const showLocationCol = locationsEnabled && locationSelectData.length > 0;
  const items = form.getValues().items;

  const groupContext = useMemo(() => {
    const ctx = new Map<string, { parentQty: number; additionalSets: number }>();
    for (const item of items) {
      if (item.role !== 'set' || !item.groupId) continue;
      const avail = lineAvailability(item.productCode, item.fromLocationCode);
      const parentAvailable = avail?.available ?? 0;
      const additionalSets = Math.max(item.quantity - parentAvailable, 0);
      ctx.set(item.groupId, { parentQty: item.quantity, additionalSets });
    }
    return ctx;
  }, [items, lineAvailability]);
  return (
    <Table withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: 200 }}>{t('common.labels.product')}</Table.Th>
          <Table.Th style={{ width: 80 }}>{t('common.labels.quantity')}</Table.Th>
          <Table.Th style={{ width: 90 }}>{t('common.labels.unit')}</Table.Th>
          <Table.Th style={{ width: 150 }}>{t('common.labels.inventory')}</Table.Th>
          {showLocationCol && (
            <Table.Th style={{ width: 250 }}>{t('salesOrders.form.fromLocationLabel')}</Table.Th>
          )}
          {pricingEnabled && (
            <>
              <Table.Th style={{ width: 130 }}>{t('common.labels.unitPrice')}</Table.Th>
              <Table.Th style={{ width: 120, textAlign: 'right' }}>
                {t('common.detail.lineTotal')}
              </Table.Th>
            </>
          )}
          <Table.Th style={{ width: 120, textAlign: 'right' }}>
            {t('salesOrders.form.itemMemoLabel')}
          </Table.Th>
          <Table.Th style={{ width: 10 }} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map((item, idx) => {
          const isSetParent = item.role === 'set';
          const isSetChild = item.role === 'set-component';

          const rowLocked = locked || isSetChild;
          const codeColor = isSetParent
            ? `var(--mantine-color-${PRODUCT_SET_COLOR}-0)`
            : isSetChild
              ? 'var(--mantine-color-gray-0)'
              : undefined;

          const lineProduct = productByCode.get(item.productCode);
          const hasPhoto = (lineProduct?.extra?.images?.length ?? 0) > 0;
          const suggestedPrice = getProductSuggestedPrice(lineProduct);
          const belowSuggested = !isSetChild && isBelowSuggestedPrice(lineProduct, item.unitPrice);
          return (
            <Table.Tr key={idx} bg={codeColor}>
              <Table.Td>
                <Group>
                  {isSetChild ? (
                    <Stack gap={2} pl="md">
                      <Group gap={6} wrap="nowrap">
                        <Text size="xs" c="dimmed">
                          ↳
                        </Text>
                        <Text size="xs" ff="monospace" c="dimmed">
                          {item.productCode}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {item.productName}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {t('salesOrders.form.setComponentChildLabel', {
                          setName: item.sourceSetCode,
                        })}
                      </Text>
                    </Stack>
                  ) : productSelectData.length > 0 ? (
                    <Stack gap={2}>
                      <Group gap={6} wrap="nowrap" align="center">
                        {isSetParent && (
                          <IconBoxMultiple
                            size={14}
                            style={{
                              flexShrink: 0,
                              color: `var(--mantine-color-${PRODUCT_SET_COLOR}-6)`,
                            }}
                          />
                        )}
                        <ProductSelector
                          size="xs"
                          searchable
                          disabled={locked}
                          placeholder={t('common.labels.productName')}
                          code={item.productCode || null}
                          name={item.productName || null}
                          filter={(p) => p.isActive && !p.extra?.isDeleted}
                          onChange={(opt) => onProductSelect(idx, opt)}
                          error={form.errors[`items.${idx}.productCode`]}
                          style={{ flex: 1 }}
                        />
                      </Group>
                      {isSetParent && (
                        <Badge
                          size="xs"
                          variant="light"
                          color={PRODUCT_SET_COLOR}
                          radius="sm"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {t('salesOrders.form.setParentBadge')}
                        </Badge>
                      )}
                    </Stack>
                  ) : (
                    <Stack gap={2}>
                      <TextInput
                        size="xs"
                        disabled={locked}
                        placeholder={t('common.labels.code')}
                        {...form.getInputProps(`items.${idx}.productCode`)}
                      />
                      <TextInput
                        size="xs"
                        placeholder={t('common.labels.name')}
                        disabled={rowLocked}
                        {...form.getInputProps(`items.${idx}.productName`)}
                      />
                    </Stack>
                  )}
                  {/* Verify the picked goods before the order exists. Rendered
                      for set children too — a wrong component is as costly as a
                      wrong parent. Dimmed when the product carries no photo, so
                      the row itself tells the operator whether a reference shot
                      exists; still clickable, and the modal says so plainly. */}
                  {showPhotoButton && item.productCode && (
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
                        disabled={!hasPhoto}
                        onClick={() => onShowPhotos(item.productCode, item.productName)}
                      >
                        <IconPhoto size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <NumberField
                    size="xs"
                    min={isSetParent ? 1 : 0}
                    disabled={rowLocked}
                    placeholder={t('common.labels.quantity')}
                    value={item.quantity}
                    emptyValue={0}
                    onChange={(n) => {
                      if (isSetParent) {
                        onParentQuantityChange(idx, n);
                      } else {
                        form.setFieldValue(`items.${idx}.quantity`, n);
                      }
                    }}
                  />
                  {/* Extra ("spare") qty — standalone lines only. Shipped from
                      stock on top of the ordered qty; not billed. */}
                  {extraQtyEnabled && !isSetParent && !isSetChild && (
                    <NumberField
                      size="xs"
                      min={0}
                      disabled={rowLocked}
                      leftSection={
                        <Text size="9px" c="dimmed" fw={600}>
                          +
                        </Text>
                      }
                      placeholder={t('salesOrders.form.extraQuantityPlaceholder')}
                      value={item.extraQuantity}
                      onChange={(n) => {
                        form.setFieldValue(
                          `items.${idx}.extraQuantity`,
                          n && n > 0 ? n : undefined,
                        );
                      }}
                    />
                  )}
                </Stack>
              </Table.Td>
              <Table.Td>
                <UnitField
                  form={form}
                  idx={idx}
                  unit={item.unit}
                  unitLabels={unitLabels}
                  productSelectData={productSelectData}
                  locked={rowLocked}
                  t={t}
                />
              </Table.Td>
              <Table.Td>
                {isSetChild ? (
                  canViewSetComponentInventory &&
                  (() => {
                    const ctx = item.groupId ? groupContext.get(item.groupId) : undefined;
                    const componentNeed =
                      ctx && ctx.parentQty > 0
                        ? (item.quantity / ctx.parentQty) * ctx.additionalSets
                        : 0;
                    return (
                      <ChildAvailabilityHint
                        productCode={item.productCode}
                        locationCode={item.fromLocationCode}
                        unit={item.unit}
                        componentNeed={componentNeed}
                        unitAvailability={unitAvailability}
                        unitLabels={unitLabels}
                        t={t}
                      />
                    );
                  })()
                ) : (
                  <AvailabilityHint
                    productCode={item.productCode}
                    locationCode={item.fromLocationCode}
                    quantity={getLinePhysicalQuantity(item)}
                    unit={item.unit}
                    lineAvailability={lineAvailability}
                    breakdownCoverage={breakdownCoverage}
                    locationByCode={locationByCode}
                    unitLabels={unitLabels}
                    productByCode={productByCode}
                    t={t}
                  />
                )}
              </Table.Td>
              {showLocationCol && (
                <Table.Td>
                  {isSetChild ? (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  ) : (
                    <Select
                      size="xs"
                      data={locationSelectData}
                      searchable
                      disabled={rowLocked}
                      placeholder={t('salesOrders.form.fromLocationPlaceholder')}
                      value={item.fromLocationCode || DEFAULT_LOCATION_CODE}
                      onChange={(v) => onParentLocationChange(idx, v || DEFAULT_LOCATION_CODE)}
                    />
                  )}
                </Table.Td>
              )}
              {pricingEnabled && (
                <>
                  <Table.Td>
                    {isSetChild ? (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    ) : (
                      <Stack gap={2}>
                        <NumberInput
                          size="xs"
                          min={0}
                          disabled={locked}
                          thousandSeparator=","
                          placeholder={t('common.form.unitPricePlaceholder')}
                          {...form.getInputProps(`items.${idx}.unitPrice`)}
                          styles={
                            belowSuggested
                              ? {
                                  input: {
                                    borderColor: 'var(--mantine-color-orange-5)',
                                    color: 'var(--mantine-color-orange-7)',
                                  },
                                }
                              : undefined
                          }
                        />
                        {belowSuggested && suggestedPrice !== undefined && (
                          <Text size="xs" c="orange.7" lh={1.2}>
                            {t('salesOrders.form.belowSuggestedPriceHint', {
                              price: suggestedPrice.toLocaleString(),
                            })}
                          </Text>
                        )}
                      </Stack>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" fw={500}>
                      {isSetChild ? '—' : (item.quantity * item.unitPrice).toLocaleString()}
                    </Text>
                  </Table.Td>
                </>
              )}
              <Table.Td>
                {(isSetParent || !item.groupId) && (
                  <TextInput
                    size="xs"
                    variant="filled"
                    placeholder={t('salesOrders.form.itemMemoPlaceholder')}
                    {...form.getInputProps(`items.${idx}.memo`)}
                  />
                )}
              </Table.Td>
              <Table.Td>
                <Group gap={2} wrap="nowrap" justify="flex-end">
                  {isSetParent && item.groupId && !locked && (
                    <Tooltip label={t('salesOrders.form.setExplodeTooltip')} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color={PRODUCT_SET_COLOR}
                        size="sm"
                        onClick={() => onExplodeSet(item.groupId!)}
                      >
                        <IconScissors size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {!isSetChild && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      disabled={locked}
                      onClick={() => onRemove(idx)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
