import type { TransportRouteRow } from '@/types';
import { truckTypeCarriesContainer } from '../transport-orders/containerTruckType';

export type RouteEndpoints = { from: string; to: string };

export function routeEndpoints(route: Pick<TransportRouteRow, 'route'>): RouteEndpoints {
  return { from: route.route?.pickup ?? '', to: route.route?.dropoff ?? '' };
}

export function routeLegCount(route: Pick<TransportRouteRow, 'isMultiTrip' | 'trips'>): number {
  return route.isMultiTrip ? (route.trips?.length ?? 0) : 0;
}

export function routeLaborTotal(
  route: Pick<TransportRouteRow, 'isMultiTrip' | 'trips' | 'laborCost'>,
): number {
  if (!route.isMultiTrip) return route.laborCost ?? 0;
  return (route.trips ?? []).reduce((sum, leg) => sum + (leg.laborCost || 0), 0);
}

export function routePlaces(
  route: Pick<TransportRouteRow, 'isMultiTrip' | 'route' | 'trips'>,
): string[] {
  const places = [route.route?.pickup, route.route?.stuffing, route.route?.dropoff];
  if (route.isMultiTrip) {
    for (const leg of route.trips ?? []) places.push(leg.departure, leg.destination);
  }
  return places.filter((p): p is string => !!p && p.trim().length > 0);
}

export function routeContainerDisplay(
  route: Pick<TransportRouteRow, 'truckType' | 'containerSize'>,
  nonContainerTruckTypes: readonly string[],
): 'value' | 'any' | 'none' {
  if (route.containerSize) return 'value';
  return truckTypeCarriesContainer(route.truckType, nonContainerTruckTypes) ? 'any' : 'none';
}
