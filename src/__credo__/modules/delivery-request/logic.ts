import type {
  DeliveryRequest,
  DeliveryRequestItem,
  CreateDeliveryRequestInput,
  UpdateDeliveryRequestInput,
  DeliveryRequestFilter,
} from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateItem(item: DeliveryRequestItem, index: number): Record<string, string> {
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

export function validateCreateInput(input: CreateDeliveryRequestInput): void {
  const fields: Record<string, string> = {};

  if (!input.requestNumber.trim()) {
    fields['requestNumber'] = 'Request number is required';
  }

  if (input.direction != null && input.direction !== 'outbound' && input.direction !== 'inbound') {
    fields['direction'] = "Direction must be 'outbound' or 'inbound'";
  }

  if (input.items && input.items.length > 0) {
    for (let i = 0; i < input.items.length; i++) {
      Object.assign(fields, validateItem(input.items[i]!, i));
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid delivery request input', fields);
  }
}

export function checkDuplicateRequestNumber(
  requests: DeliveryRequest[],
  requestNumber: string,
  excludeId?: string,
): void {
  const duplicate = requests.find((r) => r.requestNumber === requestNumber && r.id !== excludeId);
  if (duplicate) {
    throw new ValidationError('Duplicate request number', {
      requestNumber: `Request number "${requestNumber}" already exists`,
    });
  }
}

export function computeTotalAmount(items: DeliveryRequestItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function buildDeliveryRequest(
  id: string,
  input: CreateDeliveryRequestInput,
  now: DateTimeInput,
): DeliveryRequest {
  const direction = input.direction ?? 'outbound';
  return {
    id,
    requestNumber: input.requestNumber.trim(),
    direction,
    ...(input.salesOrderId?.trim() ? { salesOrderId: input.salesOrderId.trim() } : {}),
    ...(input.salesOrderNumber?.trim() ? { salesOrderNumber: input.salesOrderNumber.trim() } : {}),
    ...(input.customerName?.trim() ? { customerName: input.customerName.trim() } : {}),
    ...(input.vendorCode?.trim() ? { vendorCode: input.vendorCode.trim() } : {}),
    ...(input.vendorName?.trim() ? { vendorName: input.vendorName.trim() } : {}),
    items: input.items,
    scheduledDate: input.scheduledDate ?? undefined,
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
  request: DeliveryRequest,
  input: UpdateDeliveryRequestInput,
  now: DateTimeInput,
): DeliveryRequest {
  return {
    ...request,
    ...(input.customerName !== undefined ? { customerName: input.customerName.trim() } : {}),
    ...(input.vendorCode !== undefined ? { vendorCode: input.vendorCode.trim() } : {}),
    ...(input.vendorName !== undefined ? { vendorName: input.vendorName.trim() } : {}),
    ...(input.items !== undefined
      ? { items: input.items, totalAmount: computeTotalAmount(input.items) }
      : {}),
    ...(input.scheduledDate !== undefined ? { scheduledDate: input.scheduledDate } : {}),
    ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,

    version: newVersion(),
  };
}

export function filterRequests(
  requests: DeliveryRequest[],
  filter: DeliveryRequestFilter,
): DeliveryRequest[] {
  let result = requests;

  if (filter.isClosed !== undefined) {
    result = result.filter((r) => r.isClosed === filter.isClosed);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.requestNumber.toLowerCase().includes(term) ||
        (r.salesOrderNumber ?? '').toLowerCase().includes(term) ||
        (r.customerName ?? '').toLowerCase().includes(term) ||
        (r.vendorName ?? '').toLowerCase().includes(term) ||
        r.notes.toLowerCase().includes(term),
    );
  }

  return result;
}
