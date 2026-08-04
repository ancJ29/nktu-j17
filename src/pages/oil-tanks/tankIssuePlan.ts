import type { OperationLog, RefuelLogExtra } from '@/types';

export type TankBinding = { id: string; code: string };

export type TankMirrorPlan =
  | { kind: 'none' }
  /** Same tank before and after: reconcile the existing mirror in place. */
  | { kind: 'reconcile'; tank: TankBinding }
  /** No longer tank-sourced (switched to external, or the entry was deleted). */
  | { kind: 'detach'; from: TankBinding }
  /** Newly tank-sourced. */
  | { kind: 'attach'; to: TankBinding }
  /** Moved between tanks — unwind the old side first, then create on the new. */
  | { kind: 'move'; from: TankBinding; to: TankBinding };

export function planTankMirror(
  before: TankBinding | undefined,
  after: TankBinding | undefined,
): TankMirrorPlan {
  if (!before && !after) return { kind: 'none' };
  if (before && after) {
    return before.id === after.id
      ? { kind: 'reconcile', tank: after }
      : { kind: 'move', from: before, to: after };
  }
  return before ? { kind: 'detach', from: before } : { kind: 'attach', to: after! };
}

export function tankBindingOf(log: OperationLog | null): TankBinding | undefined {
  if (!log) return undefined;
  const extra = log.extra as RefuelLogExtra | undefined;

  if (extra?.fuelSource !== 'tank') return undefined;
  const id = typeof extra.oilTankId === 'string' ? extra.oilTankId.trim() : '';
  if (!id) return undefined;
  return { id, code: typeof extra.oilTankCode === 'string' ? extra.oilTankCode : '' };
}
