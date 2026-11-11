import type { SalesOrder, SalesOrderExtra } from '@/types';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { logActivity } from '@/utils/activityLogger';
import { dayToVnMidnightMs } from '@/utils/paymentTerms';
import { resolveSalesOrderPaymentState } from '@/utils/salesOrderPricing';
import type { SalesOrderInlineFields } from './activityMemo';
import type { SalesOrderPaymentDraft } from './SalesOrderPaymentModal';
import { diffWarehouseStaff, readWarehouseStaff } from './salesOrderWarehouseStaff';

export type SalesOrderMetaPatch = { extra?: Partial<SalesOrderExtra>; notes?: string };

export function salesOrderPaymentPatch(
  draft: SalesOrderPaymentDraft,
  termsOn: boolean,
): SalesOrderMetaPatch {
  return {
    extra: {
      isPaid: draft.state === 'paid' ? true : undefined,
      paidAmount: draft.state === 'partial' ? draft.paidAmount : undefined,
      ...(termsOn && {
        paymentDeadline: draft.deadlineDay ? dayToVnMidnightMs(draft.deadlineDay) : undefined,
      }),
    },
  };
}

export function salesOrderUntrackPatch(untrack: boolean): SalesOrderMetaPatch {
  return { extra: { paymentUntracked: untrack ? true : undefined } };
}

export async function patchSalesOrderMeta(
  order: SalesOrder,
  patch: SalesOrderMetaPatch,
): Promise<SalesOrder> {
  const currentExtra = order.extra ?? {};
  const updated = (await useSalesOrderStore.getState().updateSafely({
    id: order.id,
    version: order.version,
    patch: {
      ...(patch.extra ? { extra: { ...currentExtra, ...patch.extra } } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  })) as SalesOrder;

  const fields: SalesOrderInlineFields = {};
  if (patch.extra) {
    const before = currentExtra as SalesOrderExtra;
    if ('assignedStaff' in patch.extra && patch.extra.assignedStaff !== before.assignedStaff) {
      fields.assignedStaff = {
        ...(before.assignedStaff && { from: before.assignedStaff }),
        ...(patch.extra.assignedStaff && { to: patch.extra.assignedStaff }),
      };
    }
    if ('warehouseStaff' in patch.extra) {
      const warehouseStaffDiff = diffWarehouseStaff(
        readWarehouseStaff(before),
        readWarehouseStaff(patch.extra),
      );
      if (warehouseStaffDiff) fields.warehouseStaff = warehouseStaffDiff;
    }
    if ('deliveryMethod' in patch.extra && patch.extra.deliveryMethod !== before.deliveryMethod) {
      fields.deliveryMethod = {
        ...(before.deliveryMethod && { from: before.deliveryMethod }),
        ...(patch.extra.deliveryMethod && { to: patch.extra.deliveryMethod }),
      };
    }
    if ('deliveryDate' in patch.extra && patch.extra.deliveryDate !== before.deliveryDate) {
      const fromMs =
        typeof before.deliveryDate === 'number'
          ? before.deliveryDate
          : before.deliveryDate
            ? new Date(before.deliveryDate).getTime()
            : undefined;
      const toMs =
        typeof patch.extra.deliveryDate === 'number'
          ? patch.extra.deliveryDate
          : patch.extra.deliveryDate
            ? new Date(patch.extra.deliveryDate as string).getTime()
            : undefined;
      fields.deliveryDate = {
        ...(fromMs !== undefined && { from: fromMs }),
        ...(toMs !== undefined && { to: toMs }),
      };
    }

    if ('isPaid' in patch.extra || 'paidAmount' in patch.extra) {
      const afterExtra = { ...before, ...patch.extra };
      if (before.isPaid !== afterExtra.isPaid || before.paidAmount !== afterExtra.paidAmount) {
        fields.payment = {
          from: resolveSalesOrderPaymentState(before).state,
          to: resolveSalesOrderPaymentState(afterExtra).state,
        };
      }
    }
    if (
      'paymentDeadline' in patch.extra &&
      patch.extra.paymentDeadline !== before.paymentDeadline
    ) {
      fields.paymentDeadline = {
        ...(typeof before.paymentDeadline === 'number' && { from: before.paymentDeadline }),
        ...(typeof patch.extra.paymentDeadline === 'number' && {
          to: patch.extra.paymentDeadline,
        }),
      };
    }
    if (
      patch.extra &&
      'paymentUntracked' in patch.extra &&
      (patch.extra.paymentUntracked === true) !== (before.paymentUntracked === true)
    ) {
      fields.paymentUntracked = { to: patch.extra.paymentUntracked === true };
    }

    if ('clientSpecific' in patch.extra) {
      const beforeNktu = before.clientSpecific?.NKTU;
      const afterNktu = patch.extra.clientSpecific?.NKTU;
      if ((beforeNktu?.warehouseNote ?? '') !== (afterNktu?.warehouseNote ?? '')) {
        fields.warehouseNote = { changed: true };
      }
      if ((beforeNktu?.driverNote ?? '') !== (afterNktu?.driverNote ?? '')) {
        fields.driverNote = { changed: true };
      }
    }
  }
  if (patch.notes !== undefined && patch.notes !== order.notes) {
    fields.notes = { changed: true };
  }
  if (Object.keys(fields).length > 0) {
    logActivity('salesOrder.update', order.id, {
      orderNumber: order.orderNumber,
      inlineEdit: true,
      fields,
    });
  }
  return updated;
}
