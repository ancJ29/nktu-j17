import type { LookupItem, CreateLookupInput, UpdateLookupInput, LookupFilter } from './types.js';
import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateCreateInput(input: CreateLookupInput): void {
  const fields: Record<string, string> = {};

  if (!input.category?.trim()) {
    fields['category'] = 'Category is required';
  }
  if (!input.value?.trim()) {
    fields['value'] = 'Value is required';
  }
  if (!input.label?.trim()) {
    fields['label'] = 'Label is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid lookup input', fields);
  }
}

export function checkDuplicateValue(
  items: LookupItem[],
  category: string,
  value: string,
  excludeId?: string,
): void {
  const dup = items.find(
    (i) => i.category === category && i.value === value && i.isActive && i.id !== excludeId,
  );
  if (dup) {
    throw new ValidationError('Duplicate lookup value', {
      value: `Value "${value}" already exists in category "${category}"`,
    });
  }
}

export function buildItem(id: string, input: CreateLookupInput, now: DateTimeInput): LookupItem {
  return {
    id,
    category: input.category.trim(),
    value: input.value.trim(),
    label: input.label.trim(),
    sortOrder: input.sortOrder ?? 0,
    isActive: true,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function applyUpdate(
  item: LookupItem,
  input: UpdateLookupInput,
  now: DateTimeInput,
): LookupItem {
  return {
    ...item,
    ...(input.value !== undefined ? { value: input.value.trim() } : {}),
    ...(input.label !== undefined ? { label: input.label.trim() } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function filterItems(items: LookupItem[], filter: LookupFilter): LookupItem[] {
  let result = items;

  if (filter.category !== undefined) {
    result = result.filter((i) => i.category === filter.category);
  }

  if (filter.isActive !== undefined) {
    result = result.filter((i) => i.isActive === filter.isActive);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.value.toLowerCase().includes(term) ||
        i.label.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term),
    );
  }

  return result;
}

export function groupByCategory(items: LookupItem[]): Record<string, LookupItem[]> {
  const groups: Record<string, LookupItem[]> = {};
  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }
  for (const category of Object.keys(groups)) {
    groups[category]!.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }
  return groups;
}
