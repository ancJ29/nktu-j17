import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationFilter,
} from './types.js';
import { DEFAULT_LOCATION_CODE } from './types.js';
import { ValidationError } from '../core/errors.js';
import { generateId, newVersion } from '@credo/kits/string';
import type { DateTimeInput } from '@credo/kits/types';

export function validateCreateInput(input: CreateLocationInput): void {
  const fields: Record<string, string> = {};

  if (!input.name.trim()) {
    fields['name'] = 'Name is required';
  }
  if (!input.code.trim()) {
    fields['code'] = 'Code is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid location input', fields);
  }
}

export function checkDuplicateCode(locations: Location[], code: string, excludeId?: string): void {
  const duplicate = locations.find((l) => l.code === code && l.id !== excludeId);
  if (duplicate) {
    throw new ValidationError('Duplicate location code', {
      code: `Location code "${code}" already exists`,
    });
  }
}

export function buildLocation(
  id: string,
  input: CreateLocationInput,
  now: DateTimeInput,
): Location {
  return {
    id,
    name: input.name.trim(),
    code: input.code.trim(),
    description: input.description?.trim() ?? '',
    address: input.address?.trim() ?? '',
    isActive: true,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function applyUpdate(
  location: Location,
  input: UpdateLocationInput,
  now: DateTimeInput,
): Location {
  return {
    ...location,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.address !== undefined ? { address: input.address.trim() } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
    updatedAt: now,
    version: newVersion(),
  };
}

export function buildDefaultLocation(now: DateTimeInput): Location {
  return {
    id: generateId(),
    name: 'Default',
    code: DEFAULT_LOCATION_CODE,
    description: '',
    address: '',
    isActive: true,
    extra: {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}

export function ensureDefaultLocation(
  items: Location[],
  now: DateTimeInput,
): { items: Location[]; seeded: boolean } {
  if (items.some((l) => l.code === DEFAULT_LOCATION_CODE)) {
    return { items, seeded: false };
  }
  return { items: [buildDefaultLocation(now), ...items], seeded: true };
}

export function filterLocations(locations: Location[], filter: LocationFilter): Location[] {
  let result = locations;

  if (filter.isActive !== undefined) {
    result = result.filter((l) => l.isActive === filter.isActive);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.code.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term) ||
        l.address.toLowerCase().includes(term),
    );
  }

  return result;
}
