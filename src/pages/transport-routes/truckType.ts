import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupOptions';

export const TRUCK_TYPE_CATEGORY = 'truck-type';

export function useTruckTypeOptions(): LookupOption[] {
  return useLookupV2Options(TRUCK_TYPE_CATEGORY);
}

export function useTruckTypeLabel(): (value: string | undefined) => string {
  const labels = useLookupV2Labels(TRUCK_TYPE_CATEGORY);
  return (value) => (value ? (labels.get(value) ?? value) : '');
}
