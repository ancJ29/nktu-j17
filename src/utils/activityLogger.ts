import { activityLoggerConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { resolveClientCode } from '@/config/client-code';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { isActivityLoggingEnabled } from '@/utils/permission';
import { logger } from '@credo/base-ui/utils';

type PendingEntry = {
  actorId: string;
  action: string;
  targetId?: string;
  memo?: Record<string, unknown>;
};

let pending: PendingEntry[] = [];
let flushScheduled = false;

function resolveActorId(): string | null {
  return getCurrentEmployeeId() ?? useAuthStore.getState().user?.email ?? null;
}

function flush() {
  flushScheduled = false;
  if (pending.length === 0) return;
  const batch = pending;
  pending = [];

  const clientId = resolveClientCode();
  const activities = batch.map((entry) => ({ ...entry, clientId }));
  activityLoggerConnector.logActivities({ activities }).catch((err) => {
    logger.warn('[activityLogger] log failed', { count: batch.length, err });
  });
}

export function logActivity(action: string, targetId?: string, memo?: Record<string, unknown>) {
  if (!isActivityLoggingEnabled()) return;

  const actorId = resolveActorId();
  if (!actorId) {
    logger.debug('[activityLogger] no actor resolved, skipping', { action });
    return;
  }

  pending.push({
    actorId,
    action,
    ...(targetId ? { targetId } : {}),
    ...(memo ? { memo } : {}),
  });

  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);
  }
}
