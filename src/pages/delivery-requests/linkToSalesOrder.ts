import { cMngtConnector } from '@credo/connectors/connector';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import type { SalesOrder, SalesOrderExtra } from '@/types';

export async function unlinkDRFromSalesOrder(salesOrderId: string, drId: string): Promise<void> {
  let so = useSalesOrderStore.getState().getById(salesOrderId) as SalesOrder | undefined;
  if (!so) {
    const fresh = await cMngtConnector.getSalesOrderById<SalesOrderExtra>({ id: salesOrderId });
    so = fresh.salesOrder as SalesOrder;
  }
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const currentExtra = (so.extra ?? {}) as SalesOrderExtra;
    const existingIds = currentExtra.deliveryRequestIds ?? [];
    if (!existingIds.includes(drId)) return;
    try {
      await useSalesOrderStore.getState().updateSafely({
        id: salesOrderId,
        version: so.version,
        patch: {
          extra: {
            ...currentExtra,
            deliveryRequestIds: existingIds.filter((existing) => existing !== drId),
          },
        },
      });
      return;
    } catch (err) {
      if (err instanceof EntityConflictError && err.latest && attempt + 1 < MAX_ATTEMPTS) {
        so = err.latest as SalesOrder;
        continue;
      }
      throw err;
    }
  }
}

export async function linkDRToSalesOrder(salesOrderId: string, drId: string): Promise<void> {
  let so = useSalesOrderStore.getState().getById(salesOrderId) as SalesOrder | undefined;
  if (!so) {
    const fresh = await cMngtConnector.getSalesOrderById<SalesOrderExtra>({ id: salesOrderId });
    so = fresh.salesOrder as SalesOrder;
  }
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const currentExtra = (so.extra ?? {}) as SalesOrderExtra;
    const existingIds = currentExtra.deliveryRequestIds ?? [];
    if (existingIds.includes(drId)) return;
    try {
      await useSalesOrderStore.getState().updateSafely({
        id: salesOrderId,
        version: so.version,
        patch: {
          extra: {
            ...currentExtra,
            deliveryRequestIds: [...existingIds, drId],
          },
        },
      });
      return;
    } catch (err) {
      if (err instanceof EntityConflictError && err.latest && attempt + 1 < MAX_ATTEMPTS) {
        so = err.latest as SalesOrder;
        continue;
      }
      throw err;
    }
  }
}
