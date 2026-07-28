import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import type { CMngtPartitionedQuerySyncResponse } from '@credo/connectors/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { createPartitionedSyncFetcher } from './createPartitionedFetcher';
import { ONE_MINUTE } from '@credo/kits/time';

type DeliveryRequestPatch = Omit<
  Parameters<typeof cMngtConnector.updateDeliveryRequest<DeliveryRequestExtra>>[0],
  'id'
>;

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DEFAULT_RANGE_DAYS = 90;

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DEFAULT_RANGE_DAYS);
  return { from: fmt(from), to: fmt(to) };
}

let currentRange: { from: string; to: string } = defaultRange();

export function setDeliveryRequestQueryRange(from: Date | null, to: Date | null): void {
  if (!from || !to) {
    currentRange = defaultRange();
    return;
  }
  currentRange = { from: fmt(from), to: fmt(to) };
}

export function getDeliveryRequestQueryRange(): { from: string; to: string } {
  return currentRange;
}

const fetchDeliveryRequests = createPartitionedSyncFetcher<DeliveryRequest>({
  cacheKey: 'dr',
  getRange: () => currentRange,
  querySync: (req) =>
    cMngtConnector.queryDeliveryRequestsSync<DeliveryRequestExtra>(req) as Promise<
      CMngtPartitionedQuerySyncResponse<DeliveryRequest>
    >,
});

export const useDeliveryRequestStore = createEntityStore<DeliveryRequest, DeliveryRequestPatch>({
  cacheKey: 'dr',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
  fetchAll: fetchDeliveryRequests,
  fetchOne: (id) =>
    cMngtConnector
      .getDeliveryRequestById<DeliveryRequestExtra>({ id })
      .then((r) => r.deliveryRequest as DeliveryRequest),
  update: (id, patch) =>
    cMngtConnector
      .updateDeliveryRequest<DeliveryRequestExtra>({ id, ...patch })
      .then((r) => ({ item: r.deliveryRequest as DeliveryRequest })),
});
