import type { GoodsReceipt, GoodsReceiptExtra } from '@/types';
import type { CMngtPartitionedQuerySyncResponse } from '@credo/connectors/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { createPartitionedSyncFetcher } from './createPartitionedFetcher';
import { ONE_MINUTE } from '@credo/kits/time';

type GoodsReceiptPatch = Omit<
  Parameters<typeof cMngtConnector.updateGoodsReceipt<GoodsReceiptExtra>>[0],
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

export function setGoodsReceiptQueryRange(from: Date | null, to: Date | null): void {
  if (!from || !to) {
    currentRange = defaultRange();
    return;
  }
  currentRange = { from: fmt(from), to: fmt(to) };
}

const fetchGoodsReceipts = createPartitionedSyncFetcher<GoodsReceipt>({
  cacheKey: 'gr',
  getRange: () => currentRange,
  querySync: (req) =>
    cMngtConnector.queryGoodsReceiptsSync<GoodsReceiptExtra>(req) as Promise<
      CMngtPartitionedQuerySyncResponse<GoodsReceipt>
    >,
});

export const useGoodsReceiptStore = createEntityStore<GoodsReceipt, GoodsReceiptPatch>({
  cacheKey: 'gr',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,
  fetchAll: fetchGoodsReceipts,
  fetchOne: (id) =>
    cMngtConnector
      .getGoodsReceiptById<GoodsReceiptExtra>({ id })
      .then((r) => r.goodsReceipt as GoodsReceipt),
  update: (id, patch) =>
    cMngtConnector
      .updateGoodsReceipt<GoodsReceiptExtra>({ id, ...patch })
      .then((r) => ({ item: r.goodsReceipt as GoodsReceipt })),
});
