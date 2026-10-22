

import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { logActivity } from '@/utils/activityLogger';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';

async function softDeleteDeliveryRequestRecord(dr: DeliveryRequest): Promise<boolean> {
  let current = dr;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const extra = (current.extra ?? {}) as DeliveryRequestExtra;
    if (extra.isDeleted) return true;
    try {
      await useDeliveryRequestStore.getState().updateSafely({
        id: current.id,
        version: current.version,
        patch: { extra: { ...extra, isDeleted: true } },
      });
      logActivity('deliveryRequest.delete', current.id, { requestNumber: current.requestNumber });
      return true;
    } catch (err) {
      if (err instanceof EntityConflictError && err.latest && attempt + 1 < MAX_ATTEMPTS) {
        current = err.latest as DeliveryRequest;
        continue;
      }
      return false;
    }
  }
  return false;
}

export async function softDeleteLinkedDeliveryRequests(
  salesOrderId: string,
): Promise<{ deleted: number; failed: number }> {
  const linked = useDeliveryRequestStore
    .getState()
    .items.filter((d) => d.salesOrderId === salesOrderId && !d.extra?.isDeleted);

  let deleted = 0;
  let failed = 0;
  for (const dr of linked) {
    const ok = await softDeleteDeliveryRequestRecord(dr);
    if (ok) deleted += 1;
    else failed += 1;
  }
  if (deleted > 0) useDeliveryRequestStore.getState().invalidate();
  return { deleted, failed };
}
