import type {
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsReceiptStatus,
  CreateGoodsReceiptInput,
  UpdateGoodsReceiptInput,
  GoodsReceiptFilter,
} from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateItem(item: GoodsReceiptItem, index: number): Record<string, string> {
  const fields: Record<string, string> = {};

  if (item.itemType !== 'product') {
    fields[`items[${index}].itemType`] = 'Item type must be "product"';
  }
  if (!item.itemCode?.trim()) {
    fields[`items[${index}].itemCode`] = 'Item code is required';
  }
  if (!item.itemName?.trim()) {
    fields[`items[${index}].itemName`] = 'Item name is required';
  }
  if (!item.unit?.trim()) {
    fields[`items[${index}].unit`] = 'Unit is required';
  }
  if (item.quantity <= 0) {
    fields[`items[${index}].quantity`] = 'Quantity must be positive';
  }

  return fields;
}

export function validateCreateInput(input: CreateGoodsReceiptInput): void {
  const fields: Record<string, string> = {};

  if (!input.receiptNumber?.trim()) {
    fields['receiptNumber'] = 'Receipt number is required';
  }
  if (!input.vendorCode?.trim()) {
    fields['vendorCode'] = 'Vendor code is required';
  }
  if (!input.vendorName?.trim()) {
    fields['vendorName'] = 'Vendor name is required';
  }
  if (!input.locationCode?.trim()) {
    fields['locationCode'] = 'Location code is required';
  }
  if (!input.locationName?.trim()) {
    fields['locationName'] = 'Location name is required';
  }
  if (!input.receivedDate?.trim()) {
    fields['receivedDate'] = 'Received date is required';
  }
  if (!input.items || input.items.length === 0) {
    fields['items'] = 'At least one item is required';
  } else {
    for (let i = 0; i < input.items.length; i++) {
      Object.assign(fields, validateItem(input.items[i]!, i));
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid goods receipt input', fields);
  }
}

export function checkDuplicateReceiptNumber(
  receipts: GoodsReceipt[],
  receiptNumber: string,
  excludeId?: string,
): void {
  const duplicate = receipts.find((r) => r.receiptNumber === receiptNumber && r.id !== excludeId);
  if (duplicate) {
    throw new ValidationError('Duplicate receipt number', {
      receiptNumber: `Receipt number "${receiptNumber}" already exists`,
    });
  }
}

export function computeTotalQuantity(items: GoodsReceiptItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function buildGoodsReceipt(
  id: string,
  input: CreateGoodsReceiptInput,
  now: DateTimeInput,
): GoodsReceipt {
  return {
    id,
    receiptNumber: input.receiptNumber.trim(),
    vendorCode: input.vendorCode.trim(),
    vendorName: input.vendorName.trim(),
    locationCode: input.locationCode.trim(),
    locationName: input.locationName.trim(),
    receivedDate: input.receivedDate,
    reference: input.reference?.trim() ?? '',
    status: 'draft',
    items: input.items,
    totalQuantity: computeTotalQuantity(input.items),
    notes: input.notes?.trim() ?? '',
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    receivedAt: null,
    cancelledAt: null,
    version: newVersion(),
  };
}

export function applyUpdate(
  receipt: GoodsReceipt,
  input: UpdateGoodsReceiptInput,
  now: DateTimeInput,
): GoodsReceipt {
  return {
    ...receipt,
    ...(input.vendorCode !== undefined ? { vendorCode: input.vendorCode.trim() } : {}),
    ...(input.vendorName !== undefined ? { vendorName: input.vendorName.trim() } : {}),
    ...(input.locationCode !== undefined ? { locationCode: input.locationCode.trim() } : {}),
    ...(input.locationName !== undefined ? { locationName: input.locationName.trim() } : {}),
    ...(input.receivedDate !== undefined ? { receivedDate: input.receivedDate } : {}),
    ...(input.items !== undefined
      ? { items: input.items, totalQuantity: computeTotalQuantity(input.items) }
      : {}),
    ...(input.reference !== undefined ? { reference: input.reference.trim() } : {}),
    ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function assertEditable(current: GoodsReceiptStatus): void {
  if (current !== 'draft') {
    throw new ValidationError('Invalid edit', {
      status: `Cannot edit receipt: current status is "${current}", expected "draft"`,
    });
  }
}

const LEGAL_TRANSITIONS: Record<GoodsReceiptStatus, GoodsReceiptStatus[]> = {
  draft: ['received', 'cancelled'],
  received: ['cancelled'],
  cancelled: [],
};

export function assertTransition(current: GoodsReceiptStatus, next: GoodsReceiptStatus): void {
  if (!LEGAL_TRANSITIONS[current].includes(next)) {
    throw new ValidationError('Invalid status transition', {
      status: `Cannot transition from "${current}" to "${next}"`,
    });
  }
}

const FIELD_EDIT_KEYS = [
  'vendorCode',
  'vendorName',
  'locationCode',
  'locationName',
  'receivedDate',
  'items',
  'reference',
  'notes',
  'extra',
] as const satisfies readonly (keyof UpdateGoodsReceiptInput)[];

export function assertNoFieldEdits(input: UpdateGoodsReceiptInput): void {
  for (const key of FIELD_EDIT_KEYS) {
    if (input[key] !== undefined) {
      throw new ValidationError('Invalid update', {
        [key]: 'Field edits are not allowed in the same request as a status transition',
      });
    }
  }
}

export function applyTransition(
  receipt: GoodsReceipt,
  next: GoodsReceiptStatus,
  now: DateTimeInput,
): GoodsReceipt {
  return {
    ...receipt,
    status: next,
    ...(next === 'received' ? { receivedAt: now } : {}),
    ...(next === 'cancelled' ? { cancelledAt: now } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function filterReceipts(
  receipts: GoodsReceipt[],
  filter: GoodsReceiptFilter,
): GoodsReceipt[] {
  let result = receipts;

  if (filter.status !== undefined) {
    result = result.filter((r) => r.status === filter.status);
  }
  if (filter.vendorCode !== undefined) {
    result = result.filter((r) => r.vendorCode === filter.vendorCode);
  }
  if (filter.locationCode !== undefined) {
    result = result.filter((r) => r.locationCode === filter.locationCode);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.receiptNumber.toLowerCase().includes(term) ||
        r.vendorName.toLowerCase().includes(term) ||
        r.reference.toLowerCase().includes(term) ||
        r.notes.toLowerCase().includes(term),
    );
  }

  return result;
}
