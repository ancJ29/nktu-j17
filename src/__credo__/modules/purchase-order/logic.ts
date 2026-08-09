import type {
  PurchaseOrder,
  PurchaseOrderItem,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderFilter,
} from './types.js';
import { ValidationError } from '../core/errors.js';
import type { DateTimeInput } from '@credo/kits/types';

export function validateItem(item: PurchaseOrderItem, index: number): Record<string, string> {
  const fields: Record<string, string> = {};

  if (!item.unit?.trim()) {
    fields[`items[${index}].unit`] = 'Unit is required';
  }
  if (item.quantity <= 0) {
    fields[`items[${index}].quantity`] = 'Quantity must be positive';
  }
  if (item.unitPrice < 0) {
    fields[`items[${index}].unitPrice`] = 'Unit price must not be negative';
  }

  return fields;
}

export function validateCreateInput(input: CreatePurchaseOrderInput): void {
  const fields: Record<string, string> = {};

  if (!input.orderNumber.trim()) {
    fields['orderNumber'] = 'Order number is required';
  }
  if (!input.supplierName.trim()) {
    fields['supplierName'] = 'Supplier name is required';
  }
  if (!input.items || input.items.length === 0) {
    fields['items'] = 'At least one item is required';
  } else {
    for (let i = 0; i < input.items.length; i++) {
      Object.assign(fields, validateItem(input.items[i]!, i));
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid purchase order input', fields);
  }
}

export function checkDuplicateOrderNumber(
  orders: PurchaseOrder[],
  orderNumber: string,
  excludeId?: string,
): void {
  const duplicate = orders.find((o) => o.orderNumber === orderNumber && o.id !== excludeId);
  if (duplicate) {
    throw new ValidationError('Duplicate order number', {
      orderNumber: `Order number "${orderNumber}" already exists`,
    });
  }
}

export function computeTotalAmount(items: PurchaseOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function buildPurchaseOrder(
  id: string,
  input: CreatePurchaseOrderInput,
  now: DateTimeInput,
): PurchaseOrder {
  return {
    id,
    orderNumber: input.orderNumber.trim(),
    supplierName: input.supplierName.trim(),
    items: input.items,
    status: 'draft',
    totalAmount: computeTotalAmount(input.items),
    notes: input.notes?.trim() ?? '',
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    closedAt: undefined,
  };
}

export function applyUpdate(
  order: PurchaseOrder,
  input: UpdatePurchaseOrderInput,
  now: DateTimeInput,
): PurchaseOrder {
  const updated = {
    ...order,
    ...(input.supplierName !== undefined ? { supplierName: input.supplierName.trim() } : {}),
    ...(input.items !== undefined
      ? { items: input.items, totalAmount: computeTotalAmount(input.items) }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
  };
  return updated;
}

export function validateStatusTransition(current: string, next: string): void {
  const allowed: Record<string, string[]> = {
    draft: ['confirmed'],
    confirmed: ['received'],
    received: ['closed'],
  };

  if (!allowed[current]?.includes(next)) {
    throw new ValidationError('Invalid status transition', {
      status: `Cannot transition from "${current}" to "${next}"`,
    });
  }
}

export function filterOrders(
  orders: PurchaseOrder[],
  filter: PurchaseOrderFilter,
): PurchaseOrder[] {
  let result = orders;

  if (filter.status !== undefined) {
    result = result.filter((o) => o.status === filter.status);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.supplierName.toLowerCase().includes(term) ||
        o.notes.toLowerCase().includes(term),
    );
  }

  return result;
}
