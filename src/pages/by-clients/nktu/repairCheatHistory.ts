import { activityLoggerV2Connector } from '@credo/connectors/connector';
import { resolveClientCode } from '@/config/client-code';
import { logActivity } from '@/utils/activityLogger';
import { recomputeOnHand } from '@/utils/inventoryMath';
import { isActivityLoggingEnabled } from '@/utils/permission';
import { indexProductsByCode } from '@/utils/productByCode';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useProductStore } from '@/stores/useProductStore';
import { ensureReconcileStoresLoaded } from '@/pages/sales-orders/reconcileFromDeliveries';
import { CHEAT_AUDIT_TAG, pickDeliveryActor } from './cheatCompleteSalesOrders';
import type {
  DeliveryRequest,
  InventoryLinkageSnapshotEntry,
  Product,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';

const PROGRESS_EVERY = 25;

const V2_FROM_MS = Date.parse('2026-08-19T00:00:00+07:00');

const SCAN_MARGIN_MS = 60 * 60 * 1000;

type Actor = { id: string; name: string };

export type CheatHistoryRepairPlan = {
  extra: SalesOrderExtra;

  shippedAt?: number;

  shippedRows: InventoryLinkageSnapshotEntry[];
};

const toMs = (value: unknown): number =>
  value == null ? NaN : new Date(value as string | number).getTime();

export function planCheatHistoryRepair(
  so: SalesOrder,
  actor: Actor | undefined,
): CheatHistoryRepairPlan | null {
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  const marker = extra.cheatAutoComplete;
  if (!marker || marker.historyOk) return null;

  const log = extra.activityLog ?? [];
  const completionIdx = log.findIndex(
    (e) => e.action === 'status_change' && toMs(e.timestamp) >= marker.at,
  );
  const activityLog = log.map((e, i) =>
    i === completionIdx
      ? {
          ...e,
          ...(actor && { userId: actor.id, userName: actor.name }),
          auditTag: CHEAT_AUDIT_TAG,
        }
      : e,
  );

  const linkage = extra.inventoryLinkage;
  const last = linkage?.lastTransition;
  const autoShip =
    last?.via.kind === 'completion-auto-ship' && toMs(last.at) >= marker.at ? last : undefined;
  const inventoryLinkage =
    linkage && autoShip && actor
      ? { ...linkage, lastTransition: { ...autoShip, by: actor } }
      : linkage;

  const shippedAt = autoShip ? toMs(autoShip.at) : NaN;
  const provable = linkage?.state === 'shipped' && shippedAt >= V2_FROM_MS;

  return {
    extra: {
      ...extra,
      ...(extra.activityLog && { activityLog }),
      ...(inventoryLinkage && { inventoryLinkage }),
      cheatAutoComplete: { ...marker, historyOk: true },
    },
    ...(provable && { shippedAt }),
    shippedRows: provable ? (linkage.shippedSnapshot ?? []) : [],
  };
}

async function productHasOrderEntry(
  productId: string,
  salesOrderId: string,
  shippedAt: number,
): Promise<boolean> {
  let cursor: string | undefined;
  for (;;) {
    const page = await activityLoggerV2Connector.getByTarget({
      targetId: productId,
      clientId: resolveClientCode(),
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    for (const entry of page.activities) {
      const source = (entry.memo as { source?: { kind?: string; id?: string } }).source;
      if (
        entry.action === 'productInventory.adjust' &&
        source?.kind === 'SO' &&
        source.id === salesOrderId
      ) {
        return true;
      }
    }

    const oldest = page.activities.at(-1);
    if (!page.nextCursor || !oldest || toMs(oldest.createdAt) < shippedAt - SCAN_MARGIN_MS) {
      return false;
    }
    cursor = page.nextCursor;
  }
}

type BackfillEntry = { productId: string; memo: Record<string, unknown> };

async function findMissingDeductions(
  so: SalesOrder,
  plan: CheatHistoryRepairPlan,
  productsByCode: Map<string, Product>,
): Promise<BackfillEntry[]> {
  const { shippedAt } = plan;
  if (shippedAt == null) return [];
  const byProduct = new Map<string, BackfillEntry[]>();
  for (const row of plan.shippedRows) {
    const product = productsByCode.get(row.itemCode);
    if (!product) continue;
    const delta = -recomputeOnHand(product, row.byUnit);
    if (delta === 0) continue;
    const entries = byProduct.get(product.id) ?? [];
    entries.push({
      productId: product.id,
      memo: {
        itemCode: row.itemCode,
        locationCode: row.locationCode,
        delta,
        source: { kind: 'SO', id: so.id, label: so.orderNumber },
        backfilledAt: Date.now(),
        auditTag: CHEAT_AUDIT_TAG,
      },
    });
    byProduct.set(product.id, entries);
  }
  const missing: BackfillEntry[] = [];
  for (const [productId, entries] of byProduct) {
    if (!(await productHasOrderEntry(productId, so.id, shippedAt))) missing.push(...entries);
  }
  return missing;
}

const markerAt = (so: SalesOrder) =>
  (so.extra as SalesOrderExtra | undefined)?.cheatAutoComplete?.at ?? 0;

export async function repairNktuCheatHistory(): Promise<number> {
  if (!isActivityLoggingEnabled()) return 0;
  await ensureReconcileStoresLoaded();

  const candidates = (useSalesOrderStore.getState().items as SalesOrder[])
    .filter((so) => {
      const extra = so.extra as SalesOrderExtra | undefined;
      return (
        extra?.cheatAutoComplete != null && !extra.cheatAutoComplete.historyOk && !extra.isDeleted
      );
    })
    .sort((a, b) => markerAt(b) - markerAt(a));
  if (candidates.length === 0) return 0;

  const drs = useDeliveryRequestStore.getState().items as DeliveryRequest[];
  const productsByCode = indexProductsByCode(useProductStore.getState().items as Product[]);
  const employeeName = (id: string) => useEmployeeStore.getState().getById(id)?.name;

  let repaired = 0;
  for (const so of candidates) {
    const marker = (so.extra as SalesOrderExtra).cheatAutoComplete!;
    const soDrs = drs.filter(
      (d) => d.salesOrderId === so.id && marker.drNumbers.includes(d.requestNumber),
    );
    const plan = planCheatHistoryRepair(so, pickDeliveryActor(soDrs, employeeName));
    if (!plan) continue;

    let backfill: BackfillEntry[];
    try {
      backfill = await findMissingDeductions(so, plan, productsByCode);
    } catch {
      continue; // history unreadable: missing can't be told from present — next open retries
    }

    try {
      await useSalesOrderStore.getState().updateSafely({
        id: so.id,
        version: so.version,
        patch: { extra: plan.extra },
      });
    } catch {
      continue; // another tab claimed it, or the order moved — next open re-reads
    }
    for (const entry of backfill) {
      logActivity('productInventory.adjust', entry.productId, entry.memo, plan.shippedAt);
    }
    repaired++;
    if (repaired % PROGRESS_EVERY === 0) {
      console.info('[nktu] cheat history repair', { repaired, of: candidates.length });
    }
  }
  return repaired;
}
