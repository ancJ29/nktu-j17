

import { appConfig } from '@/config';
import { buildDailySequentialCode, businessDateString } from '@/utils/code';
import { cMngtConnector } from '@credo/connectors/connector';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { logActivity } from '@/utils/activityLogger';
import type {
  DeliveryRequest,
  DeliveryRequestActivityEntry,
  DeliveryRequestExtra,
  DeliveryRequestInboundKind,
  DeliveryRequestItem,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';
import type { CMngtDeliveryRequestDirection } from '@credo/connectors/types';
import { getInitialStatusValueForCreate } from './transitionEngine';
import { statusHasCapability as soStatusHasCapability } from '@/pages/sales-orders/transitionEngine';
import { diffItems, partyMemo, toMemoItem } from './activityMemo';
import { linkDRToSalesOrder } from './linkToSalesOrder';

export function mergeSalesOrderDriverNote(
  operatorNote: string,
  so: SalesOrder | undefined | null,
): string {
  const driverNote = (
    (so?.extra ?? {}) as SalesOrderExtra
  ).clientSpecific?.NKTU?.driverNote?.trim();
  const base = operatorNote.trim();
  if (base && driverNote) return `${base}\n${driverNote}`;
  return base || driverNote || '';
}

export type DeliveryRequestItemDraft = {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  
  fromLocationCode?: string;
};

export function buildRemainingItemsFromSalesOrder(
  soItems: SalesOrder['items'],
  salesOrderId: string,
  allDRs: DeliveryRequest[],
): DeliveryRequestItemDraft[] {
  
  
  
  const deliveredSoFar = new Map<string, number>();
  for (const dr of allDRs) {
    if (dr.salesOrderId !== salesOrderId) continue;
    if (dr.direction === 'inbound') continue;
    if (!dr.isClosed) continue;
    const deliveredItems =
      (
        dr.extra as {
          deliveredItems?: { productCode: string; unit: string; quantity: number }[];
        }
      )?.deliveredItems ?? [];
    for (const di of deliveredItems) {
      const k = `${di.productCode}::${di.unit}`;
      deliveredSoFar.set(k, (deliveredSoFar.get(k) ?? 0) + di.quantity);
    }
  }

  return soItems
    .filter((item) => item.role !== 'set-component')
    .map((item) => {
      const k = `${item.productCode}::${item.unit}`;
      const remaining = Math.max(item.quantity - (deliveredSoFar.get(k) ?? 0), 0);
      return { item, remaining };
    })
    .filter(({ remaining }) => remaining > 0)
    .map(({ item, remaining }) => ({
      productCode: item.productCode,
      productName: item.productName,
      quantity: remaining,
      unit: item.unit,
      unitPrice: item.unitPrice,
      fromLocationCode: item.fromLocationCode,
    }));
}

export function buildReturnableItemsFromSalesOrder(
  soItems: SalesOrder['items'],
  salesOrderId: string,
  allDRs: DeliveryRequest[],
): DeliveryRequestItemDraft[] {
  const delivered = new Map<string, number>();
  const returned = new Map<string, number>();
  let hasClosedOutboundDR = false;
  const add = (m: Map<string, number>, code: string, unit: string, qty: number) =>
    m.set(`${code}::${unit}`, (m.get(`${code}::${unit}`) ?? 0) + qty);

  for (const dr of allDRs) {
    if (dr.salesOrderId !== salesOrderId) continue;
    const extra = dr.extra as DeliveryRequestExtra | undefined;
    if (extra?.isDeleted) continue;
    const isReturn = extra?.inboundKind === 'customer-return';
    if (!isReturn && dr.direction === 'inbound') continue; 
    if (isReturn) {
      
      const lines = dr.isClosed
        ? (extra?.deliveredItems ?? [])
        : dr.items.map((i) => ({ productCode: i.productCode, unit: i.unit, quantity: i.quantity }));
      for (const l of lines) add(returned, l.productCode, l.unit, l.quantity);
    } else if (dr.isClosed) {
      hasClosedOutboundDR = true;
      for (const di of extra?.deliveredItems ?? [])
        add(delivered, di.productCode, di.unit, di.quantity);
    }
  }

  
  
  
  
  
  
  const useSOFallback = hasClosedOutboundDR && delivered.size === 0;

  return soItems
    .filter((item) => item.role !== 'set-component')
    .map((item) => {
      const k = `${item.productCode}::${item.unit}`;
      const deliveredQty = useSOFallback ? item.quantity : (delivered.get(k) ?? 0);
      const returnable = Math.max(deliveredQty - (returned.get(k) ?? 0), 0);
      return { item, returnable };
    })
    .filter(({ returnable }) => returnable > 0)
    .map(({ item, returnable }) => ({
      productCode: item.productCode,
      productName: item.productName,
      quantity: returnable,
      unit: item.unit,
      unitPrice: item.unitPrice,
      fromLocationCode: item.fromLocationCode,
    }));
}

export function salesOrderHasLinkedDeliveryRequest(salesOrderId: string): boolean {
  if (!salesOrderId) return false;
  const drs = useDeliveryRequestStore.getState().items as DeliveryRequest[];
  return drs.some(
    (d) =>
      d.salesOrderId === salesOrderId &&
      d.direction !== 'inbound' &&
      !(d.extra as DeliveryRequestExtra | undefined)?.isDeleted,
  );
}

export type CreateDeliveryRequestParams = {
  direction: CMngtDeliveryRequestDirection;
  
  inboundKind?: DeliveryRequestInboundKind;
  
  returnRestock?: boolean;
  
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  
  vendorCode: string;
  vendorName: string;
  
  deliveryAddress: string;
  googleMapUrl: string;
  
  scheduledDate: string | undefined;
  notes: string;
  items: DeliveryRequestItem[];
  assignedDriverId: string;
  assignedDriverName?: string;
  isUrgent: boolean;
  
  currentEmployee?: { id: string; name: string };
  
  initialStatus?: string;
  
  defaultStatus?: string;
  
  status?: string;
};

export async function createDeliveryRequestRecord(
  p: CreateDeliveryRequestParams,
): Promise<{ deliveryRequest: DeliveryRequest; linkFailed: boolean }> {
  const isInbound = p.direction === 'inbound';
  
  
  
  const isReturn = isInbound && p.inboundKind === 'customer-return';
  const carriesSalesOrder = !isInbound || isReturn;

  
  
  const sourceSalesOrder =
    carriesSalesOrder && p.salesOrderId
      ? (useSalesOrderStore.getState().getById(p.salesOrderId) as SalesOrder | undefined)
      : undefined;

  
  
  
  
  
  
  let soStatusCarriesReleasesDR = false;
  if (sourceSalesOrder && !isInbound) {
    const soStatus = ((sourceSalesOrder.extra ?? {}) as SalesOrderExtra).status ?? '';
    soStatusCarriesReleasesDR = !!soStatus && soStatusHasCapability(soStatus, 'releasesDR');
  }

  
  
  const notes = mergeSalesOrderDriverNote(p.notes, sourceSalesOrder);
  const initialStatus =
    p.status ||
    p.initialStatus ||
    getInitialStatusValueForCreate({ soStatusCarriesReleasesDR }) ||
    p.defaultStatus;

  
  
  const createdEntry: DeliveryRequestActivityEntry = {
    timestamp: new Date().toISOString(),
    action: 'created',
    toStatus: initialStatus,
    ...(p.currentEmployee && {
      userId: p.currentEmployee.id,
      userName: p.currentEmployee.name,
    }),
  };

  
  const isAdditional = !isInbound && salesOrderHasLinkedDeliveryRequest(p.salesOrderId);

  const extra: DeliveryRequestExtra = {
    status: initialStatus,
    activityLog: [createdEntry],
    
    deliveryAddress: p.deliveryAddress,
    ...(p.googleMapUrl && { googleMapUrl: p.googleMapUrl }),
    ...(p.assignedDriverId && {
      assignedDriverId: p.assignedDriverId,
      ...(p.assignedDriverName && { assignedDriverName: p.assignedDriverName }),
    }),
    ...(p.isUrgent && { isUrgent: true }),
    ...(isAdditional && { isAdditional: true }),
    
    
    ...(isInbound && p.inboundKind && p.inboundKind !== 'vendor' && { inboundKind: p.inboundKind }),
    
    ...(isReturn && { returnRestock: p.returnRestock ?? false }),
  };

  
  
  
  const today = businessDateString();
  const todaysRequests = await cMngtConnector.queryDeliveryRequests<DeliveryRequestExtra>({
    fromPeriod: today,
    toPeriod: today,
  });
  const requestNumber = buildDailySequentialCode(
    appConfig.features.deliveryRequests.codePrefix,
    todaysRequests.deliveryRequests.map((r) => r.requestNumber),
  );

  const res = await cMngtConnector.createDeliveryRequest<DeliveryRequestExtra>({
    requestNumber,
    direction: p.direction,
    
    
    ...(carriesSalesOrder
      ? {
          salesOrderId: p.salesOrderId || undefined,
          salesOrderNumber: p.salesOrderNumber || undefined,
        }
      : {}),
    customerName: p.customerName,
    vendorCode: p.vendorCode,
    vendorName: p.vendorName,
    scheduledDate: p.scheduledDate,
    notes,
    items: p.items,
    extra,
  });
  useDeliveryRequestStore.getState().invalidate();

  
  
  logActivity('deliveryRequest.create', res.deliveryRequest.id, {
    requestNumber: res.deliveryRequest.requestNumber,
    ...partyMemo({
      direction: p.direction,
      inboundKind: p.inboundKind,
      ...(carriesSalesOrder
        ? { salesOrderId: p.salesOrderId, salesOrderNumber: p.salesOrderNumber }
        : {}),
      customerName: p.customerName,
      vendorCode: p.vendorCode,
      vendorName: p.vendorName,
    }),
    lineCount: p.items.length,
    items: p.items.map(toMemoItem),
  });

  let linkFailed = false;
  if (carriesSalesOrder && p.salesOrderId) {
    try {
      await linkDRToSalesOrder(p.salesOrderId, res.deliveryRequest.id);
    } catch {
      linkFailed = true;
    }
  }

  return { deliveryRequest: res.deliveryRequest as DeliveryRequest, linkFailed };
}

export type UpdateDeliveryRequestParams = {
  id: string;
  
  snapshot: DeliveryRequest;
  
  customerName: string;
  vendorCode: string;
  vendorName: string;
  
  deliveryAddress: string;
  googleMapUrl: string;
  
  scheduledDate: string | undefined;
  
  notes: string;
  items: DeliveryRequestItem[];
  assignedDriverId: string;
  assignedDriverName?: string;
  isUrgent: boolean;
};

export async function updateDeliveryRequestRecord(
  p: UpdateDeliveryRequestParams,
): Promise<{ deliveryRequest: DeliveryRequest }> {
  const prevExtra = (p.snapshot.extra ?? {}) as DeliveryRequestExtra;
  const nextExtra: DeliveryRequestExtra = {
    ...prevExtra,
    
    
    deliveryAddress: p.deliveryAddress,
    ...(p.googleMapUrl ? { googleMapUrl: p.googleMapUrl } : { googleMapUrl: undefined }),
    ...(p.assignedDriverId
      ? {
          assignedDriverId: p.assignedDriverId,
          ...(p.assignedDriverName && { assignedDriverName: p.assignedDriverName }),
        }
      : { assignedDriverId: undefined, assignedDriverName: undefined }),
    
    isUrgent: p.isUrgent ? true : undefined,
  };

  const updated = (await useDeliveryRequestStore.getState().updateSafely({
    id: p.id,
    version: p.snapshot.version,
    patch: {
      customerName: p.customerName,
      vendorCode: p.vendorCode,
      vendorName: p.vendorName,
      scheduledDate: p.scheduledDate,
      notes: p.notes,
      items: p.items,
      extra: nextExtra,
    },
  })) as DeliveryRequest;

  
  
  
  const itemDiff = diffItems(p.snapshot.items, p.items);
  logActivity('deliveryRequest.update', p.id, {
    requestNumber: updated.requestNumber,
    lineCount: p.items.length,
    itemDiff,
  });

  return { deliveryRequest: updated };
}
