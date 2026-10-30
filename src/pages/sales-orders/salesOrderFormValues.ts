import type { Customer, SalesOrder, SalesOrderAttachment, SalesOrderExtra } from '@/types';
import { DEFAULT_LOCATION_CODE } from '@/types/location';
import { readWarehouseStaff } from './salesOrderWarehouseStaff';

export const DEFAULT_VAT_PERCENT = 8;

export type ItemFormValues = {
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

  isReady?: boolean;

  warehouseMemo?: string;
};

export type SalesOrderFormValues = {
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

  warehouseStaff: string[];
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

export function salesOrderFormValuesFromOrder(
  o: SalesOrder,
  customers: readonly Pick<Customer, 'id' | 'code' | 'name'>[],
): SalesOrderFormValues {
  const extra = o.extra as SalesOrderExtra;
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
    warehouseStaff: readWarehouseStaff(extra),
    isUrgent: extra?.isUrgent ?? false,
    tags: extra?.tags ?? [],
    needVAT: extra?.needVAT ?? true,
    needShippingFee: extra?.needShippingFee ?? false,
    vatRatePercent: typeof extra?.vatRate === 'number' ? extra.vatRate * 100 : DEFAULT_VAT_PERCENT,
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
      ...(item.isReady ? { isReady: true } : {}),
      ...(item.warehouseMemo ? { warehouseMemo: item.warehouseMemo } : {}),
    })),
  };
}

export function buildSalesOrderFormExtra(
  values: SalesOrderFormValues,
  ctx: {
    productWarehouseMemos: string;
    selectedCustomer: Pick<Customer, 'code'> | undefined;
    quotationLink: { id: string; code?: string } | null;
    formAttachments: SalesOrderAttachment[];
    pricingEnabled: boolean;
    deliveryRequestsEnabled: boolean;
    internalDeliveryAllowed: boolean;
    splitNotes: boolean;
  },
) {
  const {
    productWarehouseMemos,
    selectedCustomer,
    quotationLink,
    formAttachments,
    pricingEnabled,
    deliveryRequestsEnabled,
    internalDeliveryAllowed,
    splitNotes,
  } = ctx;
  return {
    ...(productWarehouseMemos && { productWarehouseMemos }),
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
    ...(values.warehouseStaff.length > 0 && { warehouseStaff: values.warehouseStaff }),
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

    ...(splitNotes && {
      clientSpecific: {
        NKTU: {
          ...(values.warehouseNote.trim() && { warehouseNote: values.warehouseNote.trim() }),
          ...(values.driverNote.trim() && { driverNote: values.driverNote.trim() }),
        },
      },
    }),
  } satisfies SalesOrderExtra;
}
