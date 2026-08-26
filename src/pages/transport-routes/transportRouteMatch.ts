import type { TransportRouteRow } from '@/types';
import { placeKey } from '../transport-orders/placeSuggestions';
import { isRouteLive } from './routeSummary';

export type DraftLeg = { departure: string; destination: string };

export type TransportRouteDraft = {
  isMultiTrip: boolean;

  truckType: string;
  containerSize: string;

  pickup: string;

  dropoff: string;

  legs: DraftLeg[];
};

function samePlace(a: string | undefined, b: string | undefined): boolean {
  const ka = placeKey(a ?? '');
  const kb = placeKey(b ?? '');
  return ka.length > 0 && ka === kb;
}

function matchesShape(draft: TransportRouteDraft, route: TransportRouteRow): boolean {
  if (draft.isMultiTrip !== !!route.isMultiTrip) return false;

  if (!draft.isMultiTrip) {
    return (
      samePlace(draft.pickup, route.route?.pickup) && samePlace(draft.dropoff, route.route?.dropoff)
    );
  }

  const legs = route.trips ?? [];
  if (legs.length === 0 || legs.length !== draft.legs.length) return false;
  return draft.legs.every(
    (leg, i) =>
      samePlace(leg.departure, legs[i]?.departure) &&
      samePlace(leg.destination, legs[i]?.destination),
  );
}

export function matchTransportRoutes(
  draft: TransportRouteDraft,
  routes: readonly TransportRouteRow[],
): TransportRouteRow[] {
  if (!draft.truckType) return [];

  return routes
    .filter((route) => {
      if (!isRouteLive(route)) return false;
      if (route.truckType !== draft.truckType) return false;

      if ((route.containerSize ?? '') !== draft.containerSize) return false;
      return matchesShape(draft, route);
    })
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
