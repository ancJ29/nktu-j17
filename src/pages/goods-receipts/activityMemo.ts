

import type { GoodsReceipt, GoodsReceiptItem, GoodsReceiptItemType } from '@/types';

export type GoodsReceiptMemoItem = {
  itemType: GoodsReceiptItemType;
  itemCode: string;
  quantity: number;
  unit: string;
  
  note?: string;
};

export type GoodsReceiptMemoLineFields = {
  quantity?: number;
  unit?: string;
  note?: string;
};

export type GoodsReceiptItemDiff = {
  added: GoodsReceiptMemoItem[];
  removed: GoodsReceiptMemoItem[];
  changed: {
    itemType: GoodsReceiptItemType;
    itemCode: string;
    from: GoodsReceiptMemoLineFields;
    to: GoodsReceiptMemoLineFields;
  }[];
};

export type GoodsReceiptVendorMemo = {
  vendorCode?: string;
};

export type GoodsReceiptVendorDiff = {
  from: GoodsReceiptVendorMemo;
  to: GoodsReceiptVendorMemo;
};

export type GoodsReceiptInlineFields = {
  
  quantity?: {
    itemType: GoodsReceiptItemType;
    itemCode: string;
    unit: string;
    from: number;
    to: number;
  };
};

export function toMemoItem(item: GoodsReceiptItem): GoodsReceiptMemoItem {
  const out: GoodsReceiptMemoItem = {
    itemType: item.itemType,
    itemCode: item.itemCode,
    quantity: item.quantity,
    unit: item.unit,
  };
  if (item.note && item.note.trim()) out.note = item.note;
  return out;
}

function lineIdentity(item: GoodsReceiptItem): string {
  
  
  return [item.itemType, item.itemCode, item.unit].join('|');
}

export function diffItems(
  before: readonly GoodsReceiptItem[],
  after: readonly GoodsReceiptItem[],
): GoodsReceiptItemDiff {
  const beforeMap = new Map<string, GoodsReceiptItem>();
  for (const item of before) beforeMap.set(lineIdentity(item), item);
  const afterMap = new Map<string, GoodsReceiptItem>();
  for (const item of after) afterMap.set(lineIdentity(item), item);

  const added: GoodsReceiptMemoItem[] = [];
  const removed: GoodsReceiptMemoItem[] = [];
  const changed: GoodsReceiptItemDiff['changed'] = [];

  for (const [key, oldItem] of beforeMap) {
    if (!afterMap.has(key)) removed.push(toMemoItem(oldItem));
  }
  for (const [key, newItem] of afterMap) {
    const oldItem = beforeMap.get(key);
    if (!oldItem) {
      added.push(toMemoItem(newItem));
      continue;
    }
    const from: GoodsReceiptMemoLineFields = {};
    const to: GoodsReceiptMemoLineFields = {};
    if (oldItem.quantity !== newItem.quantity) {
      from.quantity = oldItem.quantity;
      to.quantity = newItem.quantity;
    }
    const oldNote = oldItem.note?.trim() ?? '';
    const newNote = newItem.note?.trim() ?? '';
    if (oldNote !== newNote) {
      if (oldNote) from.note = oldNote;
      if (newNote) to.note = newNote;
    }
    if (Object.keys(from).length > 0 || Object.keys(to).length > 0) {
      changed.push({ itemType: oldItem.itemType, itemCode: oldItem.itemCode, from, to });
    }
  }

  return { added, removed, changed };
}

export function vendorMemo(receipt: Pick<GoodsReceipt, 'vendorCode'>): GoodsReceiptVendorMemo {
  return receipt.vendorCode ? { vendorCode: receipt.vendorCode } : {};
}

export function diffVendor(
  before: Pick<GoodsReceipt, 'vendorCode'> | undefined,
  after: Pick<GoodsReceipt, 'vendorCode'> | undefined,
): GoodsReceiptVendorDiff | undefined {
  const from = before ? vendorMemo(before) : {};
  const to = after ? vendorMemo(after) : {};
  if (from.vendorCode === to.vendorCode) return undefined;
  return { from, to };
}
