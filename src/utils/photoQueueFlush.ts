import { cMngtConnector } from '@credo/connectors/connector';
import { logger } from '@credo/base-ui/utils';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { writePhotosWithConflictRetry } from '@/utils/photoPersist';
import { deleteMedia } from '@/utils/mediaStorage';
import { uploadPhotoFile } from '@/utils/photoUpload';
import {
  bumpPendingAttempts,
  listPendingPhotos,
  pendingPhotoUrl,
  removePendingPhoto,
  type PendingPhoto,
  type PendingPhotoTargetKind,
} from '@/utils/photoQueue';
import type { DeliveryRequest, DeliveryRequestExtra, DeliveryRequestPhoto } from '@/types';
import type { SalesOrder, SalesOrderExtra, SalesOrderPhoto } from '@/types';

export type PhotoQueueFlushResult = {
  uploaded: number;
  failed: number;

  updated: Array<{ kind: PendingPhotoTargetKind; record: DeliveryRequest | SalesOrder }>;
};

const EMPTY: PhotoQueueFlushResult = { uploaded: 0, failed: 0, updated: [] };

let inFlight: Promise<PhotoQueueFlushResult> | null = null;

export function flushPhotoQueue(target?: {
  kind: PendingPhotoTargetKind;
  id: string;
}): Promise<PhotoQueueFlushResult> {
  if (inFlight) return inFlight;
  inFlight = runFlush(target).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runFlush(target?: {
  kind: PendingPhotoTargetKind;
  id: string;
}): Promise<PhotoQueueFlushResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return EMPTY;

  const pending = await listPendingPhotos(target);
  if (!pending.length) return EMPTY;

  const result: PhotoQueueFlushResult = { uploaded: 0, failed: 0, updated: [] };

  for (const entry of pending) {
    const uploaded = await uploadPhotoFile({
      file: new File([entry.blob], entry.fileName, { type: entry.contentType }),
      imageDirectory: entry.imageDirectory,
      fileName: entry.fileName,
    });

    if (!uploaded.ok) {
      result.failed += 1;
      await bumpPendingAttempts(entry.id);

      if (uploaded.reason === 'offline' || uploaded.reason === 'timeout') break;
      continue;
    }

    try {
      const record = await attachUploadedPhoto(entry, uploaded.url);
      if (record) {
        result.updated.push({ kind: entry.target.kind, record });
        result.uploaded += 1;
      } else {
        deleteMedia(uploaded.url);
      }
    } catch (err) {
      logger.error('[PHOTO-QUEUE] attach failed', err);
      result.failed += 1;
      await bumpPendingAttempts(entry.id);
      deleteMedia(uploaded.url);
      continue;
    }

    await removePendingPhoto(entry.id);
  }

  return result;
}

async function attachUploadedPhoto(
  entry: PendingPhoto,
  url: string,
): Promise<DeliveryRequest | SalesOrder | null> {
  const sentinel = pendingPhotoUrl(entry.id);

  if (entry.target.kind === 'delivery-request') {
    const request = await loadDeliveryRequest(entry.target.id);
    if (!request) return null;
    const photos = (request.extra as DeliveryRequestExtra | undefined)?.photos ?? [];
    if (!photos.some((photo) => photo.url === sentinel)) return null;

    const { record } = await writePhotosWithConflictRetry<DeliveryRequest, DeliveryRequestPhoto>({
      record: request,
      next: photos.map((photo) => (photo.url === sentinel ? { ...photo, url } : photo)),
      getPhotos: (rec) => (rec.extra as DeliveryRequestExtra | undefined)?.photos ?? [],
      save: async (rec, nextPhotos) =>
        (await useDeliveryRequestStore.getState().updateSafely({
          id: rec.id,
          version: rec.version,
          patch: { extra: { ...(rec.extra ?? {}), photos: nextPhotos } },
        })) as DeliveryRequest,
    });
    return record;
  }

  const order = await loadSalesOrder(entry.target.id);
  if (!order) return null;
  const photos = (order.extra as SalesOrderExtra | undefined)?.photos ?? [];
  if (!photos.some((photo) => photo.url === sentinel)) return null;

  const { record } = await writePhotosWithConflictRetry<SalesOrder, SalesOrderPhoto>({
    record: order,
    next: photos.map((photo) => (photo.url === sentinel ? { ...photo, url } : photo)),
    getPhotos: (rec) => (rec.extra as SalesOrderExtra | undefined)?.photos ?? [],
    save: async (rec, nextPhotos) =>
      (await useSalesOrderStore.getState().updateSafely({
        id: rec.id,
        version: rec.version,
        patch: { extra: { ...(rec.extra ?? {}), photos: nextPhotos } },
      })) as SalesOrder,
  });
  return record;
}

async function loadDeliveryRequest(id: string): Promise<DeliveryRequest | null> {
  const cached = useDeliveryRequestStore.getState().getById(id) as DeliveryRequest | undefined;
  if (cached) return cached;
  try {
    const fresh = await cMngtConnector.getDeliveryRequestById<DeliveryRequestExtra>({ id });
    return (fresh.deliveryRequest as DeliveryRequest) ?? null;
  } catch {
    return null;
  }
}

async function loadSalesOrder(id: string): Promise<SalesOrder | null> {
  const cached = useSalesOrderStore.getState().getById(id) as SalesOrder | undefined;
  if (cached) return cached;
  try {
    const fresh = await cMngtConnector.getSalesOrderById<SalesOrderExtra>({ id });
    return (fresh.salesOrder as SalesOrder) ?? null;
  } catch {
    return null;
  }
}

const MIN_FLUSH_INTERVAL_MS = 10_000;
let lastFlushAt = 0;
let autoFlushStarted = false;

function maybeFlush(): void {
  const now = Date.now();
  if (now - lastFlushAt < MIN_FLUSH_INTERVAL_MS) return;
  lastFlushAt = now;
  void flushPhotoQueue();
}

export function startPhotoQueueAutoFlush(): () => void {
  if (autoFlushStarted || typeof window === 'undefined') return () => {};
  autoFlushStarted = true;

  const onVisible = () => {
    if (document.visibilityState === 'visible') maybeFlush();
  };

  window.addEventListener('online', maybeFlush);
  document.addEventListener('visibilitychange', onVisible);
  maybeFlush();

  return () => {
    window.removeEventListener('online', maybeFlush);
    document.removeEventListener('visibilitychange', onVisible);
    autoFlushStarted = false;
  };
}
