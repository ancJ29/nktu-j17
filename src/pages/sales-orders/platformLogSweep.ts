import { activityLoggerV2Connector } from '@credo/connectors/connector';
import { resolveClientCode } from '@/config/client-code';
import { logActivity } from '@/utils/activityLogger';
import { recomputeOnHand } from '@/utils/inventoryMath';
import { isActivityLoggingEnabled } from '@/utils/permission';
import { indexProductsByCode } from '@/utils/productByCode';
import { useProductStore } from '@/stores/useProductStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import type {
  InventoryLinkageSnapshotEntry,
  Product,
  SalesOrder,
  SalesOrderActivityEntry,
  SalesOrderExtra,
} from '@/types';

export const SETTLE_MS = 10 * 60 * 1000;

const SCAN_MARGIN_MS = 60 * 60 * 1000;

export const V2_FROM_MS = Date.parse('2026-08-19T00:00:00+07:00');

const toMs = (value: unknown): number =>
  value == null ? NaN : new Date(value as string | number).getTime();

const shipKey = (productId: string, at: number) => `${productId}@${at}`;

function isDue(entry: SalesOrderActivityEntry, now: number): boolean {
  const mark = entry.platformLog;
  if (mark?.state !== 'pending') return false;
  if (!(now - toMs(entry.timestamp) >= SETTLE_MS)) return false;
  if (mark.lastTryAt == null) return true;
  return now - mark.lastTryAt >= SETTLE_MS * 2 ** Math.max(0, (mark.tries ?? 1) - 1);
}

const extraOf = (so: SalesOrder) => (so.extra ?? {}) as SalesOrderExtra;

function legacyShipIndex(so: SalesOrder, log: readonly SalesOrderActivityEntry[]): number {
  const extra = extraOf(so);
  if (extra.isDeleted || extra.cheatAutoComplete) return -1;
  const linkage = extra.inventoryLinkage;
  if (linkage?.state !== 'shipped' || linkage.pendingShip || !linkage.shippedSnapshot?.length) {
    return -1;
  }
  const at = toMs(linkage.lastTransition?.at);
  if (!(at >= V2_FROM_MS)) return -1;
  const i = log.findIndex((e) => e.action === 'status_change' && toMs(e.timestamp) === at);
  return i >= 0 && !log[i].platformLog ? i : -1;
}

function timelineOf(so: SalesOrder): SalesOrderActivityEntry[] {
  const log = extraOf(so).activityLog ?? [];
  const legacy = legacyShipIndex(so, log);
  if (legacy < 0) return log;
  return log.map((entry, i) =>
    i === legacy ? { ...entry, platformLog: { state: 'pending', legacy: true } } : entry,
  );
}

export function hasDuePlatformLog(so: SalesOrder, now = Date.now()): boolean {
  return timelineOf(so).some((entry) => isDue(entry, now));
}

type ShipRow = { product: Product; row: InventoryLinkageSnapshotEntry };

export function shipRowsAt(
  so: SalesOrder,
  at: number,
  productsByCode: ReadonlyMap<string, Product>,
): ShipRow[] {
  const linkage = extraOf(so).inventoryLinkage;
  if (linkage?.state !== 'shipped' || linkage.pendingShip) return [];
  if (toMs(linkage.lastTransition?.at) !== at) return [];
  return (linkage.shippedSnapshot ?? []).flatMap((row) => {
    const product = productsByCode.get(row.itemCode);
    return product ? [{ product, row }] : [];
  });
}

export type FoundEntries = {
  status: ReadonlySet<number>;

  ship: ReadonlySet<string>;

  untimedShip: ReadonlySet<string>;
};

type Resend = {
  action: string;
  targetId: string;
  memo: Record<string, unknown>;
  at: number;
};

export type PlatformLogSweepPlan = {
  extra: SalesOrderExtra;

  resend: Resend[];
};

export function planPlatformLogSweep(
  so: SalesOrder,
  found: FoundEntries,
  productsByCode: ReadonlyMap<string, Product>,
  now: number,
): PlatformLogSweepPlan | null {
  const resend: Resend[] = [];
  let changed = false;

  const activityLog = timelineOf(so).map((entry): SalesOrderActivityEntry => {
    const mark = entry.platformLog;
    if (mark?.state !== 'pending') return entry;
    const at = toMs(entry.timestamp);
    const legacy = mark.legacy === true;
    const statusMissing = !legacy && !found.status.has(at);
    const shipMissing = shipRowsAt(so, at, productsByCode).filter(
      ({ product }) =>
        !found.ship.has(shipKey(product.id, at)) && !(legacy && found.untimedShip.has(product.id)),
    );
    if (!statusMissing && shipMissing.length === 0) {
      changed = true;
      return { ...entry, platformLog: { ...mark, state: 'logged' } };
    }
    if (!isDue(entry, now)) return entry;

    changed = true;
    const performedBy =
      entry.userId || entry.userName
        ? {
            performedBy: {
              ...(entry.userId && { id: entry.userId }),
              ...(entry.userName && { name: entry.userName }),
            },
          }
        : {};
    if (statusMissing) {
      resend.push({
        action: 'salesOrder.statusChange',
        targetId: so.id,
        at,
        memo: {
          orderNumber: so.orderNumber,
          fromStatus: entry.fromStatus ?? '',
          toStatus: entry.toStatus ?? '',
          ...(entry.note ? { note: entry.note } : {}),
          timelineAt: at,
          resent: true,
          ...performedBy,
        },
      });
    }
    for (const { product, row } of shipMissing) {
      const delta = -recomputeOnHand(product, row.byUnit);
      if (delta === 0) continue;
      resend.push({
        action: 'productInventory.adjust',
        targetId: product.id,
        at,
        memo: {
          itemCode: row.itemCode,
          locationCode: row.locationCode,
          delta,
          source: { kind: 'SO', id: so.id, label: so.orderNumber, at },
          resent: true,
          ...performedBy,
        },
      });
    }
    return {
      ...entry,
      platformLog: { ...mark, state: 'pending', tries: (mark.tries ?? 0) + 1, lastTryAt: now },
    };
  });

  return changed ? { extra: { ...extraOf(so), activityLog }, resend } : null;
}

type HistoryEntry = { action: string; memo: Record<string, unknown> };

type HistoryReader = (targetId: string, since: number) => Promise<readonly HistoryEntry[]>;

function createHistoryReader(): HistoryReader {
  const read = new Map<
    string,
    { entries: HistoryEntry[]; reached: number; cursor?: string; done: boolean }
  >();
  return async (targetId, since) => {
    let state = read.get(targetId);
    if (!state) {
      state = { entries: [], reached: Infinity, done: false };
      read.set(targetId, state);
    }

    while (!state.done && !(state.reached < since)) {
      const page = await activityLoggerV2Connector.getByTarget({
        targetId,
        clientId: resolveClientCode(),
        limit: 100,
        ...(state.cursor ? { cursor: state.cursor } : {}),
      });
      for (const entry of page.activities) {
        state.entries.push({ action: entry.action, memo: entry.memo ?? {} });
      }
      const oldest = page.activities.at(-1);
      state.reached = oldest ? toMs(oldest.createdAt) : -Infinity;
      state.cursor = page.nextCursor;
      state.done = !page.nextCursor || !oldest;
    }
    return state.entries;
  };
}

async function readFound(
  so: SalesOrder,
  timeline: readonly SalesOrderActivityEntry[],
  productIds: Iterable<string>,
  since: number,
  read: HistoryReader,
): Promise<FoundEntries> {
  const status = new Set<number>();
  const ship = new Set<string>();
  const untimedShip = new Set<string>();
  const owesStatus = timeline.some(
    (entry) => entry.platformLog?.state === 'pending' && !entry.platformLog.legacy,
  );
  if (owesStatus) {
    for (const { action, memo } of await read(so.id, since)) {
      if (action === 'salesOrder.statusChange' && typeof memo.timelineAt === 'number') {
        status.add(memo.timelineAt);
      }
    }
  }
  for (const productId of productIds) {
    for (const { action, memo } of await read(productId, since)) {
      const source = memo.source as { kind?: string; id?: string; at?: unknown } | undefined;
      if (action !== 'productInventory.adjust' || source?.kind !== 'SO' || source.id !== so.id) {
        continue;
      }
      if (typeof source.at === 'number') ship.add(shipKey(productId, source.at));
      else untimedShip.add(productId);
    }
  }
  return { status, ship, untimedShip };
}

export async function sweepSalesOrderPlatformLog(
  so: SalesOrder,
  now = Date.now(),
  read: HistoryReader = createHistoryReader(),
): Promise<SalesOrder | null> {
  if (!isActivityLoggingEnabled()) return null;
  const timeline = timelineOf(so);
  const due = timeline.filter((entry) => isDue(entry, now));
  if (due.length === 0) return null;

  const products = useProductStore.getState();
  if (!products.initialized) await products.loadAll();
  const productsByCode = indexProductsByCode(useProductStore.getState().items as Product[]);
  const productIds = new Set<string>();
  for (const entry of timeline) {
    if (entry.platformLog?.state !== 'pending') continue;
    for (const { product } of shipRowsAt(so, toMs(entry.timestamp), productsByCode)) {
      productIds.add(product.id);
    }
  }
  const since = Math.min(...due.map((entry) => toMs(entry.timestamp))) - SCAN_MARGIN_MS;

  let found: FoundEntries;
  try {
    found = await readFound(so, timeline, productIds, since, read);
  } catch {
    return null; // missing can't be told from present — leave the marks as they are
  }
  const plan = planPlatformLogSweep(so, found, productsByCode, now);
  if (!plan) return null;

  let written: SalesOrder;
  try {
    written = await useSalesOrderStore.getState().updateSafely({
      id: so.id,
      version: so.version,
      patch: { extra: plan.extra },
    });
  } catch {
    return null; // another tab claimed it, or the order moved
  }
  for (const { action, targetId, memo, at } of plan.resend) {
    logActivity(action, targetId, memo, at);
  }
  return written;
}

export async function sweepLoadedSalesOrdersPlatformLog(): Promise<number> {
  if (!isActivityLoggingEnabled()) return 0;
  const now = Date.now();
  const due = (useSalesOrderStore.getState().items as SalesOrder[]).filter(
    (so) => !extraOf(so).isDeleted && hasDuePlatformLog(so, now),
  );
  const read = createHistoryReader();
  let written = 0;
  for (const so of due) {
    if (await sweepSalesOrderPlatformLog(so, now, read)) written++;
  }
  return written;
}
