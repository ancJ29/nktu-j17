import { logger } from '@credo/base-ui/utils';
import type { DateTimeInput } from '@credo/kits/types';

const DB_NAME = 'c-mngt-photo-queue';
const DB_VERSION = 1;
const STORE = 'pending';

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

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      logger.error('[PHOTO-QUEUE] open failed', req.error);
      resolve(null);
    };
    req.onblocked = () => {
      logger.warn('[PHOTO-QUEUE] open blocked');
      resolve(null);
    };
  });
  return dbPromise;
}

function runTx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(STORE, mode);
          const req = run(tx.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            logger.error('[PHOTO-QUEUE] tx failed', req.error);
            resolve(null);
          };
        } catch (err) {
          logger.error('[PHOTO-QUEUE] tx threw', err);
          resolve(null);
        }
      }),
  );
}

function newQueueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueuePhoto(
  entry: Omit<PendingPhoto, 'id' | 'createdAt' | 'attempts'>,
): Promise<PendingPhoto | null> {
  const pending: PendingPhoto = {
    ...entry,
    id: newQueueId(),
    createdAt: Date.now(),
    attempts: 0,
  };
  const stored = await runTx('readwrite', (store) => store.put(pending));
  if (stored == null) return null;
  notifyQueueChanged();
  return pending;
}

export async function getPendingPhoto(id: string): Promise<PendingPhoto | null> {
  const result = await runTx<PendingPhoto | undefined>('readonly', (store) => store.get(id));
  return result ?? null;
}

export async function listPendingPhotos(target?: {
  kind: PendingPhotoTargetKind;
  id: string;
}): Promise<PendingPhoto[]> {
  const all = await runTx<PendingPhoto[]>('readonly', (store) => store.getAll());
  const rows = all ?? [];
  const scoped = target
    ? rows.filter((row) => row.target.kind === target.kind && row.target.id === target.id)
    : rows;
  return scoped.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingPhoto(id: string): Promise<void> {
  await runTx('readwrite', (store) => store.delete(id));
  notifyQueueChanged();
}

export async function bumpPendingAttempts(id: string): Promise<void> {
  const existing = await getPendingPhoto(id);
  if (!existing) return;
  await runTx('readwrite', (store) => store.put({ ...existing, attempts: existing.attempts + 1 }));
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
