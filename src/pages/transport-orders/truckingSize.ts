import type { LookupOption } from '@/hooks/useLookupV2Options';

export const TRUCKING_SIZE_CATEGORY = 'trucking-size';

export const LEGACY_CONTAINER_SIZE_CATEGORY = 'container-size';

export const FALLBACK_TRUCKING_SIZES: LookupOption[] = [
  { value: '20', label: '20ft' },
  { value: '40', label: '40ft' },
];

export function readTruckingSize(
  record: { truckingSize?: string; containerSize?: string } | null | undefined,
): string {
  return record?.truckingSize ?? record?.containerSize ?? '';
}

export function truckingSizeFallbackLabel(value: string): string {
  return /^\d+$/.test(value) ? `${value}ft` : value;
}
