import { useEffect, useState } from 'react';
import { cMngtConnector } from '@credo/connectors/connector';
import { asyncDeduplicator, logger } from '@credo/base-ui/utils';
import { businessDateString } from '@/utils/code';
import type { GoodsReceipt, GoodsReceiptExtra, PurchaseOrder } from '@/types';
import { liveReceipt } from './purchaseOrderReceipts';
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

export function arrivalOf(
  po: Pick<PurchaseOrder, 'id'>,
  receipts: readonly GoodsReceipt[],
): Arrival {
  return arrivalFromReceipts(receipts.filter((r) => r.extra?.purchaseOrderId === po.id));
}

export function arrivalsByOrder(receipts: readonly GoodsReceipt[]): ReadonlyMap<string, Arrival> {
  const grouped = new Map<string, GoodsReceipt[]>();
  for (const r of receipts) {
    const id = r.extra?.purchaseOrderId;
    if (typeof id !== 'string' || id === '') continue;
    const list = grouped.get(id);
    if (list) list.push(r);
    else grouped.set(id, [r]);
  }
  return new Map([...grouped].map(([id, list]) => [id, arrivalFromReceipts(list)]));
}

export type ArrivalsState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unreadable' }
  | {
      readonly kind: 'ok';
      readonly arrivals: ReadonlyMap<string, Arrival>;
      readonly count: number;
    };

export function arrivalFor(state: ArrivalsState, po: Pick<PurchaseOrder, 'id'>): Arrival | null {
  return state.kind === 'ok' ? (state.arrivals.get(po.id) ?? NONE) : null;
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
    return { kind: 'ok', arrivals: arrivalsByOrder(receipts), count: receipts.length };
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
