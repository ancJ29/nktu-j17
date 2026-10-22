import { cMngtConnector } from '@credo/connectors/connector';
import { logger } from '@credo/base-ui/utils';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { isNetworkFailure } from '@/utils/networkError';
import { listPendingPhotos } from '@/utils/photoQueue';
import { runDrTransitionEffects } from './drTransitionEffects';
import { runTransition } from './transitionEngine';
import {
  bumpTransitionAttempts,
  listQueuedTransitions,
  markTransitionBlocked,
  removeQueuedTransition,
} from './transitionQueue';
import type { TFunction } from 'i18next';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';

export type TransitionFlushResult = {
  applied: number;
  failed: number;
  blocked: number;

  updated: DeliveryRequest[];
};

const EMPTY: TransitionFlushResult = { applied: 0, failed: 0, blocked: 0, updated: [] };

let inFlight: Promise<TransitionFlushResult> | null = null;

export function flushTransitionQueue(t: TFunction, drId?: string): Promise<TransitionFlushResult> {
  if (inFlight) return inFlight;
  inFlight = runFlush(t, drId).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runFlush(t: TFunction, drId?: string): Promise<TransitionFlushResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return EMPTY;

  const all = await listQueuedTransitions();
  const queued = drId ? all.filter((entry) => entry.id === drId) : all;

  const actionable = queued.filter((entry) => !entry.blocked);
  if (!actionable.length) return EMPTY;

  const result: TransitionFlushResult = { applied: 0, failed: 0, blocked: 0, updated: [] };

  for (const entry of actionable) {
    const request = await loadDeliveryRequest(entry.id);
    if (!request) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
      await removeQueuedTransition(entry.id);
      continue;
    }

    const currentStatus = (request.extra as DeliveryRequestExtra | undefined)?.status;
    if (currentStatus === entry.toStatusValue) {
      await removeQueuedTransition(entry.id);
      result.applied += 1;
      result.updated.push(request);
      continue;
    }

    try {
      const proof = await listPendingPhotos({ kind: 'delivery-request', id: entry.id });

      const outcome = await runTransition({
        request,
        toStatusValue: entry.toStatusValue,
        actor: entry.actor,
        ...(entry.note && { note: entry.note }),
        ...(entry.deliveredItems && { deliveredItems: entry.deliveredItems }),
        hasLocalProof: proof.length > 0,
      });

      if (outcome.ok) {
        const settled = await runDrTransitionEffects({
          updated: outcome.updated,
          priorStatus: currentStatus ?? '',
          toStatusValue: entry.toStatusValue,
          ...(entry.note && { note: entry.note }),
          actor: entry.actor,
          followUps: outcome.followUps,
          t,
        });
        await removeQueuedTransition(entry.id);
        result.applied += 1;
        result.updated.push(settled);
        continue;
      }

      if (outcome.failure.kind === 'patch-conflict') {
        await bumpTransitionAttempts(entry.id);
        result.failed += 1;
        continue;
      }

      if (outcome.failure.kind === 'patch-error') {
        await bumpTransitionAttempts(entry.id);
        result.failed += 1;

        if (isNetworkFailure(outcome.failure.error)) break;
        continue;
      }

      await markTransitionBlocked(entry.id, outcome.failure.kind);
      result.blocked += 1;
    } catch (err) {
      logger.error('[DR-TRANSITION-QUEUE] replay threw', err);
      await bumpTransitionAttempts(entry.id);
      result.failed += 1;
      if (isNetworkFailure(err)) break;
    }
  }

  return result;
}

async function loadDeliveryRequest(id: string): Promise<DeliveryRequest | null> {
  try {
    const fresh = await cMngtConnector.getDeliveryRequestById<DeliveryRequestExtra>({ id });
    const record = (fresh.deliveryRequest as DeliveryRequest) ?? null;
    if (record) useDeliveryRequestStore.getState().upsertItem(record);
    return record;
  } catch {
    return null;
  }
}
