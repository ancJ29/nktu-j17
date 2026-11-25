import { useEffect, useState } from 'react';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator, logger } from '@credo/base-ui/utils';
import { businessDateString } from '@/utils/code';
import type { GoodsReceipt, GoodsReceiptExtra, PurchaseOrder } from '@/types';
import { liveReceipt, type ReceiptsRead } from './purchaseOrderReceipts';
import { poStatus, vnDayOf } from './purchaseOrderModel';

export type Arrival =
  | {
      readonly kind: 'received';
      readonly day: string;
    }
  | { readonly kind: 'draft' }
  | { readonly kind: 'none' };

const NONE: Arrival = { kind: 'none' };

function arrivalFromReceipts(receipts: readonly GoodsReceipt[]): Arrival {
  const live = receipts.filter(liveReceipt);
  const days = live
    .filter((r) => r.status === 'received')
    // The confirm's stamp; a receipt confirmed before the stamp existed falls back to its date.
    .map((r) => vnDayOf(r.receivedAt) || vnDayOf(r.receivedDate))
    .filter((d) => d !== '')
    .sort();
  if (days[0]) return { kind: 'received', day: days[0] };
  return live.length > 0 ? { kind: 'draft' } : NONE;
}

export function withReceivedMark(
  arrival: Arrival | null,
  po: Pick<PurchaseOrder, 'status' | 'receivedAt'>,
): Arrival | null {
  if (arrival === null || arrival.kind === 'received') return arrival;
  const day = poStatus(po) === 'received' ? vnDayOf(po.receivedAt) : '';
  return day ? { kind: 'received', day } : arrival;
}

export function arrivalOf(
  po: Pick<PurchaseOrder, 'id' | 'status' | 'receivedAt'>,
  receipts: readonly GoodsReceipt[],
): Arrival {
  const own = arrivalFromReceipts(receipts.filter((r) => r.extra?.purchaseOrderId === po.id));
  return withReceivedMark(own, po) ?? own;
}

export function receiptsByOrder(
  receipts: readonly GoodsReceipt[],
): ReadonlyMap<string, readonly GoodsReceipt[]> {
  const grouped = new Map<string, GoodsReceipt[]>();
  for (const r of receipts) {
    const id = r.extra?.purchaseOrderId;
    if (typeof id !== 'string' || id === '') continue;
    const list = grouped.get(id);
    if (list) list.push(r);
    else grouped.set(id, [r]);
  }
  return grouped;
}

export function arrivalsByOrder(receipts: readonly GoodsReceipt[]): ReadonlyMap<string, Arrival> {
  return new Map(
    [...receiptsByOrder(receipts)].map(([id, list]) => [id, arrivalFromReceipts(list)]),
  );
}

export type ArrivalsState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unreadable' }
  | {
      readonly kind: 'ok';
      readonly arrivals: ReadonlyMap<string, Arrival>;

      readonly receiptsByOrder: ReadonlyMap<string, readonly GoodsReceipt[]>;
      readonly count: number;
    };

export function arrivalFor(
  state: ArrivalsState,
  po: Pick<PurchaseOrder, 'id' | 'status' | 'receivedAt'>,
): Arrival | null {
  return withReceivedMark(state.kind === 'ok' ? (state.arrivals.get(po.id) ?? NONE) : null, po);
}

export function receiptsFor(
  state: ArrivalsState,
  po: Pick<PurchaseOrder, 'id'>,
): ReceiptsRead | null {
  if (state.kind === 'loading') return null;
  if (state.kind === 'unreadable') return { kind: 'unreadable' };
  return { kind: 'ok', receipts: [...(state.receiptsByOrder.get(po.id) ?? [])] };
}

export function notArrivedCount(
  orders: readonly PurchaseOrder[],
  state: ArrivalsState,
): number | null {
  if (state.kind !== 'ok') return null;
  return orders.filter(
    (o) => poStatus(o) === 'ready' && (state.arrivals.get(o.id) ?? NONE).kind !== 'received',
  ).length;
}

export async function readArrivals(fromDay: string): Promise<ArrivalsState> {
  const toDay = businessDateString();
  try {
    const receipts = await asyncDeduplicator.call(`po-arrivals:${fromDay}:${toDay}`, async () => {
      const res = await cMngtConnector.queryGoodsReceipts<GoodsReceiptExtra>({
        fromPeriod: fromDay,
        toPeriod: toDay,
      });
      return res.goodsReceipts as GoodsReceipt[];
    });
    return {
      kind: 'ok',
      arrivals: arrivalsByOrder(receipts),
      receiptsByOrder: receiptsByOrder(receipts),
      count: receipts.length,
    };
  } catch (err) {
    logger.error('Reading the receipts behind the purchase-order list failed:', err);
    return { kind: 'unreadable' };
  }
}

export function usePurchaseOrderArrivals(fromDay: string, refreshKey: unknown): ArrivalsState {
  const [done, setDone] = useState<{
    fromDay: string;
    refreshKey: unknown;
    read: ArrivalsState;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void readArrivals(fromDay).then((read) => {
      if (!cancelled) setDone({ fromDay, refreshKey, read });
    });
    return () => {
      cancelled = true;
    };
  }, [fromDay, refreshKey]);
  return done && done.fromDay === fromDay && Object.is(done.refreshKey, refreshKey)
    ? done.read
    : { kind: 'loading' };
}
