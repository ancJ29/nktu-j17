import type {
  ProductInventory,
  CreateProductInventoryInput,
  UpdateProductInventoryInput,
  ProductInventoryFilter,
} from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateCreateInput(input: CreateProductInventoryInput): void {
  const fields: Record<string, string> = {};

  if (!input.itemCode?.trim()) {
    fields['itemCode'] = 'Item code is required';
  }
  if (!input.locationCode?.trim()) {
    fields['locationCode'] = 'Location code is required';
  }
  if (typeof input.onHand !== 'number' || !Number.isFinite(input.onHand)) {
    fields['onHand'] = 'onHand must be a finite number';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid product inventory input', fields);
  }
}

export function validateUpdateInput(input: UpdateProductInventoryInput): void {
  if (
    input.onHand !== undefined &&
    (typeof input.onHand !== 'number' || !Number.isFinite(input.onHand))
  ) {
    throw new ValidationError('Invalid product inventory input', {
      onHand: 'onHand must be a finite number',
    });
  }
}

export function checkDuplicatePair(
  entries: ProductInventory[],
  itemCode: string,
  locationCode: string,
  excludeId?: string,
): void {
  const dup = entries.find(
    (e) => e.itemCode === itemCode && e.locationCode === locationCode && e.id !== excludeId,
  );
  if (dup) {
    throw new ValidationError('Duplicate inventory entry', {
      itemCode: `Inventory for item "${itemCode}" at location "${locationCode}" already exists`,
    });
  }
}

export function buildEntry(
  id: string,
  input: CreateProductInventoryInput,
  now: DateTimeInput,
): ProductInventory {
  return {
    id,
    itemCode: input.itemCode.trim(),
    locationCode: input.locationCode.trim(),
    onHand: input.onHand,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function applyUpdate(
  entry: ProductInventory,
  input: UpdateProductInventoryInput,
  now: DateTimeInput,
): ProductInventory {
  return {
    ...entry,
    ...(input.onHand !== undefined ? { onHand: input.onHand } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function filterEntries(
  entries: ProductInventory[],
  filter: ProductInventoryFilter,
): ProductInventory[] {
  let result = entries;

  if (filter.itemCode !== undefined) {
    result = result.filter((e) => e.itemCode === filter.itemCode);
  }

  if (filter.locationCode !== undefined) {
    result = result.filter((e) => e.locationCode === filter.locationCode);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (e) => e.itemCode.toLowerCase().includes(term) || e.locationCode.toLowerCase().includes(term),
    );
  }

  return result;
}
