import { useCallback, useEffect, useMemo } from 'react';
import type { FuelNormRow, TransportRouteRow } from '@/types';
import { useFuelNormStore } from '@/stores/useFuelNormStore';
import { useFuelPriceStore } from '@/stores/useFuelPriceStore';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { resolveCurrentFuelPrice } from '../cost-norms/fuelPrice';
import { computeRouteCosting, type RouteCosting } from './routeCosting';

export function buildFuelNormMap(rows: readonly FuelNormRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.extra?.isDeleted) continue;
    if (!row.truckType) continue;
    map.set(row.truckType, row.litersPer100km || 0);
  }
  return map;
}

export type RouteCostingContext = {
  fuelPricePerLiter: number | undefined;

  norms: Map<string, number>;

  costOf: (
    route: Parameters<typeof computeRouteCosting>[0] & Pick<TransportRouteRow, 'truckType'>,
  ) => RouteCosting;
};

export function useRouteCosting(): RouteCostingContext {
  const normItems = useFuelNormStore((s) => s.items);
  const normsInit = useFuelNormStore((s) => s.initialized);
  const loadNorms = useFuelNormStore((s) => s.loadAll);
  const priceItems = useFuelPriceStore((s) => s.items);
  const pricesInit = useFuelPriceStore((s) => s.initialized);
  const loadPrices = useFuelPriceStore((s) => s.loadAll);

  useEffect(() => {
    if (!normsInit) void loadNorms();
    if (!pricesInit) void loadPrices();
  }, [normsInit, loadNorms, pricesInit, loadPrices]);

  const today = todayInVnDateString();
  const norms = useMemo(() => buildFuelNormMap(normItems), [normItems]);
  const currentPrice = useMemo(
    () => resolveCurrentFuelPrice(priceItems, today),
    [priceItems, today],
  );
  const fuelPricePerLiter = currentPrice?.price;

  const costOf = useCallback<RouteCostingContext['costOf']>(
    (route) =>
      computeRouteCosting(route, {
        litersPer100km: route.truckType ? norms.get(route.truckType) : undefined,
        fuelPricePerLiter,
      }),
    [norms, fuelPricePerLiter],
  );

  return { fuelPricePerLiter, norms, costOf };
}
