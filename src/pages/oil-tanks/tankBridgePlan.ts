import type { OilTankIssueLogExtra, OperationLog, RefuelLogExtra } from '@/types';

export type MirrorBinding = { id: string; code: string };

export type MirrorPlan =
  | { kind: 'none' }
  /** Same counterpart before and after: reconcile the existing mirror in place. */
  | { kind: 'reconcile'; target: MirrorBinding }
  /** No longer bound (switched away, or the entry was deleted). */
  | { kind: 'detach'; from: MirrorBinding }
  /** Newly bound. */
  | { kind: 'attach'; to: MirrorBinding }
  /** Moved between counterparts — unwind the old side first, then create on the new. */
  | { kind: 'move'; from: MirrorBinding; to: MirrorBinding };

export function planMirror(
  before: MirrorBinding | undefined,
  after: MirrorBinding | undefined,
): MirrorPlan {
  if (!before && !after) return { kind: 'none' };
  if (before && after) {
    return before.id === after.id
      ? { kind: 'reconcile', target: after }
      : { kind: 'move', from: before, to: after };
  }
  return before ? { kind: 'detach', from: before } : { kind: 'attach', to: after! };
}

export function planWriteEvent(
  event: { op: 'create' | 'update' | 'delete'; log: OperationLog; previous: OperationLog | null },
  bindingOf: (log: OperationLog | null) => MirrorBinding | undefined,
): MirrorPlan {
  const before = event.op === 'create' ? null : event.op === 'update' ? event.previous : event.log;
  const after = event.op === 'delete' ? null : event.log;
  return planMirror(bindingOf(before), bindingOf(after));
}

export function tankBindingOf(log: OperationLog | null): MirrorBinding | undefined {
  if (!log) return undefined;
  const extra = log.extra as RefuelLogExtra | undefined;
  if (extra?.sourceIssueLogId) return undefined;

  if (extra?.fuelSource !== 'tank') return undefined;
  const id = typeof extra.oilTankId === 'string' ? extra.oilTankId.trim() : '';
  if (!id) return undefined;
  return { id, code: typeof extra.oilTankCode === 'string' ? extra.oilTankCode : '' };
}

export function truckBindingOf(log: OperationLog | null): MirrorBinding | undefined {
  if (!log) return undefined;
  const extra = log.extra as OilTankIssueLogExtra | undefined;
  if (extra?.sourceRefuelLogId) return undefined;
  const id = typeof extra?.truckId === 'string' ? extra.truckId.trim() : '';
  if (!id || !extra) return undefined;
  return { id, code: typeof extra.truckCode === 'string' ? extra.truckCode : '' };
}
