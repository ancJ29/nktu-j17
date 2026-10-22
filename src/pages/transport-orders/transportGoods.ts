import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupV2Options';

export const TRANSPORT_GOODS_CATEGORY = 'transport-goods';

export function useTransportGoodsOptions(): LookupOption[] {
  return useLookupV2Options(TRANSPORT_GOODS_CATEGORY);
}

export function useTransportGoodsSuggestions(): string[] {
  return useTransportGoodsOptions().map((o) => o.label);
}

export function useTransportGoodsLabel(): (value: string | undefined) => string {
  const labels = useLookupV2Labels(TRANSPORT_GOODS_CATEGORY);
  return (value) => (value ? (labels.get(value) ?? value) : '');
}
