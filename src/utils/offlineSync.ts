import type { TFunction } from 'i18next';
import i18n from '@/i18n';
import { flushPhotoQueue } from '@/utils/photoQueueFlush';
import { flushTransitionQueue } from '@/pages/delivery-requests/transitionQueueFlush';

const MIN_INTERVAL_MS = 10_000;
let lastRunAt = 0;
let started = false;

export async function runOfflineSync(t: TFunction = i18n.t as TFunction): Promise<void> {
  await flushPhotoQueue();
  await flushTransitionQueue(t);
}

function maybeSync(): void {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;
  void runOfflineSync();
}

export function startOfflineSync(): () => void {
  if (started || typeof window === 'undefined') return () => {};
  started = true;

  const onVisible = () => {
    if (document.visibilityState === 'visible') maybeSync();
  };

  window.addEventListener('online', maybeSync);
  document.addEventListener('visibilitychange', onVisible);
  maybeSync();

  return () => {
    window.removeEventListener('online', maybeSync);
    document.removeEventListener('visibilitychange', onVisible);
    started = false;
  };
}
