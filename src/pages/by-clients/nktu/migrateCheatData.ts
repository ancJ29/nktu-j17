import { activityLoggerConnector, cMngtConnector } from '@credo/connectors/connector';
import { resolveClientCode } from '@/config/client-code';
import { businessDateString } from '@/utils/code';
import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import {
  buildLinkageSnapshotFromReserveOps,
  executeReservationPlan,
  planReservation,
  planShipFromLinkage,
  rollbackAppliedOps,
  type AppliedOp,
} from '@/utils/inventoryReservation';
import { buildReservedLinkage, buildShippedLinkage } from '@/utils/inventoryLinkage';
import { emitInventoryActivityForApplied } from '@/utils/inventoryActivityEmit';
import { isNoInventoryProduct } from '@/utils/productSet';
import { CHEAT_TAG, isCheatCompletedSalesOrder } from '@/utils/salesOrderCheatMarker';
import { useProductStore } from '@/stores/useProductStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import type { Product, SalesOrder, SalesOrderExtra } from '@/types';

const ONE_DAY = 24 * 60 * 60 * 1000;

const SCAN_BACK_DAYS = 180;

const MAX_ACTIVITY_PAGES = 50;
const ACTIVITY_PAGE_SIZE = 100;

type NotesOutcome = 'fixed' | 'clean' | 'failed';
type InventoryOutcome =
  | 'deducted'
  | 'deducted-nothing' // no inventory-managed lines — just marked shipped
  | 'skipped-already-deducted' // product activity already references this SO
  | 'skipped-already-shipped' // linkage already 'shipped'
  | 'skipped-cancelled'
  | 'skipped-inconclusive' // activity scan hit its cap — left for manual review
  | 'failed';

export type CheatMigrationDetail = {
  salesOrderId: string;
  orderNumber?: string;
  notes: NotesOutcome;
  inventory: InventoryOutcome;
  reason?: string;
};

export type CheatMigrationSummary = {
  scanned: number;
  matched: number;
  notesFixed: number;
  inventoryDeducted: number;
  failed: number;
  details: CheatMigrationDetail[];
};

function stripCheatLines(notes: string | undefined): string {
  return (notes ?? '')
    .split('\n')
    .filter((line) => !line.includes(CHEAT_TAG))
    .join('\n')
    .trim();
}

function parseMarkerFromNotes(so: SalesOrder): { at: number; drNumbers: string[] } {
  const notes = so.notes ?? '';
  const drNumbers = Array.from(notes.matchAll(/DR-\d{6}-\d{3}/g), (m) => m[0]);
  const dateMatch = notes.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  let at = NaN;
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    at = new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`).getTime();
  }
  if (Number.isNaN(at)) {
    const fallback = so.updatedAt ?? so.createdAt;
    const parsed = fallback ? new Date(fallback).getTime() : NaN;
    at = Number.isNaN(parsed) ? 0 : parsed;
  }
  return { at, drNumbers };
}

async function fixNotesAndMarker(
  so: SalesOrder,
): Promise<{ so: SalesOrder; outcome: NotesOutcome }> {
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  const hasVisibleTag = (so.notes ?? '').includes(CHEAT_TAG);
  if (!hasVisibleTag && extra.cheatAutoComplete != null) return { so, outcome: 'clean' };

  const nextExtra: SalesOrderExtra = {
    ...extra,
    cheatAutoComplete: extra.cheatAutoComplete ?? parseMarkerFromNotes(so),
  };
  const res = await cMngtConnector.updateSalesOrder<SalesOrderExtra>({
    id: so.id,
    version: so.version,
    notes: stripCheatLines(so.notes),
    extra: nextExtra,
  });
  return { so: res.salesOrder as SalesOrder, outcome: 'fixed' };
}

async function patchLinkage(
  so: SalesOrder,
  linkage: SalesOrderExtra['inventoryLinkage'],
): Promise<SalesOrder> {
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  const res = await cMngtConnector.updateSalesOrder<SalesOrderExtra>({
    id: so.id,
    version: so.version,
    extra: { ...extra, inventoryLinkage: linkage },
  });
  return res.salesOrder as SalesOrder;
}

async function soHasInventoryActivity(
  soId: string,
  productIds: readonly string[],
): Promise<'exists' | 'absent' | 'inconclusive'> {
  const clientId = resolveClientCode();
  for (const targetId of productIds) {
    let cursor: string | undefined;
    let pages = 0;
    do {
      let res;
      try {
        res = await activityLoggerConnector.getByTarget({
          targetId,
          clientId,
          limit: ACTIVITY_PAGE_SIZE,
          cursor,
        });
      } catch {
        return 'inconclusive';
      }
      for (const a of res.activities) {
        if (a.action !== 'productInventory.adjust') continue;
        const source = a.memo?.source as { kind?: string; id?: string } | undefined;
        if (source?.kind === 'SO' && source.id === soId) return 'exists';
      }
      cursor = res.nextCursor;
      if (++pages >= MAX_ACTIVITY_PAGES && cursor) return 'inconclusive';
    } while (cursor);
  }
  return 'absent';
}

async function backfillInventory(
  so: SalesOrder,
  productsByCode: Map<string, Product>,
): Promise<{ outcome: InventoryOutcome; reason?: string }> {
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  if (extra.cancellation != null) return { outcome: 'skipped-cancelled' };

  if (extra.inventoryLinkage?.state === 'shipped') return { outcome: 'skipped-already-shipped' };

  const productIds = new Set<string>();
  for (const line of so.items) {
    if (!line.productCode) continue;
    const p = productsByCode.get(line.productCode);
    if (!p || isNoInventoryProduct(p)) continue;
    productIds.add(p.id);
  }

  if (productIds.size > 0) {
    const activity = await soHasInventoryActivity(so.id, [...productIds]);
    if (activity === 'exists') return { outcome: 'skipped-already-deducted' };
    if (activity === 'inconclusive') return { outcome: 'skipped-inconclusive' };
  }

  const at = Date.now();
  const statusValue = extra.status ?? '';
  let current = so;
  let inv = indexInventoryByProduct(useProductInventoryStore.getState().items);

  let snapshot =
    extra.inventoryLinkage?.state === 'reserved'
      ? (extra.inventoryLinkage.reservedSnapshot ?? [])
      : null;

  if (snapshot === null) {
    const reservePlan = planReservation({
      action: 'reserve',
      so: current,
      productsByCode,
      inventoryByProduct: inv,
    });
    if (!reservePlan.ok) return { outcome: 'failed', reason: 'reserve-plan' };
    if (reservePlan.plan.ops.length === 0) {
      try {
        await patchLinkage(
          current,
          buildShippedLinkage(at, undefined, { kind: 'completion-auto-ship', statusValue }),
        );
      } catch {
        return { outcome: 'failed', reason: 'noop-patch' };
      }
      return { outcome: 'deducted-nothing' };
    }
    const exec = await executeReservationPlan(reservePlan.plan.ops);
    if (!exec.ok) {
      useProductInventoryStore.getState().forceRefresh();
      return { outcome: 'failed', reason: 'reserve-exec' };
    }
    snapshot = buildLinkageSnapshotFromReserveOps(reservePlan.plan.ops);
    try {
      current = await patchLinkage(
        current,
        buildReservedLinkage(snapshot, at, undefined, {
          kind: 'capability',
          capabilityId: 'reservesStock',
          statusValue,
        }),
      );
    } catch {
      await rollbackAppliedOps(exec.applied);
      useProductInventoryStore.getState().forceRefresh();
      return { outcome: 'failed', reason: 'reserve-patch' };
    }
    inv = indexInventoryByProduct(useProductInventoryStore.getState().items);
  }

  const shipPlan = planShipFromLinkage({
    snapshot,
    so: current,
    productsByCode,
    inventoryByProduct: inv,
  });
  if (!shipPlan.ok) return { outcome: 'failed', reason: 'ship-plan' };

  let appliedShip: readonly AppliedOp[] = [];
  if (shipPlan.plan.ops.length > 0) {
    const exec = await executeReservationPlan(shipPlan.plan.ops);
    if (!exec.ok) {
      useProductInventoryStore.getState().forceRefresh();
      return { outcome: 'failed', reason: 'ship-exec' };
    }
    appliedShip = exec.applied;
  }
  try {
    await patchLinkage(
      current,
      buildShippedLinkage(at, undefined, { kind: 'completion-auto-ship', statusValue }),
    );
  } catch {
    if (appliedShip.length > 0) await rollbackAppliedOps(appliedShip);
    useProductInventoryStore.getState().forceRefresh();
    return { outcome: 'failed', reason: 'ship-patch' };
  }

  useProductInventoryStore.getState().forceRefresh();

  if (appliedShip.length > 0) {
    emitInventoryActivityForApplied(appliedShip, {
      kind: 'SO',
      id: so.id,
      label: so.orderNumber,
      suffix: '(backfill)',
    });
  }
  return { outcome: 'deducted' };
}

export async function migrateNktuCheatData(): Promise<CheatMigrationSummary> {
  const summary: CheatMigrationSummary = {
    scanned: 0,
    matched: 0,
    notesFixed: 0,
    inventoryDeducted: 0,
    failed: 0,
    details: [],
  };

  const invStore = useProductInventoryStore.getState();
  if (!invStore.initialized) await invStore.loadAll();
  const prodStore = useProductStore.getState();
  if (!prodStore.initialized) await prodStore.loadAll();
  const productsByCode = new Map<string, Product>();
  for (const p of useProductStore.getState().items as Product[]) productsByCode.set(p.code, p);

  const now = Date.now();
  const fromPeriod = businessDateString(now - SCAN_BACK_DAYS * ONE_DAY);
  const toPeriod = businessDateString(now + ONE_DAY);
  const res = await cMngtConnector.querySalesOrders<SalesOrderExtra>({ fromPeriod, toPeriod });
  const orders = res.salesOrders as SalesOrder[];
  summary.scanned = orders.length;

  for (const order of orders) {
    const isCheat = isCheatCompletedSalesOrder(order) || (order.notes ?? '').includes(CHEAT_TAG);
    if (!isCheat) continue;
    summary.matched++;
    const detail: CheatMigrationDetail = {
      salesOrderId: order.id,
      orderNumber: order.orderNumber,
      notes: 'clean',
      inventory: 'failed',
    };

    let current = order;

    try {
      const notesRes = await fixNotesAndMarker(current);
      current = notesRes.so;
      detail.notes = notesRes.outcome;
      if (notesRes.outcome === 'fixed') summary.notesFixed++;
    } catch (err) {
      detail.notes = 'failed';
      detail.reason = `notes: ${err instanceof Error ? err.message : String(err)}`;
    }

    try {
      const inv = await backfillInventory(current, productsByCode);
      detail.inventory = inv.outcome;
      if (inv.reason)
        detail.reason = `${detail.reason ? `${detail.reason}; ` : ''}inv: ${inv.reason}`;
      if (inv.outcome === 'deducted' || inv.outcome === 'deducted-nothing')
        summary.inventoryDeducted++;
      if (inv.outcome === 'failed') summary.failed++;
    } catch (err) {
      detail.inventory = 'failed';
      detail.reason = `${detail.reason ? `${detail.reason}; ` : ''}inv: ${err instanceof Error ? err.message : String(err)}`;
      summary.failed++;
    }

    summary.details.push(detail);
  }

  return summary;
}
