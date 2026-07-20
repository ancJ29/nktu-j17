
import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupOptions';

export const CONTAINER_SIZE_CATEGORY = 'container-size';

export const FALLBACK_CONTAINER_SIZES: LookupOption[] = [
  { value: '20', label: '20ft' },
  { value: '40', label: '40ft' },
];

export function useContainerSizeOptions(): LookupOption[] {
  const options = useLookupV2Options(CONTAINER_SIZE_CATEGORY);
  return options.length > 0 ? options : FALLBACK_CONTAINER_SIZES;
}

export function useContainerSizeLabel(): (value: string | undefined) => string {
  const labels = useLookupV2Labels(CONTAINER_SIZE_CATEGORY);
  return (value) => {
    if (!value) return '';
    return labels.get(value) ?? `${value}ft`;
  };
}
