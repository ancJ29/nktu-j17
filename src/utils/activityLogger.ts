import { credoSmeConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { resolveClientCode } from '@/config/client-code';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { isActivityLoggingEnabled } from '@/utils/permission';
import { logger } from '@credo/base-ui/utils';

type PendingEntry = {
  clientId: string;
  actorId: string;
  action: string;
  targetId?: string;
  memo?: Record<string, unknown>;
  timestamp: string;
};

const FLUSH_DEBOUNCE_MS = 400;

const FLUSH_NOW_THRESHOLD = 25;

const MAX_BATCH = 200;

const MAX_PENDING = 500;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 1000;

const RESTORE_DELAY_MS = 3000;

const STORAGE_KEY = 'credo.activity.pending';

let pending: PendingEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let attempt = 0;

function persist(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (pending.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Quota / private mode: the in-memory queue still works for this session.
  }
}

function resolveActorId(): string | null {
  return getCurrentEmployeeId() ?? useAuthStore.getState().user?.email ?? null;
}

function scheduleFlush(delayMs: number): void {
  if (flushTimer != null || inFlight) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, delayMs);
}

async function flush(): Promise<void> {
  if (inFlight || pending.length === 0) return;
  const batch = pending.slice(0, MAX_BATCH);
  inFlight = true;
  try {
    await credoSmeConnector.logActivities({ activities: batch });

    pending = pending.slice(batch.length);
    attempt = 0;
    persist();
  } catch (err) {
    attempt++;
    if (attempt >= MAX_ATTEMPTS) {
      logger.warn('[activityLogger] giving up this session; queue persisted for next load', {
        count: pending.length,
        err,
      });
      attempt = 0;
      inFlight = false;
      return;
    }
    logger.warn('[activityLogger] flush failed, will retry', { count: batch.length, attempt, err });
    inFlight = false;
    scheduleFlush(RETRY_BASE_MS * 2 ** (attempt - 1));
    return;
  }
  inFlight = false;
  if (pending.length > 0) scheduleFlush(FLUSH_DEBOUNCE_MS);
}

export function logActivity(action: string, targetId?: string, memo?: Record<string, unknown>) {
  if (!isActivityLoggingEnabled()) return;

  const actorId = resolveActorId();
  if (!actorId) {
    logger.debug('[activityLogger] no actor resolved, skipping', { action });
    return;
  }

  pending.push({
    clientId: resolveClientCode(),
    actorId,
    action,
    ...(targetId ? { targetId } : {}),
    ...(memo ? { memo } : {}),
    timestamp: new Date().toISOString(),
  });

  if (pending.length > MAX_PENDING) {
    const dropped = pending.length - MAX_PENDING;
    pending = pending.slice(dropped);
    logger.warn('[activityLogger] queue over cap, dropped oldest entries', { dropped });
  }

  persist();
  scheduleFlush(pending.length >= FLUSH_NOW_THRESHOLD ? 0 : FLUSH_DEBOUNCE_MS);
}

export async function flushActivityLog(): Promise<void> {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}

if (typeof window !== 'undefined') {
  const flushOnExit = () => {
    if (pending.length > 0) void flushActivityLog();
  };
  window.addEventListener('pagehide', flushOnExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        pending = [...(parsed as PendingEntry[]), ...pending];
        logger.debug('[activityLogger] restored pending entries', { count: pending.length });
        scheduleFlush(RESTORE_DELAY_MS);
      }
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
