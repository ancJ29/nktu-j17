import { useCallback, useMemo, useRef } from 'react';

import { getCancellationTargetStatusValue } from '@/pages/sales-orders/transitionEngine';
import { salesOrderFieldOptions } from '@/pages/sales-orders/useSalesOrderFieldOptions';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import type { SalesOrder, SalesOrderExtra } from '@/types';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import type { ResolvedStatusOption } from '@/utils/permission';

export const SO_FETCH_DAYS = 90;

export type ReservationOrderStatus = {
  order: SalesOrder | undefined;

  status: ResolvedStatusOption | undefined;

  cancelled: boolean;
};

const UNKNOWN: ReservationOrderStatus = { order: undefined, status: undefined, cancelled: false };

export type ReservationOrderStatusSource = {
  readonly hydrate: (force?: boolean) => void;

  readonly firstLoad: boolean;
  readonly resolve: (salesOrderId: string) => ReservationOrderStatus;
};

export function useReservationOrderStatus(): ReservationOrderStatusSource {
  const salesOrders = useSalesOrderStore((s) => s.items);
  const initialized = useSalesOrderStore((s) => s.initialized);
  const loading = useSalesOrderStore((s) => s.loading);
  const loadAll = useSalesOrderStore((s) => s.loadAll);
  const forceRefresh = useSalesOrderStore((s) => s.forceRefresh);

  const hydrated = useRef(false);
  const hydrate = useCallback(
    (force = false) => {
      if (hydrated.current && !force) return;
      hydrated.current = true;
      const range = defaultLastNDaysRange(SO_FETCH_DAYS);
      setSalesOrderQueryRange(range.from, range.to);

      if (initialized) forceRefresh();
      else loadAll();
    },
    [initialized, loadAll, forceRefresh],
  );

  const orderById = useMemo(() => {
    const m = new Map<string, SalesOrder>();
    for (const so of salesOrders) m.set(so.id, so);
    return m;
  }, [salesOrders]);

  const resolve = useCallback(
    (salesOrderId: string): ReservationOrderStatus => {
      const order = orderById.get(salesOrderId);
      if (!order) return UNKNOWN;
      const extra = (order.extra ?? {}) as SalesOrderExtra;

      const cancelled = extra.cancellation != null;
      const statusValue = cancelled
        ? (getCancellationTargetStatusValue() ?? extra.status)
        : extra.status;
      return {
        order,
        status: statusValue ? salesOrderFieldOptions.resolveStatus(statusValue) : undefined,
        cancelled,
      };
    },
    [orderById],
  );

  const firstLoad = loading && !initialized;
  return useMemo(() => ({ hydrate, firstLoad, resolve }), [hydrate, firstLoad, resolve]);
}
