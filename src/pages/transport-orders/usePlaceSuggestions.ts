import { useMemo } from 'react';
import { useTransportOrderStore } from '@/stores/useTransportOrderStore';
import { collectTransportPlaces } from './placeSuggestions';

export function usePlaceSuggestions(): string[] {
  const orders = useTransportOrderStore((s) => s.items);
  return useMemo(() => collectTransportPlaces(orders), [orders]);
}
