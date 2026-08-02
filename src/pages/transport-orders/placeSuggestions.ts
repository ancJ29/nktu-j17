import type { TransportOrder } from '@/types';

export const PLACE_SUGGESTION_LIMIT = 12;

function placeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function placesOf(order: TransportOrder): string[] {
  return [
    order.route?.pickup,
    order.route?.stuffing,
    order.route?.dropoff,
    ...(order.trips ?? []).flatMap((trip) => [trip.departure, trip.destination]),
  ].filter((p): p is string => !!p && !!p.trim());
}

export function collectTransportPlaces(orders: TransportOrder[]): string[] {
  const seen = new Map<
    string,
    { label: string; count: number; labelCounts: Map<string, number> }
  >();

  for (const order of orders) {
    if (order.extra?.isDeleted) continue;
    for (const raw of placesOf(order)) {
      const label = raw.trim();
      const key = placeKey(label);
      const entry = seen.get(key) ?? { label, count: 0, labelCounts: new Map() };
      entry.count += 1;
      const labelCount = (entry.labelCounts.get(label) ?? 0) + 1;
      entry.labelCounts.set(label, labelCount);

      if (labelCount > (entry.labelCounts.get(entry.label) ?? 0)) entry.label = label;
      seen.set(key, entry);
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((e) => e.label);
}
