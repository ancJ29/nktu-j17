import type { TransportRouteRow } from '@/types';
import { routeLaborTotal } from './routeSummary';

export type RouteCostingGap = 'norm' | 'price';

export type RouteCostingInputs = {
  litersPer100km?: number | undefined;

  fuelPricePerLiter?: number | undefined;
};

export type RouteCosting = {
  distanceKm: number;

  liters: number;

  fuelCost: number;

  laborTotal: number;

  itemsTotal: number;

  costPrice: number;

  markupPercent: number;

  suggestedPrice: number;

  missing: RouteCostingGap[];
};

const toDong = (n: number) => Math.round(n) || 0;

export function routeDistanceTotal(route: Pick<TransportRouteRow, 'segments'>): number {
  return (route.segments ?? []).reduce((sum, seg) => sum + (seg.distanceKm || 0), 0);
}

export function routeCostItemsTotal(route: Pick<TransportRouteRow, 'costItems'>): number {
  return (route.costItems ?? []).reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function computeRouteCosting(
  route: Pick<
    TransportRouteRow,
    'segments' | 'costItems' | 'markupPercent' | 'isMultiTrip' | 'trips' | 'laborCost'
  >,
  inputs: RouteCostingInputs,
): RouteCosting {
  const distanceKm = routeDistanceTotal(route);
  const norm = inputs.litersPer100km ?? 0;
  const price = inputs.fuelPricePerLiter ?? 0;

  const missing: RouteCostingGap[] = [];

  if (distanceKm > 0 && !norm) missing.push('norm');

  if (distanceKm > 0 && norm > 0 && !price) missing.push('price');

  const liters = (distanceKm / 100) * norm;
  const fuelCost = toDong(liters * price);
  const laborTotal = routeLaborTotal(route);
  const itemsTotal = routeCostItemsTotal(route);
  const costPrice = fuelCost + laborTotal + itemsTotal;
  const markupPercent = route.markupPercent || 0;

  return {
    distanceKm,
    liters,
    fuelCost,
    laborTotal,
    itemsTotal,
    costPrice,
    markupPercent,
    suggestedPrice: toDong(costPrice * (1 + markupPercent / 100)),
    missing,
  };
}

export function quoteMargin(
  quotedPrice: number,
  costPrice: number,
): { amount: number; percent: number | null } {
  const amount = (quotedPrice || 0) - (costPrice || 0);
  return { amount, percent: costPrice > 0 ? (amount / costPrice) * 100 : null };
}
