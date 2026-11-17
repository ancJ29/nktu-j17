import { useCallback, useEffect, useMemo, useState } from 'react';

import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { countStockMovements, NO_MOVEMENT, type StockMovement } from '@/utils/stockMovement';

import { SO_FETCH_DAYS } from './productInventoryListVariant';

export type StockMovementSource = {
  readonly ready: boolean;

  readonly get: (productCode: string) => StockMovement | undefined;
};

export function useStockMovement(enabled: boolean): StockMovementSource {
  const orders = useSalesOrderStore((s) => s.items);
  const [ready, setReady] = useState(false);

  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const range = defaultLastNDaysRange(SO_FETCH_DAYS);
    setSalesOrderQueryRange(range.from, range.to);

    const { initialized, forceRefresh, loadAll } = useSalesOrderStore.getState();
    void (initialized ? forceRefresh() : loadAll()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const movements = useMemo(
    () => (enabled && ready ? countStockMovements(orders, now) : null),
    [enabled, ready, orders, now],
  );
  const get = useCallback(
    (code: string) => (movements ? (movements.get(code) ?? NO_MOVEMENT) : undefined),
    [movements],
  );
  return useMemo(() => ({ ready: movements !== null, get }), [movements, get]);
}
