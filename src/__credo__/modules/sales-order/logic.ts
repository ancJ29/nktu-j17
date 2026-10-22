import type {
  SalesOrder,
  SalesOrderItem,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  SalesOrderFilter,
} from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateItem(item: SalesOrderItem, index: number): Record<string, string> {
  const fields: Record<string, string> = {};

  if (!item.productCode?.trim()) {
    fields[`items[${index}].productCode`] = 'Product code is required';
  }
  if (!item.productName?.trim()) {
    fields[`items[${index}].productName`] = 'Product name is required';
  }
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

export function validateCreateInput(input: CreateSalesOrderInput): void {
  const fields: Record<string, string> = {};

  if (!input.orderNumber.trim()) {
    fields['orderNumber'] = 'Order number is required';
  }
  if (!input.customerName.trim()) {
    fields['customerName'] = 'Customer name is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid sales order input', fields);
  }
}

export function checkDuplicateOrderNumber(
  orders: SalesOrder[],
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

export function computeTotalAmount(items: SalesOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function buildSalesOrder(
  id: string,
  input: CreateSalesOrderInput,
  now: DateTimeInput,
): SalesOrder {
  return {
    id,
    orderNumber: input.orderNumber.trim(),
    customerName: input.customerName.trim(),
    items: input.items,
    isClosed: false,
    totalAmount: computeTotalAmount(input.items),
    notes: input.notes?.trim() ?? '',
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    closedAt: undefined,
    version: newVersion(),
  };
}

export function applyUpdate(
  order: SalesOrder,
  input: UpdateSalesOrderInput,
  now: DateTimeInput,
): SalesOrder {
  return {
    ...order,
    ...(input.customerName !== undefined ? { customerName: input.customerName.trim() } : {}),
    ...(input.items !== undefined
      ? { items: input.items, totalAmount: computeTotalAmount(input.items) }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function filterOrders(orders: SalesOrder[], filter: SalesOrderFilter): SalesOrder[] {
  let result = orders;

  if (filter.isClosed !== undefined) {
    result = result.filter((o) => o.isClosed === filter.isClosed);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.notes.toLowerCase().includes(term),
    );
  }

  return result;
}
