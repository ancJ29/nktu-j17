

import { DEFAULT_LOCATION_CODE } from '@/types/location';
import type { SalesOrderExtra, SalesOrderItem, SalesOrderSetRole } from '@/types/sales-order';

export type SalesOrderMemoItem = {
  productCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  fromLocationCode?: string;
  role?: SalesOrderSetRole;
  groupId?: string;
  sourceSetCode?: string;
};

export type SalesOrderMemoLineFields = {
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  fromLocationCode?: string;
};

export type SalesOrderItemDiff = {
  added: SalesOrderMemoItem[];
  removed: SalesOrderMemoItem[];
  changed: {
    productCode: string;
    from: SalesOrderMemoLineFields;
    to: SalesOrderMemoLineFields;
  }[];
};

export type SalesOrderCustomerMemo = {
  customerCode?: string;
  customerName?: string;
  isIndividualCustomer?: boolean;
};

export type SalesOrderCustomerDiff = {
  from: SalesOrderCustomerMemo;
  to: SalesOrderCustomerMemo;
};

export type SalesOrderInlineFields = {
  assignedStaff?: { from?: string; to?: string };
  deliveryMethod?: { from?: string; to?: string };
  deliveryDate?: { from?: number; to?: number };
  notes?: { changed: true };
  
  itemMemo?: { changed: true };
  
  warehouseNote?: { changed: true };
  driverNote?: { changed: true };
};

export type SalesOrderReleasedRow = {
  productCode: string;
  locationCode: string;
  
  byUnit: Record<string, number>;
};

export function toMemoItem(item: SalesOrderItem): SalesOrderMemoItem {
  const out: SalesOrderMemoItem = {
    productCode: item.productCode,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
  };
  if (item.fromLocationCode && item.fromLocationCode !== DEFAULT_LOCATION_CODE) {
    out.fromLocationCode = item.fromLocationCode;
  }
  if (item.role) out.role = item.role;
  if (item.groupId) out.groupId = item.groupId;
  if (item.sourceSetCode) out.sourceSetCode = item.sourceSetCode;
  return out;
}

function lineIdentity(item: SalesOrderItem): string {
  
  
  
  return [item.productCode, item.fromLocationCode ?? '', item.groupId ?? '', item.role ?? ''].join(
    '|',
  );
}

export function diffItems(
  before: readonly SalesOrderItem[],
  after: readonly SalesOrderItem[],
): SalesOrderItemDiff {
  const beforeMap = new Map<string, SalesOrderItem>();
  for (const item of before) beforeMap.set(lineIdentity(item), item);
  const afterMap = new Map<string, SalesOrderItem>();
  for (const item of after) afterMap.set(lineIdentity(item), item);

  const added: SalesOrderMemoItem[] = [];
  const removed: SalesOrderMemoItem[] = [];
  const changed: SalesOrderItemDiff['changed'] = [];

  for (const [key, oldItem] of beforeMap) {
    if (!afterMap.has(key)) removed.push(toMemoItem(oldItem));
  }
  for (const [key, newItem] of afterMap) {
    const oldItem = beforeMap.get(key);
    if (!oldItem) {
      added.push(toMemoItem(newItem));
      continue;
    }
    const from: SalesOrderMemoLineFields = {};
    const to: SalesOrderMemoLineFields = {};
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

export function customerMemo(extra: SalesOrderExtra | undefined): SalesOrderCustomerMemo {
  if (!extra) return {};
  if (extra.isIndividualCustomer) {
    return {
      isIndividualCustomer: true,
      ...(extra.customerName && { customerName: extra.customerName }),
    };
  }
  return extra.customerCode ? { customerCode: extra.customerCode } : {};
}

export function diffCustomer(
  before: SalesOrderExtra | undefined,
  after: SalesOrderExtra | undefined,
): SalesOrderCustomerDiff | undefined {
  const from = customerMemo(before);
  const to = customerMemo(after);
  if (
    from.customerCode === to.customerCode &&
    from.customerName === to.customerName &&
    !!from.isIndividualCustomer === !!to.isIndividualCustomer
  ) {
    return undefined;
  }
  return { from, to };
}
