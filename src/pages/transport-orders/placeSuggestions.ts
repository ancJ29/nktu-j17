import type { TransportOrder, TransportRouteRow } from '@/types';

export const PLACE_SUGGESTION_LIMIT = 12;

export const PLACE_INPUT_STYLES = {
  input: {
    border: 'none',
    borderBottom: '1px solid var(--mantine-color-primary-6)',
    borderRadius: 0,
    padding: 0,
  },
} as const;

export function placeKey(value: string): string {
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

function placesOfRoute(route: TransportRouteRow): string[] {
  return [
    route.route?.pickup,
    route.route?.stuffing,
    route.route?.dropoff,
    ...(route.trips ?? []).flatMap((leg) => [leg.departure, leg.destination]),
  ].filter((p): p is string => !!p && !!p.trim());
}

export function collectTransportPlaces(
  orders: TransportOrder[],
  routes: TransportRouteRow[] = [],
): string[] {
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

  const used = [...seen.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((e) => e.label);

  const fromRoutes: string[] = [];
  const appended = new Set<string>();
  for (const route of routes) {
    if (route.extra?.isDeleted || route.isActive === false) continue;
    for (const raw of placesOfRoute(route)) {
      const label = raw.trim();
      const key = placeKey(label);
      if (seen.has(key) || appended.has(key)) continue;
      appended.add(key);
      fromRoutes.push(label);
    }
  }

  return [...used, ...fromRoutes];
}
