import { notifications } from '@mantine/notifications';
import { logger } from '@credo/base-ui/utils';
import { appConfig } from '@/config';
import { EntityConflictError } from '@/stores/createEntityStore';
import { transportOrderBundle } from '@/stores/useTransportOrderStore';
import { getCurrentActorId, getCurrentEmployeeStamp } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { buildDailySequentialCode, bumpSequentialCode, businessDateString } from '@/utils/code';
import type { TransportOrder, TransportOrderExtra } from '@/types';
import { isDuplicateOrderNumberError, MAX_ORDER_NUMBER_RETRIES } from './transportOrderWrite';
import { appendTimelineEntry, createMemo, diffTransportOrder, isEmptyDiff } from './activityMemo';

export type TransportOrderSaveInput = {
  id?: string | undefined;

  snapshot: TransportOrder | null;

  status: string;

  write: (extra: TransportOrderExtra) => Record<string, unknown>;

  invalidate: () => void;
};

export async function saveTransportOrder({
  id,
  snapshot,
  status,
  write,
  invalidate,
}: TransportOrderSaveInput): Promise<TransportOrder> {
  const actor = getCurrentActorId();

  if (id) {
    if (!snapshot) throw new Error('Transport order snapshot missing');
    const updated = await transportOrderBundle.updateSafely({
      id,
      version: snapshot.version,
      patch: write({ ...snapshot.extra, createdBy: snapshot.extra?.createdBy ?? actor }),
    });

    const fields = diffTransportOrder(snapshot, updated);
    if (!isEmptyDiff(fields)) {
      logActivity('transportOrder.update', id, { orderNumber: updated.orderNumber, fields });
    }
    return updated;
  }

  const todays = await transportOrderBundle.queryPartition(businessDateString());
  const baseNumber = buildDailySequentialCode(
    appConfig.features.transportOrders.codePrefix,
    todays.map((o) => o.orderNumber),
  );

  const createdExtra: TransportOrderExtra = { createdBy: actor };
  createdExtra.activityLog = appendTimelineEntry(createdExtra, {
    action: 'created',
    toStatus: status,
    ...getCurrentEmployeeStamp(),
  });

  for (let attempt = 0; attempt <= MAX_ORDER_NUMBER_RETRIES; attempt++) {
    const orderNumber = bumpSequentialCode(baseNumber, attempt);
    try {
      const created = await transportOrderBundle.createSafely({
        item: { orderNumber, ...write(createdExtra) },
      });
      invalidate();
      logActivity('transportOrder.create', created.id, createMemo(created));
      return created;
    } catch (err) {
      if (isDuplicateOrderNumberError(err) && attempt < MAX_ORDER_NUMBER_RETRIES) continue;
      throw err;
    }
  }
  throw new Error('Transport order create exhausted order-number retries');
}

export function notifyTransportOrderSaveError(
  err: unknown,
  messages: { conflictTitle: string; conflictMessage: string; failed: string },
  onLatest: (latest: TransportOrder) => void,
): void {
  logger.error('Transport order submit failed:', err);
  if (err instanceof EntityConflictError) {
    if (err.latest) onLatest(err.latest as TransportOrder);
    notifications.show({
      color: 'yellow',
      title: messages.conflictTitle,
      message: messages.conflictMessage,
      autoClose: 8000,
    });
    return;
  }
  notifications.show({ color: 'red', message: messages.failed });
}
