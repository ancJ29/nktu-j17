import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupV2Options';
import {
  FALLBACK_TRUCKING_SIZES,
  LEGACY_CONTAINER_SIZE_CATEGORY,
  TRUCKING_SIZE_CATEGORY,
  truckingSizeFallbackLabel,
} from './truckingSize';

export function useTruckingSizeOptions(): LookupOption[] {
  const options = useLookupV2Options(TRUCKING_SIZE_CATEGORY);
  const legacy = useLookupV2Options(LEGACY_CONTAINER_SIZE_CATEGORY);
  if (options.length > 0) return options;
  return legacy.length > 0 ? legacy : FALLBACK_TRUCKING_SIZES;
}

export function useTruckingSizeLabel(): (value: string | undefined) => string {
  const labels = useLookupV2Labels(TRUCKING_SIZE_CATEGORY);
  const legacyLabels = useLookupV2Labels(LEGACY_CONTAINER_SIZE_CATEGORY);
  return (value) => {
    if (!value) return '';
    return labels.get(value) ?? legacyLabels.get(value) ?? truckingSizeFallbackLabel(value);
  };
}
