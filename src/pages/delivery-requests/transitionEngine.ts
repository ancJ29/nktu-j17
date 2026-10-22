import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import {
  getDeliveryRequestStatusOptions,
  getDeliveryRequestStatusTransitions,
} from '@/utils/permission';
import type {
  DeliveryRequest,
  DeliveryRequestActivityEntry,
  DeliveryRequestDeliveredItem,
  DeliveryRequestExtra,
} from '@/types';
import type { CMngtDeliveryRequestStatusOption } from '@credo/kits/types';
import { CAPABILITY_REGISTRY } from './capabilities/registry';
import type { Stage, StatusCapabilityBinding } from './capabilities/types';

export type TransitionFailure =
  | { kind: 'unknown-from-status'; status: string }
  | { kind: 'unknown-to-status'; status: string }
  | { kind: 'transition-not-allowed'; from: string; to: string }
  | { kind: 'photos-required' }
  | { kind: 'patch-conflict' }
  | { kind: 'patch-error'; error: Error };

export type DrFollowUp =
  { kind: 'advance-so-on-dispatch' } | { kind: 'advance-so-on-full-delivery' };

export type TransitionResult =
  | { ok: true; updated: DeliveryRequest; followUps: readonly DrFollowUp[] }
  | { ok: false; failure: TransitionFailure };

export type TransitionInputs = {
  request: DeliveryRequest;
  toStatusValue: string;
  actor: { id: string; name: string } | undefined;
  note?: string;

  deliveredItems?: DeliveryRequestDeliveredItem[];

  hasLocalProof?: boolean;
};

export async function runTransition(inputs: TransitionInputs): Promise<TransitionResult> {
  const { request, toStatusValue, actor, note, deliveredItems, hasLocalProof } = inputs;
  const fromStatusValue = (request.extra as DeliveryRequestExtra | undefined)?.status ?? '';

  const statusByValue = new Map<string, CMngtDeliveryRequestStatusOption>();
  for (const opt of getDeliveryRequestStatusOptions()) statusByValue.set(opt.value, opt);

  const fromStatus = statusByValue.get(fromStatusValue);
  const toStatus = statusByValue.get(toStatusValue);
  if (!fromStatus) {
    return { ok: false, failure: { kind: 'unknown-from-status', status: fromStatusValue } };
  }
  if (!toStatus) {
    return { ok: false, failure: { kind: 'unknown-to-status', status: toStatusValue } };
  }

  const allowed = getDeliveryRequestStatusTransitions()[fromStatusValue] ?? [];
  if (!allowed.includes(toStatusValue)) {
    return {
      ok: false,
      failure: { kind: 'transition-not-allowed', from: fromStatusValue, to: toStatusValue },
    };
  }

  if (toStatus.stage === 'COMPLETED') {
    const photos = (request.extra as DeliveryRequestExtra | undefined)?.photos ?? [];
    const hasPhoto = photos.some((p) => !p.isDeleted) || hasLocalProof === true;
    if (!hasPhoto) {
      return { ok: false, failure: { kind: 'photos-required' } };
    }
  }

  const currentExtra = (request.extra ?? {}) as DeliveryRequestExtra;
  const log: DeliveryRequestActivityEntry[] = currentExtra.activityLog ?? [];
  const transitionAt = new Date().toISOString();
  const newEntry: DeliveryRequestActivityEntry = {
    timestamp: transitionAt,
    action: 'status_change',
    fromStatus: fromStatusValue,
    toStatus: toStatusValue,
    ...(actor && { userId: actor.id, userName: actor.name }),
    ...(note ? { note } : {}),
  };

  const isClosed = deriveIsClosedFromStage(toStatus.stage as Stage);
  const nextExtra: DeliveryRequestExtra = {
    ...currentExtra,
    status: toStatusValue,
    activityLog: [...log, newEntry],
    ...(isClosed && deliveredItems && { deliveredItems }),
    ...(isClosed && { deliveryTimestamp: transitionAt }),
  };

  try {
    const updated = await useDeliveryRequestStore.getState().updateSafely({
      id: request.id,
      version: request.version,
      patch: {
        isClosed,
        extra: nextExtra,
      },
    });

    const followUps: DrFollowUp[] = [];
    if (request.direction !== 'inbound') {
      const toCapIdSet = new Set((toStatus.capabilities ?? []).map((b) => b.id));
      if (toCapIdSet.has('triggersAutoShipping')) {
        followUps.push({ kind: 'advance-so-on-dispatch' });
      }
      if (isClosed) {
        followUps.push({ kind: 'advance-so-on-full-delivery' });
      }
    }

    return { ok: true, updated: updated as DeliveryRequest, followUps };
  } catch (err) {
    if (err instanceof EntityConflictError) {
      return { ok: false, failure: { kind: 'patch-conflict' } };
    }
    return {
      ok: false,
      failure: {
        kind: 'patch-error',
        error: err instanceof Error ? err : new Error(String(err)),
      },
    };
  }
}

export function deriveIsClosedFromStage(stage: Stage): boolean {
  return stage === 'COMPLETED' || stage === 'EXCEPTIONAL';
}

export function getAllowedTransitions(currentStatus: string): string[] {
  return getDeliveryRequestStatusTransitions()[currentStatus] ?? [];
}

export function getStatusFlowOrder(): string[] {
  const STAGE_ORDER: Record<Stage, number> = {
    NEW: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    EXCEPTIONAL: 3,
  };
  const opts = [...getDeliveryRequestStatusOptions()];
  opts.sort((a, b) => STAGE_ORDER[a.stage as Stage] - STAGE_ORDER[b.stage as Stage]);
  return opts.map((o) => o.value);
}

export function getInitialStatusValue(): string | undefined {
  for (const opt of getDeliveryRequestStatusOptions()) {
    if ((opt.capabilities ?? []).some((b) => b.id === 'isInitialStatus')) return opt.value;
  }
  return undefined;
}

export function getInitialStatusValueForCreate(opts: {
  soStatusCarriesReleasesDR?: boolean;
}): string | undefined {
  const defaultInitial = getInitialStatusValue();
  if (!opts.soStatusCarriesReleasesDR) return defaultInitial;
  const releaseTarget = getReleaseTargetValue();
  return releaseTarget ?? defaultInitial;
}

export function getReleaseTargetValue(): string | undefined {
  for (const opt of getDeliveryRequestStatusOptions()) {
    if ((opt.capabilities ?? []).some((b) => b.id === 'isReleaseTarget')) return opt.value;
  }
  return undefined;
}

export { CAPABILITY_REGISTRY };
export type { StatusCapabilityBinding };
