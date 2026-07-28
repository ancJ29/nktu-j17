import { DEFAULT_LOCATION_CODE } from '@/types/location';
import type { CMngtDeliveryRequestDirection as DeliveryRequestDirection } from '@credo/connectors/types';
import type {
  DeliveryRequest,
  DeliveryRequestExtra,
  DeliveryRequestInboundKind,
  DeliveryRequestItem,
} from '@/types';

export type DeliveryRequestMemoItem = {
  productCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  fromLocationCode?: string;
};

export type DeliveryRequestMemoLineFields = {
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  fromLocationCode?: string;
};

export type DeliveryRequestItemDiff = {
  added: DeliveryRequestMemoItem[];
  removed: DeliveryRequestMemoItem[];
  changed: {
    productCode: string;
    from: DeliveryRequestMemoLineFields;
    to: DeliveryRequestMemoLineFields;
  }[];
};

export type DeliveryRequestPartyMemo = {
  direction: DeliveryRequestDirection;

  inboundKind?: DeliveryRequestInboundKind;

  salesOrderId?: string;
  salesOrderNumber?: string;
  customerName?: string;

  vendorCode?: string;
  vendorName?: string;
};

export type DeliveryRequestInlineFields = {
  assignedDriverId?: { from?: string; to?: string };
  scheduledDate?: { from?: number; to?: number };
  deliveryAddress?: { changed: true };
  googleMapUrl?: { changed: true };
  notes?: { changed: true };
};

export function toMemoItem(item: DeliveryRequestItem): DeliveryRequestMemoItem {
  const out: DeliveryRequestMemoItem = {
    productCode: item.productCode,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
  };
  if (item.fromLocationCode && item.fromLocationCode !== DEFAULT_LOCATION_CODE) {
    out.fromLocationCode = item.fromLocationCode;
  }
  return out;
}

function lineIdentity(item: DeliveryRequestItem): string {
  return [item.productCode, item.fromLocationCode ?? ''].join('|');
}

export function diffItems(
  before: readonly DeliveryRequestItem[],
  after: readonly DeliveryRequestItem[],
): DeliveryRequestItemDiff {
  const beforeMap = new Map<string, DeliveryRequestItem>();
  for (const item of before) beforeMap.set(lineIdentity(item), item);
  const afterMap = new Map<string, DeliveryRequestItem>();
  for (const item of after) afterMap.set(lineIdentity(item), item);

  const added: DeliveryRequestMemoItem[] = [];
  const removed: DeliveryRequestMemoItem[] = [];
  const changed: DeliveryRequestItemDiff['changed'] = [];

  for (const [key, oldItem] of beforeMap) {
    if (!afterMap.has(key)) removed.push(toMemoItem(oldItem));
  }
  for (const [key, newItem] of afterMap) {
    const oldItem = beforeMap.get(key);
    if (!oldItem) {
      added.push(toMemoItem(newItem));
      continue;
    }
    const from: DeliveryRequestMemoLineFields = {};
    const to: DeliveryRequestMemoLineFields = {};
    if (oldItem.quantity !== newItem.quantity) {
      from.quantity = oldItem.quantity;
      to.quantity = newItem.quantity;
    }
    if (oldItem.unit !== newItem.unit) {
      from.unit = oldItem.unit;
      to.unit = newItem.unit;
    }
    if (oldItem.unitPrice !== newItem.unitPrice) {
      from.unitPrice = oldItem.unitPrice;
      to.unitPrice = newItem.unitPrice;
    }
    const oldLoc = oldItem.fromLocationCode ?? '';
    const newLoc = newItem.fromLocationCode ?? '';
    if (oldLoc !== newLoc) {
      if (oldItem.fromLocationCode) from.fromLocationCode = oldItem.fromLocationCode;
      if (newItem.fromLocationCode) to.fromLocationCode = newItem.fromLocationCode;
    }
    if (Object.keys(from).length > 0) {
      changed.push({ productCode: oldItem.productCode, from, to });
    }
  }

  return { added, removed, changed };
}

export function partyMemo(request: {
  direction?: DeliveryRequestDirection;
  inboundKind?: DeliveryRequestInboundKind;
  salesOrderId?: string;
  salesOrderNumber?: string;
  customerName?: string;
  vendorCode?: string;
  vendorName?: string;
}): DeliveryRequestPartyMemo {
  const direction = request.direction ?? 'outbound';
  if (direction === 'inbound') {
    const inboundKind = request.inboundKind ?? 'vendor';

    if (inboundKind === 'customer-return') {
      return {
        direction,
        inboundKind,
        ...(request.salesOrderId && { salesOrderId: request.salesOrderId }),
        ...(request.salesOrderNumber && { salesOrderNumber: request.salesOrderNumber }),
        ...(request.customerName && { customerName: request.customerName }),
      };
    }

    if (inboundKind === 'customer-sample') {
      return {
        direction,
        inboundKind,
        ...(request.customerName && { customerName: request.customerName }),
      };
    }

    return {
      direction,
      ...(request.vendorCode && { vendorCode: request.vendorCode }),
      ...(request.vendorName && { vendorName: request.vendorName }),
    };
  }
  return {
    direction,
    ...(request.salesOrderId && { salesOrderId: request.salesOrderId }),
    ...(request.salesOrderNumber && { salesOrderNumber: request.salesOrderNumber }),
    ...(request.customerName && { customerName: request.customerName }),
  };
}

export function partyMemoFromRequest(record: DeliveryRequest): DeliveryRequestPartyMemo {
  return partyMemo({
    direction: record.direction,
    inboundKind: (record.extra as DeliveryRequestExtra | undefined)?.inboundKind,
    salesOrderId: record.salesOrderId,
    salesOrderNumber: record.salesOrderNumber,
    customerName: record.customerName,
    vendorCode: record.vendorCode,
    vendorName: record.vendorName,
  });
}

export type InlineEditSnapshot = {
  scheduledDate?: number;
  assignedDriverId?: string;
};

export function inlineEditSnapshot(record: DeliveryRequest): InlineEditSnapshot {
  const extra = (record.extra ?? {}) as DeliveryRequestExtra;
  const scheduled =
    typeof record.scheduledDate === 'number'
      ? record.scheduledDate
      : record.scheduledDate
        ? new Date(record.scheduledDate as string | number).getTime()
        : undefined;
  return {
    ...(scheduled !== undefined && { scheduledDate: scheduled }),
    ...(extra.assignedDriverId && { assignedDriverId: extra.assignedDriverId }),
  };
}
