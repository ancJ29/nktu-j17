import { appConfig } from '@/config';
import { purchaseOrderBundle } from '@/stores/usePurchaseOrderStore';
import { getCurrentActorId } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { createMemo, updateMemo } from './activityMemo';
import {
  buildDailySequentialCode,
  bumpSequentialCode,
  businessDateString,
  isDuplicateUniqueFieldError,
} from '@/utils/code';
import type { PurchaseOrder, PurchaseOrderExtra, PurchaseOrderLeadTime } from '@/types';

export const MAX_ORDER_NUMBER_RETRIES = 50;

export type PurchaseOrderWrite = Pick<
  PurchaseOrder,
  | 'vendorCode'
  | 'vendorName'
  | 'customerCode'
  | 'customerName'
  | 'locationCode'
  | 'locationName'
  | 'reference'
  | 'notes'
  | 'currency'
  | 'items'
> & {
  vatRate: number | null;

  vendorNote: string;

  orderDate: string;

  leadTime: PurchaseOrderLeadTime | null;
  paymentDeadline?: string;
  assignedTo?: string;
  requestedBy?: string;
};

function splitWrite(write: PurchaseOrderWrite) {
  const { assignedTo, requestedBy, orderDate, leadTime, paymentDeadline, ...rest } = write;
  return { assignedTo, requestedBy, orderDate, leadTime, paymentDeadline, rest };
}

export async function savePurchaseOrder(input: {
  id?: string | undefined;
  snapshot: PurchaseOrder | null;
  write: PurchaseOrderWrite;

  copyFromId?: string | undefined;
  invalidate: () => void;
}): Promise<PurchaseOrder> {
  const actor = getCurrentActorId();
  const { assignedTo, requestedBy, orderDate, leadTime, paymentDeadline, rest } = splitWrite(
    input.write,
  );

  if (input.id) {
    if (!input.snapshot) throw new Error('Purchase order snapshot missing');
    const extra: PurchaseOrderExtra = {
      ...input.snapshot.extra,
      createdBy: input.snapshot.extra?.createdBy ?? actor,
      lastUpdatedBy: actor,
      assignedTo,
      requestedBy,
    };
    const updated = await purchaseOrderBundle.updateSafely({
      id: input.id,
      version: input.snapshot.version,

      patch: {
        ...rest,
        orderDate,
        leadTime,
        paymentDeadline: paymentDeadline ?? '',
        extra,
      },
    });
    logActivity('purchaseOrder.update', input.id, updateMemo(input.snapshot, updated));
    return updated;
  }

  const todays = await purchaseOrderBundle.queryPartition(businessDateString());
  const baseNumber = buildDailySequentialCode(
    appConfig.features.purchaseOrders.codePrefix,
    todays.map((o) => o.orderNumber),
  );
  const extra: PurchaseOrderExtra = {
    createdBy: actor,
    lastUpdatedBy: actor,
    assignedTo,
    requestedBy,
    ...(input.copyFromId ? { copyFromId: input.copyFromId } : {}),
  };
  for (let attempt = 0; attempt <= MAX_ORDER_NUMBER_RETRIES; attempt++) {
    const orderNumber = bumpSequentialCode(baseNumber, attempt);
    try {
      const created = await purchaseOrderBundle.createSafely({
        item: {
          orderNumber,
          status: 'draft',
          ...rest,
          orderDate,
          ...(leadTime ? { leadTime } : {}),
          ...(paymentDeadline ? { paymentDeadline } : {}),
          isPaid: false,
          receiptIds: [],
          extra,
        },
      });
      input.invalidate();
      logActivity('purchaseOrder.create', created.id, createMemo(created, rest.items));
      return created;
    } catch (err) {
      if (isDuplicateUniqueFieldError(err, 'orderNumber') && attempt < MAX_ORDER_NUMBER_RETRIES) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('Purchase order create exhausted order-number retries');
}
