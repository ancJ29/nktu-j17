import type { SalesOrder, SalesOrderExtra } from '@/types';
import type { CMngtPartitionedQuerySyncResponse } from '@credo/connectors/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { createPartitionedSyncFetcher } from './createPartitionedFetcher';
import { ONE_MINUTE } from '@credo/kits/time';

type SalesOrderPatch = Omit<
  Parameters<typeof cMngtConnector.updateSalesOrder<SalesOrderExtra>>[0],
  'id'
>;

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_RANGE_DAYS = 14;

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DEFAULT_RANGE_DAYS);
  return { from: fmt(from), to: fmt(to) };
}

let currentRange: { from: string; to: string } = defaultRange();

export function setSalesOrderQueryRange(from: Date | null, to: Date | null): void {
  if (!from || !to) {
    currentRange = defaultRange();
    return;
  }
  currentRange = { from: fmt(from), to: fmt(to) };
}

const fetchSalesOrders = createPartitionedSyncFetcher<SalesOrder>({
  cacheKey: 'so',
  getRange: () => currentRange,
  querySync: (req) =>
    cMngtConnector.querySalesOrdersSync<SalesOrderExtra>(req) as Promise<
      CMngtPartitionedQuerySyncResponse<SalesOrder>
    >,
});

export const useSalesOrderStore = createEntityStore<SalesOrder, SalesOrderPatch>({
  cacheKey: 'so',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
  fetchAll: fetchSalesOrders,
  fetchOne: (id) =>
    cMngtConnector
      .getSalesOrderById<SalesOrderExtra>({ id })
      .then((r) => r.salesOrder as SalesOrder),
  update: (id, patch) =>
    cMngtConnector
      .updateSalesOrder<SalesOrderExtra>({ id, ...patch })
      .then((r) => ({ item: r.salesOrder as SalesOrder })),
});
