import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupV2Options';

export const FEE_NAME_CATEGORY = 'fee-name';

export const FALLBACK_FEE_NAMES: LookupOption[] = [
  { value: 'Phí vận chuyển', label: 'Phí vận chuyển' },
  { value: 'Phụ thu VC', label: 'Phụ thu VC' },
  { value: 'Phí neo xe', label: 'Phí neo xe' },
];

export function useFeeNameOptions(): LookupOption[] {
  const options = useLookupV2Options(FEE_NAME_CATEGORY);
  return options.length > 0 ? options : FALLBACK_FEE_NAMES;
}

export function useFeeNameLabel(): (value: string | undefined) => string {
  const labels = useLookupV2Labels(FEE_NAME_CATEGORY);
  return (value) => {
    if (!value) return '';
    return labels.get(value) ?? value;
  };
}

export function useFreightFeeName(): string {
  return useFeeNameOptions()[0]?.value ?? FALLBACK_FEE_NAMES[0]!.value;
}

export function feeNameSelectData(options: LookupOption[], stored: string): LookupOption[] {
  if (!stored || options.some((o) => o.value === stored)) return options;
  return [...options, { value: stored, label: stored }];
}
