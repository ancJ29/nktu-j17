import { logger } from '@credo/base-ui/utils';
import { createIdbStore } from '@/utils/idbStore';
import type { DateTimeInput } from '@credo/kits/types';

export type PendingPhoto = {
  id: string;
  blob: Blob;
  contentType: string;

  fileName: string;

  displayName: string;
  imageDirectory: string;
  target: { kind: PendingPhotoTargetKind; id: string };
  meta: {
    timestamp: DateTimeInput;
    userId?: string;
    userName?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    takenAtDelivery?: boolean;
  };
  createdAt: number;
  attempts: number;

  attached: boolean;

  uploadedUrl?: string;
};

export type PendingPhotoTargetKind = 'delivery-request' | 'sales-order';

const PENDING_URL_PREFIX = 'pending:';

export function pendingPhotoUrl(id: string): string {
  return `${PENDING_URL_PREFIX}${id}`;
}

export function isPendingPhotoUrl(url: string | undefined): boolean {
  return !!url?.startsWith(PENDING_URL_PREFIX);
}

export function pendingPhotoId(url: string | undefined): string | null {
  if (!isPendingPhotoUrl(url)) return null;
  return url!.slice(PENDING_URL_PREFIX.length);
}

export function hasPendingPhotoUpload(
  photos: ReadonlyArray<{ url: string; isDeleted?: boolean }> | undefined,
): boolean {
  return !!photos?.some((photo) => !photo.isDeleted && isPendingPhotoUrl(photo.url));
}

const store = createIdbStore<PendingPhoto>({
  dbName: 'c-mngt-photo-queue',
  storeName: 'pending',
  label: 'PHOTO-QUEUE',
});

function newQueueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueuePhoto(
  entry: Omit<PendingPhoto, 'id' | 'createdAt' | 'attempts' | 'attached'> &
    Partial<Pick<PendingPhoto, 'attached'>>,
): Promise<PendingPhoto | null> {
  const pending: PendingPhoto = {
    attached: false,
    ...entry,
    id: newQueueId(),
    createdAt: Date.now(),
    attempts: 0,
  };
  if (!(await store.put(pending))) return null;
  notifyQueueChanged();
  return pending;
}

export function getPendingPhoto(id: string): Promise<PendingPhoto | null> {
  return store.get(id);
}

export async function listPendingPhotos(target?: {
  kind: PendingPhotoTargetKind;
  id: string;
}): Promise<PendingPhoto[]> {
  const rows = await store.getAll();
  const scoped = target
    ? rows.filter((row) => row.target.kind === target.kind && row.target.id === target.id)
    : rows;
  return scoped.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingPhoto(id: string): Promise<void> {
  await store.remove(id);
  notifyQueueChanged();
}

export async function markPendingAttached(id: string): Promise<void> {
  const existing = await store.get(id);
  if (!existing || existing.attached) return;
  await store.put({ ...existing, attached: true });
}

export async function markPendingUploaded(id: string, uploadedUrl: string): Promise<void> {
  const existing = await store.get(id);
  if (!existing) return;
  await store.put({ ...existing, uploadedUrl });
}

export async function bumpPendingAttempts(id: string): Promise<void> {
  const existing = await store.get(id);
  if (!existing) return;
  await store.put({ ...existing, attempts: existing.attempts + 1 });
  notifyQueueChanged();
}

type QueueListener = () => void;
const listeners = new Set<QueueListener>();

export function subscribePhotoQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyQueueChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      logger.error('[PHOTO-QUEUE] listener threw', err);
    }
  });
}
