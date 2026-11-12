import { EntityConflictError } from '@/stores/createEntityStore';
import { purchaseOrderBundle } from '@/stores/usePurchaseOrderStore';
import type { PurchaseOrder, PurchaseOrderAttachment, PurchaseOrderPhoto } from '@/types';
import { writePhotosWithConflictRetry } from '@/utils/photoPersist';
import { poAttachments, poPhotos } from './purchaseOrderModel';

async function writeKey<T extends { url: string; isDeleted?: boolean }>(
  order: PurchaseOrder,
  key: 'photos' | 'attachments',
  next: T[],
  getItems: (rec: PurchaseOrder) => T[],
): Promise<{ record: PurchaseOrder; rebased: boolean }> {
  try {
    return await writePhotosWithConflictRetry<PurchaseOrder, T>({
      record: order,
      next,
      getPhotos: getItems,
      save: (rec, items) =>
        purchaseOrderBundle.updateSafely({
          id: rec.id,
          version: rec.version,
          patch: { [key]: items },
        }),
    });
  } catch (err) {
    if (err instanceof EntityConflictError && err.latest) {
      purchaseOrderBundle.useStore.getState().upsertItem(err.latest as PurchaseOrder);
    }
    throw err;
  }
}

export function writePurchaseOrderPhotos(order: PurchaseOrder, next: PurchaseOrderPhoto[]) {
  return writeKey(order, 'photos', next, poPhotos);
}

export function writePurchaseOrderAttachments(
  order: PurchaseOrder,
  next: PurchaseOrderAttachment[],
) {
  return writeKey(order, 'attachments', next, poAttachments);
}
