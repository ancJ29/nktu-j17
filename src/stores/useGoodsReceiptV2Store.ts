import { credoSmeConnector } from '@credo/connectors/connector';
import type { GoodsReceiptV2, GoodsReceiptV2LineInput } from '@/types/goods-receipt-v2';
import { createPartitionedDayStore } from './createPartitionedDayStore';
import { revalidateStockFor } from './stockAfterWrite';

const partition = createPartitionedDayStore<GoodsReceiptV2>({
  cacheKey: 'grv2.4f81ba',
  querySync: (input) => credoSmeConnector.querySyncGoodsReceipts(input),
});

export const useGoodsReceiptV2Store = partition.store;

export const setGoodsReceiptV2Range = partition.setRange;

export const fetchGoodsReceiptV2Window = partition.fetchWindow;

export async function createGoodsReceiptV2(input: {
  vendorId?: string;
  receivedDate?: string;
  reference?: string;
  notes?: string;
  items: GoodsReceiptV2LineInput[];

  extra?: Record<string, unknown>;
}): Promise<GoodsReceiptV2> {
  const written = await partition.write(() => credoSmeConnector.createGoodsReceipt(input));
  revalidateStockFor(written);
  return written;
}

export async function updateGoodsReceiptV2(
  receipt: GoodsReceiptV2,
  day: string,
  patch: {
    vendorId?: string | null;
    receivedDate?: string;
    reference?: string;
    notes?: string;
    items?: GoodsReceiptV2LineInput[];

    extra?: Record<string, unknown>;
  },
): Promise<GoodsReceiptV2> {
  const written = await partition.writeSafely(receipt, day, (cas) =>
    credoSmeConnector.updateGoodsReceipt({
      id: receipt.id,
      patch,
      ...cas,
    }),
  );
  revalidateStockFor(written);
  return written;
}

export async function transitionGoodsReceiptV2(
  to: string,
  receipt: GoodsReceiptV2,
  day: string,
): Promise<GoodsReceiptV2> {
  const written = await partition.transitionSafely(receipt, day, (cas) =>
    credoSmeConnector.transitionGoodsReceipt({
      id: receipt.id,
      to,
      ...cas,
    }),
  );
  revalidateStockFor(written);
  return written;
}

export async function getGoodsReceiptV2ById(
  id: string,
): Promise<{ item: GoodsReceiptV2; day: string }> {
  const res = await credoSmeConnector.getGoodsReceiptById({ id });
  return { item: res.item, day: res.day };
}
