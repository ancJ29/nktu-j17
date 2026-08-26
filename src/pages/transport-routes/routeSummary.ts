import type { TransportRouteRow } from '@/types';
import type { RouteStop } from '../transport-orders/TransportRouteCell';
import { truckTypeCarriesContainer } from '../transport-orders/containerTruckType';

export type RouteEndpoints = { from: string; to: string };

export function isRouteLive(route: Pick<TransportRouteRow, 'isActive' | 'extra'>): boolean {
  return !route.extra?.isDeleted && route.isActive;
}

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
): 'value' | 'missing' | 'none' {
  if (route.containerSize) return 'value';
  return truckTypeCarriesContainer(route.truckType, nonContainerTruckTypes) ? 'missing' : 'none';
}

export function routeJourneyLegs(
  route: Pick<TransportRouteRow, 'isMultiTrip' | 'route' | 'trips'>,
): RouteStop[][] {
  const clean = (places: (string | undefined)[]): RouteStop[] =>
    places.map((place) => ({ place: place?.trim() ?? '' })).filter((stop) => stop.place.length > 0);

  if (route.isMultiTrip) {
    return (route.trips ?? []).map((leg) => clean([leg.departure, leg.destination]));
  }
  return [clean([route.route?.pickup, route.route?.stuffing, route.route?.dropoff])];
}
