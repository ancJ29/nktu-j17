import { createIdbStore } from '@/utils/idbStore';
import type { DeliveryRequestDeliveredItem } from '@/types';

export type QueuedTransition = {
  id: string;
  drNumber?: string;
  toStatusValue: string;

  toStatusLabel?: string;
  note?: string;
  deliveredItems?: DeliveryRequestDeliveredItem[];
  actor?: { id: string; name: string };
  createdAt: number;
  attempts: number;

  blocked?: { reason: string; at: number };
};

const store = createIdbStore<QueuedTransition>({
  dbName: 'c-mngt-transition-queue',
  storeName: 'pending',
  label: 'DR-TRANSITION-QUEUE',
});

export async function queueTransition(
  entry: Omit<QueuedTransition, 'createdAt' | 'attempts' | 'blocked'>,
): Promise<QueuedTransition | null> {
  const queued: QueuedTransition = { ...entry, createdAt: Date.now(), attempts: 0 };
  if (!(await store.put(queued))) return null;
  notifyChanged();
  return queued;
}

export function getQueuedTransition(drId: string): Promise<QueuedTransition | null> {
  return store.get(drId);
}

export async function listQueuedTransitions(): Promise<QueuedTransition[]> {
  return (await store.getAll()).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedTransition(drId: string): Promise<void> {
  await store.remove(drId);
  notifyChanged();
}

export async function bumpTransitionAttempts(drId: string): Promise<void> {
  const existing = await store.get(drId);
  if (!existing) return;
  await store.put({ ...existing, attempts: existing.attempts + 1 });
  notifyChanged();
}

export async function markTransitionBlocked(drId: string, reason: string): Promise<void> {
  const existing = await store.get(drId);
  if (!existing) return;
  await store.put({ ...existing, blocked: { reason, at: Date.now() } });
  notifyChanged();
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeTransitionQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A broken subscriber must not take the queue write with it.
    }
  });
}
