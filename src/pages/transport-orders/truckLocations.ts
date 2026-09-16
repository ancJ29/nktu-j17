import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupV2Options';

export const TRUCK_LOCATIONS_CATEGORY = 'truck-locations';

export function useTruckLocationOptions(): LookupOption[] {
  return useLookupV2Options(TRUCK_LOCATIONS_CATEGORY);
}

export function useTruckLocationLabel(): (value: string | undefined) => string {
  const labels = useLookupV2Labels(TRUCK_LOCATIONS_CATEGORY);
  return (value) => (value ? (labels.get(value) ?? value) : '');
}
