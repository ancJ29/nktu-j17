import { indexInventoryByProduct } from '@/utils/inventoryCommitment';
import { getCurrentEmployeeStamp } from '@/hooks/useCurrentEmployee';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useProductStore } from '@/stores/useProductStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { deliveryRequestStatusOptions } from '@/pages/delivery-requests/useDeliveryRequestStatusOptions';
import {
  getAllowedTransitions,
  getAutoCompletionTargetValue,
  runTransition as runSoTransition,
} from '@/pages/sales-orders/transitionEngine';
import { ensureReconcileStoresLoaded } from '@/pages/sales-orders/reconcileFromDeliveries';
import {
  buildLinkageSnapshotFromReserveOps,
  executeReservationPlan,
  planReservation,
  rollbackAppliedOps,
} from '@/utils/inventoryReservation';
import { buildReservedLinkage } from '@/utils/inventoryLinkage';
import type {
  DeliveryRequest,
  Product,
  ProductInventoryRow,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';

type CheatOutcome = 'completed' | 'already-complete' | 'cancelled' | 'not-found' | 'failed';

type CheatDetail = {
  salesOrderId: string;
  orderNumber?: string;
  drNumbers: string[];
  outcome: CheatOutcome;

  reason?: string;
};

export type CheatReconcileSummary = {
  todayCompletedDrs: number;
  candidateSos: number;
  completed: number;
  skipped: number;
  failed: number;
  details: CheatDetail[];
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function reserveForCompletionIfNeeded(inputs: {
  so: SalesOrder;
  targetStatus: string;
  actor: { id: string; name: string } | undefined;
  productsByCode: Map<string, Product>;
  inventoryByProduct: Map<string, ProductInventoryRow[]>;
}): Promise<
  | { ok: true; order: SalesOrder; inventoryByProduct: Map<string, ProductInventoryRow[]> }
  | { ok: false }
> {
  const { so, targetStatus, actor, productsByCode } = inputs;
  let inventoryByProduct = inputs.inventoryByProduct;
  const extra = (so.extra ?? {}) as SalesOrderExtra;
  const linkage = extra.inventoryLinkage;
  const hasLiveReservation =
    linkage?.state === 'reserved' && (linkage.reservedSnapshot?.length ?? 0) > 0;
  const alreadyShipped = linkage?.state === 'shipped';
  const fromStatus = extra.status ?? '';

  if (
    hasLiveReservation ||
    alreadyShipped ||
    !getAllowedTransitions(fromStatus).includes(targetStatus)
  ) {
    return { ok: true, order: so, inventoryByProduct };
  }

  const plan = planReservation({ action: 'reserve', so, productsByCode, inventoryByProduct });
  if (!plan.ok || plan.plan.ops.length === 0) {
    return { ok: true, order: so, inventoryByProduct };
  }

  const exec = await executeReservationPlan(plan.plan.ops);
  if (!exec.ok) {
    useProductInventoryStore.getState().forceRefresh();
    return { ok: false };
  }

  const reservedLinkage = buildReservedLinkage(
    buildLinkageSnapshotFromReserveOps(plan.plan.ops),
    Date.now(),
    actor,
    { kind: 'capability', capabilityId: 'reservesStock', statusValue: fromStatus },
  );

  try {
    const patched = (await useSalesOrderStore.getState().updateSafely({
      id: so.id,
      version: so.version,
      patch: { extra: { ...extra, inventoryLinkage: reservedLinkage } },
    })) as SalesOrder;

    inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);
    return { ok: true, order: patched, inventoryByProduct };
  } catch {
    await rollbackAppliedOps(exec.applied);
    useProductInventoryStore.getState().forceRefresh();
    return { ok: false };
  }
}

let inFlight: Promise<CheatReconcileSummary> | null = null;

export function reconcileNktuCompletedDeliveries(): Promise<CheatReconcileSummary> {
  if (inFlight) return inFlight;
  inFlight = runReconcile().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runReconcile(): Promise<CheatReconcileSummary> {
  const summary: CheatReconcileSummary = {
    todayCompletedDrs: 0,
    candidateSos: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  const targetStatus = getAutoCompletionTargetValue();
  if (!targetStatus) return summary;

  await ensureReconcileStoresLoaded();

  const now = new Date();
  const resolveDrStatus = deliveryRequestStatusOptions.resolveStatus;

  const drs = useDeliveryRequestStore.getState().items as DeliveryRequest[];
  const todaysCompletedDrs = drs.filter((d) => {
    const extra = d.extra ?? {};
    if (extra.isDeleted) return false;
    if (d.direction === 'inbound') return false;
    if (extra.isAdditional) return false;
    if (!d.salesOrderId) return false;
    if (resolveDrStatus(extra.status).stage !== 'COMPLETED') return false;
    const ts = extra.deliveryTimestamp;
    if (ts == null) return false;
    const when = new Date(ts as string | number);
    return !Number.isNaN(when.getTime()) && isSameLocalDay(when, now);
  });

  summary.todayCompletedDrs = todaysCompletedDrs.length;
  if (todaysCompletedDrs.length === 0) return summary;

  const drNumbersBySo = new Map<string, string[]>();
  for (const d of todaysCompletedDrs) {
    const soId = d.salesOrderId!;
    const list = drNumbersBySo.get(soId) ?? [];
    list.push(d.requestNumber);
    drNumbersBySo.set(soId, list);
  }
  summary.candidateSos = drNumbersBySo.size;

  const soStore = useSalesOrderStore.getState();
  const stamp = getCurrentEmployeeStamp();
  const actor = stamp.userId
    ? { id: stamp.userId, name: stamp.userName ?? stamp.userId }
    : undefined;
  const productsByCode = new Map<string, Product>();
  for (const p of useProductStore.getState().items as Product[]) productsByCode.set(p.code, p);
  const inventoryByProduct = indexInventoryByProduct(useProductInventoryStore.getState().items);

  for (const [soId, drNumbers] of drNumbersBySo) {
    const detail: CheatDetail = { salesOrderId: soId, drNumbers, outcome: 'failed' };
    const so = soStore.getById(soId) as SalesOrder | undefined;
    if (!so) {
      detail.outcome = 'not-found';
      summary.skipped++;
      summary.details.push(detail);
      continue;
    }
    detail.orderNumber = so.orderNumber;
    const soExtra = (so.extra ?? {}) as SalesOrderExtra;
    if (soExtra.cancellation != null) {
      detail.outcome = 'cancelled';
      summary.skipped++;
      summary.details.push(detail);
      continue;
    }
    if (so.isClosed || soExtra.status === targetStatus) {
      detail.outcome = 'already-complete';
      summary.skipped++;
      summary.details.push(detail);
      continue;
    }

    const prep = await reserveForCompletionIfNeeded({
      so,
      targetStatus,
      actor,
      productsByCode,
      inventoryByProduct,
    });
    if (!prep.ok) {
      detail.outcome = 'failed';
      detail.reason = 'reserve-repair-failed';
      summary.failed++;
      summary.details.push(detail);
      continue;
    }

    const prepExtra = (prep.order.extra ?? {}) as SalesOrderExtra;
    const orderToComplete: SalesOrder = {
      ...prep.order,
      extra: {
        ...prepExtra,
        cheatAutoComplete: { at: now.getTime(), drNumbers },
      },
    };

    const result = await runSoTransition({
      order: orderToComplete,
      toStatusValue: targetStatus,
      actor,
      productsByCode,
      inventoryByProduct: prep.inventoryByProduct,
    });

    if (!result.ok) {
      detail.outcome = 'failed';
      detail.reason = result.failure.kind;
      summary.failed++;
      summary.details.push(detail);
      continue;
    }

    detail.outcome = 'completed';
    summary.completed++;
    summary.details.push(detail);
  }

  return summary;
}
