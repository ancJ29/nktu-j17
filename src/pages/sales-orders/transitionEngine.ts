

import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import {
  buildLinkageSnapshotFromReserveOps,
  executeReservationPlan,
  planReleaseFromLinkage,
  planShipFromLinkage,
  rollbackAppliedOps,
  type AppliedOp,
  type PlanFailure,
  type PlannedOp,
} from '@/utils/inventoryReservation';
import { emitInventoryActivityForApplied } from '@/utils/inventoryActivityEmit';
import type {
  InventoryLinkage,
  Product,
  ProductInventoryRow,
  SalesOrder,
  SalesOrderActivityEntry,
  SalesOrderExtra,
} from '@/types';
import {
  buildReleasedLinkage,
  buildReservedLinkage,
  buildShippedLinkage,
} from '@/utils/inventoryLinkage';
import {
  getSalesOrderStatusOptions,
  getSalesOrderStatusTransitions,
  isSkipInitialStageAllowed,
} from '@/utils/permission';
import { CAPABILITY_REGISTRY, getCapability } from './capabilities/registry';
import { getHandler } from './capabilities/handlers';
import type { CapabilityId, Stage, StatusCapabilityBinding } from './capabilities/types';
import type { CMngtSalesOrderStatusOption } from '@credo/kits/types';

export type TransitionFailure =
  | { kind: 'unknown-from-status'; status: string }
  | { kind: 'unknown-to-status'; status: string }
  | { kind: 'transition-not-allowed'; from: string; to: string }
  | { kind: 'requires-missing'; from: string; to: string; capability: CapabilityId }
  | { kind: 'plan-failure'; failures: PlanFailure[] }
  | { kind: 'execution-failure'; error: Error; orphanedRowIds: readonly string[] }
  | { kind: 'patch-conflict'; orphanedRowIds?: readonly string[] }
  | { kind: 'patch-error'; error: Error; orphanedRowIds?: readonly string[] };

export type SoFollowUp = { kind: 'release-linked-drs' };

export type TransitionResult =
  | { ok: true; updated: SalesOrder; followUps: readonly SoFollowUp[] }
  | { ok: false; failure: TransitionFailure };

export type TransitionInputs = {
  order: SalesOrder;
  toStatusValue: string;
  actor: { id: string; name: string } | undefined;
  note?: string;
  productsByCode: Map<string, Product>;
  inventoryByProduct: Map<string, ProductInventoryRow[]>;
};

export async function runTransition(inputs: TransitionInputs): Promise<TransitionResult> {
  const { order, toStatusValue, actor, note } = inputs;
  const fromStatusValue = (order.extra as SalesOrderExtra | undefined)?.status ?? '';

  const statusByValue = new Map<string, CMngtSalesOrderStatusOption>();
  for (const opt of getSalesOrderStatusOptions()) statusByValue.set(opt.value, opt);

  const fromStatus = statusByValue.get(fromStatusValue);
  const toStatus = statusByValue.get(toStatusValue);
  if (!fromStatus) {
    return { ok: false, failure: { kind: 'unknown-from-status', status: fromStatusValue } };
  }
  if (!toStatus) {
    return { ok: false, failure: { kind: 'unknown-to-status', status: toStatusValue } };
  }

  const allowed = getSalesOrderStatusTransitions()[fromStatusValue] ?? [];
  if (!allowed.includes(toStatusValue)) {
    return {
      ok: false,
      failure: { kind: 'transition-not-allowed', from: fromStatusValue, to: toStatusValue },
    };
  }

  

  const fromCapIds = new Set((fromStatus.capabilities ?? []).map((b) => b.id));
  const toBindings = toStatus.capabilities ?? [];

  
  const enteringBindings = toBindings.filter((b) => !fromCapIds.has(b.id));

  
  const supersededIds = new Set<CapabilityId>();
  for (const b of enteringBindings) {
    const def = getCapability(b.id);
    for (const id of def?.supersedes ?? []) supersededIds.add(id);
  }
  const enteringAfterSupersedes = enteringBindings.filter((b) => !supersededIds.has(b.id));

  
  
  
  
  
  
  
  
  
  
  
  
  const preTransitionExtra = (order.extra ?? {}) as SalesOrderExtra;
  const preLinkage = preTransitionExtra.inventoryLinkage;
  const handlerIdToAlreadyDoneState: Record<string, 'reserved' | 'shipped'> = {
    reserve: 'reserved',
    ship: 'shipped',
  };
  const firingBindings = enteringAfterSupersedes.filter((b) => {
    const def = getCapability(b.id);
    if (!def?.onEnter) return true;
    const alreadyDone = handlerIdToAlreadyDoneState[def.onEnter];
    if (!alreadyDone) return true;
    const isRedundant =
      preLinkage?.state === alreadyDone &&
      (alreadyDone !== 'reserved' || (preLinkage?.reservedSnapshot?.length ?? 0) > 0);
    return !isRedundant;
  });

  
  
  for (const b of firingBindings) {
    const def = getCapability(b.id);
    for (const reqId of def?.requires ?? []) {
      if (!orderHasCapabilityInHistory(order, reqId, statusByValue)) {
        return {
          ok: false,
          failure: {
            kind: 'requires-missing',
            from: fromStatusValue,
            to: toStatusValue,
            capability: reqId,
          },
        };
      }
    }
  }

  

  const sortedFiring = [...firingBindings].sort((a, b) => {
    const pa = getCapability(a.id)?.priority ?? 100;
    const pb = getCapability(b.id)?.priority ?? 100;
    return pa - pb;
  });

  const allOps: PlannedOp[] = [];
  const allFailures: PlanFailure[] = [];

  const firingHandlerIds = new Set<string>();
  for (const binding of sortedFiring) {
    const def = getCapability(binding.id);
    if (!def?.onEnter) continue;
    firingHandlerIds.add(def.onEnter);
    const handler = getHandler(def.onEnter);
    if (!handler) continue;
    const result = handler.plan({
      order,
      binding,
      actor,
      productsByCode: inputs.productsByCode,
      inventoryByProduct: inputs.inventoryByProduct,
    });
    if (!result.ok) {
      allFailures.push(...result.failures);
    } else {
      allOps.push(...result.inventoryOps);
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  let autoShipped = false;
  if (
    !firingHandlerIds.has('ship') &&
    toStatus.stage === 'COMPLETED' &&
    preLinkage?.state === 'reserved' &&
    preLinkage.reservedSnapshot != null &&
    preLinkage.reservedSnapshot.length > 0
  ) {
    const shipResult = planShipFromLinkage({
      snapshot: preLinkage.reservedSnapshot,
      so: order,
      productsByCode: inputs.productsByCode,
      inventoryByProduct: inputs.inventoryByProduct,
    });
    if (!shipResult.ok) {
      allFailures.push(...shipResult.failures);
    } else if (shipResult.plan.ops.length > 0) {
      allOps.push(...shipResult.plan.ops);
      firingHandlerIds.add('ship');
      autoShipped = true;
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  let autoReleased = false;
  if (
    !firingHandlerIds.has('reserve') &&
    !firingHandlerIds.has('ship') &&
    toStatus.stage === 'DRAFT' &&
    preLinkage?.state === 'reserved' &&
    preLinkage.reservedSnapshot != null &&
    preLinkage.reservedSnapshot.length > 0
  ) {
    const releaseResult = planReleaseFromLinkage({
      snapshot: preLinkage.reservedSnapshot,
      so: order,
      productsByCode: inputs.productsByCode,
      inventoryByProduct: inputs.inventoryByProduct,
    });
    if (!releaseResult.ok) {
      allFailures.push(...releaseResult.failures);
    } else {
      
      
      
      autoReleased = true;
      if (releaseResult.plan.ops.length > 0) {
        allOps.push(...releaseResult.plan.ops);
        firingHandlerIds.add('release');
      }
    }
  }

  if (allFailures.length > 0) {
    return { ok: false, failure: { kind: 'plan-failure', failures: allFailures } };
  }

  

  let appliedOps: readonly AppliedOp[] = [];
  if (allOps.length > 0) {
    const exec = await executeReservationPlan(allOps);
    if (!exec.ok) {
      
      useProductInventoryStore.getState().forceRefresh();
      return {
        ok: false,
        failure: {
          kind: 'execution-failure',
          error: exec.error,
          orphanedRowIds: exec.orphanedRowIds,
        },
      };
    }
    appliedOps = exec.applied;
  }

  

  
  
  
  const log: SalesOrderActivityEntry[] = preTransitionExtra.activityLog ?? [];
  const transitionAt = Date.now();

  
  
  
  
  
  const enteringReadyFromDraft = fromStatus.stage === 'DRAFT' && toStatus.stage !== 'DRAFT';
  
  
  
  
  
  
  
  const newEntry: SalesOrderActivityEntry = {
    timestamp: transitionAt,
    action: 'status_change',
    fromStatus: fromStatusValue,
    toStatus: toStatusValue,
    ...(actor && { userId: actor.id, userName: actor.name }),
    ...(note ? { note } : {}),
  };

  
  
  
  
  
  
  let nextLinkage: InventoryLinkage | undefined;
  if (autoReleased) {
    
    
    
    nextLinkage = buildReleasedLinkage(transitionAt, actor, {
      kind: 'revert-to-draft',
      statusValue: toStatusValue,
    });
  } else if (allOps.length > 0 && firingHandlerIds.has('reserve')) {
    const reservingBinding = sortedFiring.find((b) => getCapability(b.id)?.onEnter === 'reserve');
    nextLinkage = buildReservedLinkage(
      buildLinkageSnapshotFromReserveOps(allOps),
      transitionAt,
      actor,
      {
        kind: 'capability',
        capabilityId: reservingBinding?.id ?? 'reservesStock',
        statusValue: toStatusValue,
      },
    );
  } else if (allOps.length > 0 && firingHandlerIds.has('ship')) {
    const shippingBinding = sortedFiring.find((b) => getCapability(b.id)?.onEnter === 'ship');
    nextLinkage = buildShippedLinkage(
      transitionAt,
      actor,
      autoShipped
        ? { kind: 'completion-auto-ship', statusValue: toStatusValue }
        : {
            kind: 'capability',
            capabilityId: shippingBinding?.id ?? 'shipsStock',
            statusValue: toStatusValue,
          },
    );
  }

  try {
    const updated = await useSalesOrderStore.getState().updateSafely({
      id: order.id,
      version: order.version,
      patch: {
        isClosed: deriveIsClosedFromStage(toStatus.stage as Stage),
        extra: {
          ...preTransitionExtra,
          status: toStatusValue,
          activityLog: [...log, newEntry],
          ...(enteringReadyFromDraft ? { readyAt: transitionAt } : {}),
          ...(nextLinkage ? { inventoryLinkage: nextLinkage } : {}),
        },
      },
    });
    if (allOps.length > 0) useProductInventoryStore.getState().forceRefresh();

    
    
    
    
    
    if (appliedOps.length > 0) {
      emitInventoryActivityForApplied(appliedOps, {
        kind: 'SO',
        id: order.id,
        label: order.orderNumber,
      });
    }

    
    
    
    
    const followUps: SoFollowUp[] = [];
    const toCapIdSet = new Set((toStatus.capabilities ?? []).map((b) => b.id));
    if (toCapIdSet.has('releasesDR')) {
      followUps.push({ kind: 'release-linked-drs' });
    }

    return { ok: true, updated: updated as SalesOrder, followUps };
  } catch (err) {
    
    
    
    let orphanedRowIds: readonly string[] | undefined;
    if (appliedOps.length > 0) {
      const rb = await rollbackAppliedOps(appliedOps);
      useProductInventoryStore.getState().forceRefresh();
      if (!rb.rollbackOk) orphanedRowIds = rb.orphanedRowIds;
    }
    if (err instanceof EntityConflictError) {
      return {
        ok: false,
        failure: { kind: 'patch-conflict', ...(orphanedRowIds && { orphanedRowIds }) },
      };
    }
    return {
      ok: false,
      failure: {
        kind: 'patch-error',
        error: err instanceof Error ? err : new Error(String(err)),
        ...(orphanedRowIds && { orphanedRowIds }),
      },
    };
  }
}

export function deriveIsClosedFromStage(stage: Stage): boolean {
  return stage === 'COMPLETED' || stage === 'EXCEPTIONAL';
}

function orderHasCapabilityInHistory(
  order: SalesOrder,
  capId: CapabilityId,
  statusByValue: Map<string, CMngtSalesOrderStatusOption>,
): boolean {
  const log = (order.extra as SalesOrderExtra | undefined)?.activityLog ?? [];
  const visitedStatuses = new Set<string>();
  
  const currentStatusValue = (order.extra as SalesOrderExtra | undefined)?.status;
  if (currentStatusValue) visitedStatuses.add(currentStatusValue);
  for (const entry of log) {
    if (entry.toStatus) visitedStatuses.add(entry.toStatus);
  }
  for (const value of visitedStatuses) {
    const opt = statusByValue.get(value);
    if (!opt) continue;
    if ((opt.capabilities ?? []).some((b) => b.id === capId)) return true;
  }
  return false;
}

export function getAllowedTransitions(currentStatus: string): string[] {
  return getSalesOrderStatusTransitions()[currentStatus] ?? [];
}

export function getStatusFlowOrder(): string[] {
  const STAGE_ORDER: Record<Stage, number> = {
    DRAFT: 0,
    NEW: 1,
    IN_PROGRESS: 2,
    COMPLETED: 3,
    EXCEPTIONAL: 4,
  };
  const opts = [...getSalesOrderStatusOptions()];
  opts.sort((a, b) => STAGE_ORDER[a.stage as Stage] - STAGE_ORDER[b.stage as Stage]);
  return opts.map((o) => o.value);
}

export function getStatusFlowIndex(status: string): number {
  return getStatusFlowOrder().indexOf(status);
}

export function getSalesOrderStatusStage(statusValue: string): Stage | undefined {
  for (const opt of getSalesOrderStatusOptions()) {
    if (opt.value === statusValue) return opt.stage as Stage;
  }
  return undefined;
}

export function isReadyToProcessStatus(statusValue: string): boolean {
  const stage = getSalesOrderStatusStage(statusValue);
  return stage != null && stage !== 'DRAFT';
}

export function getInitialStatusValue(): string | undefined {
  for (const opt of getSalesOrderStatusOptions()) {
    if ((opt.capabilities ?? []).some((b) => b.id === 'isInitialStatus')) return opt.value;
  }
  return undefined;
}

export function getCreateSkipInitialTargetValue(): string | undefined {
  if (!isSkipInitialStageAllowed()) return undefined;
  const initial = getInitialStatusValue();
  if (!initial) return undefined;
  const tos = getSalesOrderStatusTransitions()[initial] ?? [];
  return tos.length === 1 ? tos[0] : undefined;
}

export function getAutoCompletionTargetValue(): string | undefined {
  for (const opt of getSalesOrderStatusOptions()) {
    if ((opt.capabilities ?? []).some((b) => b.id === 'isAutoCompletionTarget')) return opt.value;
  }
  return undefined;
}

export function getAutoShippingTargetValue(): string | undefined {
  for (const opt of getSalesOrderStatusOptions()) {
    if ((opt.capabilities ?? []).some((b) => b.id === 'isAutoShippingTarget')) return opt.value;
  }
  return undefined;
}

export function getCancellationTargetStatusValue(): string | undefined {
  for (const opt of getSalesOrderStatusOptions()) {
    if ((opt.capabilities ?? []).some((b) => b.id === 'isCancellationTarget')) return opt.value;
  }
  return undefined;
}

export function statusHasCapability(statusValue: string, capId: CapabilityId): boolean {
  for (const opt of getSalesOrderStatusOptions()) {
    if (opt.value !== statusValue) continue;
    return (opt.capabilities ?? []).some((b) => b.id === capId);
  }
  return false;
}

export function shouldLockLineEdits(statusValue: string): boolean {
  for (const opt of getSalesOrderStatusOptions()) {
    if (opt.value !== statusValue) continue;
    if ((opt.capabilities ?? []).some((b) => b.id === 'lockLineEdits')) return true;
    const stage = opt.stage as Stage | undefined;
    return stage === 'COMPLETED' || stage === 'EXCEPTIONAL';
  }
  return false;
}

export function readCapabilityConfig(
  statusValue: string,
  capId: CapabilityId,
): unknown | undefined {
  for (const opt of getSalesOrderStatusOptions()) {
    if (opt.value !== statusValue) continue;
    const b = (opt.capabilities ?? []).find((x) => x.id === capId);
    return b?.config;
  }
  return undefined;
}

export { CAPABILITY_REGISTRY };
export type { StatusCapabilityBinding };
