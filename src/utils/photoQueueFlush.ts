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
  markPendingUploaded,
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
    let url = entry.uploadedUrl;

    if (!url) {
      const uploaded = await uploadPhotoFile({
        file: new File([entry.blob], entry.fileName, { type: entry.contentType }),
        imageDirectory: entry.imageDirectory,
        fileName: entry.fileName,

        budget: 'background',
      });

      if (!uploaded.ok) {
        result.failed += 1;
        await bumpPendingAttempts(entry.id);

        if (uploaded.reason === 'offline' || uploaded.reason === 'timeout') break;
        continue;
      }
      url = uploaded.url;

      await markPendingUploaded(entry.id, url);
    }

    try {
      const outcome = await attachUploadedPhoto(entry, url);
      if (outcome.record) {
        result.updated.push({ kind: entry.target.kind, record: outcome.record });
        result.uploaded += 1;
      } else if (outcome.reason === 'withdrawn') {
        deleteMedia(url);
      }
      // 'already-attached' → nothing to do, just drop the queue entry.
    } catch (err) {
      logger.error('[PHOTO-QUEUE] attach failed', err);
      result.failed += 1;
      await bumpPendingAttempts(entry.id);
      continue;
    }

    await removePendingPhoto(entry.id);
  }

  return result;
}

type AttachOutcome = {
  record: DeliveryRequest | SalesOrder | null;
  reason?: 'withdrawn' | 'already-attached' | 'unreachable';
};

async function attachUploadedPhoto(entry: PendingPhoto, url: string): Promise<AttachOutcome> {
  const sentinel = pendingPhotoUrl(entry.id);

  const resolveNext = <T extends { url: string }>(photos: T[], make: () => T): T[] | null => {
    if (photos.some((photo) => photo.url === sentinel)) {
      return photos.map((photo) => (photo.url === sentinel ? { ...photo, url } : photo));
    }
    if (photos.some((photo) => photo.url === url)) return null;
    if (entry.attached) return null;
    return [...photos, make()];
  };

  if (entry.target.kind === 'delivery-request') {
    const request = await loadDeliveryRequest(entry.target.id);
    if (!request) return { record: null, reason: 'unreachable' };
    const photos = (request.extra as DeliveryRequestExtra | undefined)?.photos ?? [];
    const next = resolveNext<DeliveryRequestPhoto>(photos, () => buildPhotoFromEntry(entry, url));
    if (!next) {
      return { record: null, reason: entry.attached ? 'withdrawn' : 'already-attached' };
    }

    const { record } = await writePhotosWithConflictRetry<DeliveryRequest, DeliveryRequestPhoto>({
      record: request,
      next,
      getPhotos: (rec) => (rec.extra as DeliveryRequestExtra | undefined)?.photos ?? [],
      save: async (rec, nextPhotos) =>
        (await useDeliveryRequestStore.getState().updateSafely({
          id: rec.id,
          version: rec.version,
          patch: { extra: { ...(rec.extra ?? {}), photos: nextPhotos } },
        })) as DeliveryRequest,
    });
    return { record };
  }

  const order = await loadSalesOrder(entry.target.id);
  if (!order) return { record: null, reason: 'unreachable' };
  const photos = (order.extra as SalesOrderExtra | undefined)?.photos ?? [];
  const next = resolveNext<SalesOrderPhoto>(photos, () => buildPhotoFromEntry(entry, url));
  if (!next) {
    return { record: null, reason: entry.attached ? 'withdrawn' : 'already-attached' };
  }

  const { record } = await writePhotosWithConflictRetry<SalesOrder, SalesOrderPhoto>({
    record: order,
    next,
    getPhotos: (rec) => (rec.extra as SalesOrderExtra | undefined)?.photos ?? [],
    save: async (rec, nextPhotos) =>
      (await useSalesOrderStore.getState().updateSafely({
        id: rec.id,
        version: rec.version,
        patch: { extra: { ...(rec.extra ?? {}), photos: nextPhotos } },
      })) as SalesOrder,
  });
  return { record };
}

function buildPhotoFromEntry(entry: PendingPhoto, url: string): DeliveryRequestPhoto {
  const { meta } = entry;
  return {
    url,
    timestamp: meta.timestamp,
    fileName: entry.displayName,
    ...(meta.userId && { userId: meta.userId }),
    ...(meta.userName && { userName: meta.userName }),
    ...(meta.location && { location: meta.location }),
    ...(meta.latitude != null && { latitude: meta.latitude }),
    ...(meta.longitude != null && { longitude: meta.longitude }),
    ...(meta.takenAtDelivery && { takenAtDelivery: true }),
  };
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
