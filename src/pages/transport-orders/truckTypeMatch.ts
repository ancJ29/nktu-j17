import type { TransportOrder } from '@/types';

export type TruckTypeResolver = (truckId: string | undefined | null) => string | undefined;

export function usesTruckType(
  order: Pick<TransportOrder, 'truckId' | 'trips' | 'extra'>,
  truckType: string,
  typeOf: TruckTypeResolver,
): boolean {
  if (order.extra?.truckType) return order.extra.truckType === truckType;
  if (typeOf(order.truckId) === truckType) return true;
  return (order.trips ?? []).some((trip) => typeOf(trip.truckId) === truckType);
}
