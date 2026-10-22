import { credoSmeConnector } from '@credo/connectors/connector';
import type { SalesOrderV2, SalesOrderV2LineInput } from '@/types/sales-order-v2';
import { createPartitionedDayStore } from './createPartitionedDayStore';
import { revalidateStockFor } from './stockAfterWrite';

const partition = createPartitionedDayStore<SalesOrderV2>({
  cacheKey: 'sov2.7c31ae',
  querySync: (input) => credoSmeConnector.querySyncSalesOrders(input),
});

export const useSalesOrderV2Store = partition.store;

export const setSalesOrderV2Range = partition.setRange;

export const fetchSalesOrderV2Window = partition.fetchWindow;

export async function createSalesOrderV2(input: {
  customerId?: string;

  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  orderDate?: string;
  requestedDate?: string;
  reference?: string;
  notes?: string;
  items: SalesOrderV2LineInput[];
  extra?: Record<string, unknown>;
}): Promise<SalesOrderV2> {
  return partition.write(() => credoSmeConnector.createSalesOrder(input));
}

export async function updateSalesOrderV2(
  order: SalesOrderV2,
  day: string,
  patch: {
    customerId?: string | null;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    orderDate?: string;
    requestedDate?: string;
    reference?: string;
    notes?: string;
    items?: SalesOrderV2LineInput[];

    extra?: Record<string, unknown>;
  },
): Promise<SalesOrderV2> {
  return partition.writeSafely(order, day, (cas) =>
    credoSmeConnector.updateSalesOrder({ id: order.id, patch, ...cas }),
  );
}

export async function transitionSalesOrderV2(
  to: string,
  order: SalesOrderV2,
  day: string,
  options: { reduceRemaining?: boolean } = {},
): Promise<SalesOrderV2> {
  const written = await partition.transitionSafely(order, day, (cas) =>
    credoSmeConnector.transitionSalesOrder({
      id: order.id,
      to,
      ...(options.reduceRemaining ? { reduceRemaining: true } : {}),
      ...cas,
    }),
  );
  revalidateStockFor(written);
  return written;
}

export async function inventorySalesOrderV2(
  action: 'lock' | 'release',
  order: SalesOrderV2,
  day: string,
  lines?: Array<{ itemType?: SalesOrderV2LineInput['itemType']; itemId: string }>,
): Promise<SalesOrderV2> {
  const written = await partition.writeSafely(order, day, (cas) =>
    credoSmeConnector.salesOrderInventory({
      id: order.id,
      action,
      ...(lines !== undefined ? { lines } : {}),
      ...cas,
    }),
  );
  revalidateStockFor(written);
  return written;
}

export async function setSalesOrderV2Payment(
  order: SalesOrderV2,
  day: string,
  payment: { status: NonNullable<SalesOrderV2['paymentStatus']>; paidAmount?: number },
): Promise<SalesOrderV2> {
  return partition.writeSafely(order, day, (cas) =>
    credoSmeConnector.setSalesOrderPayment({
      id: order.id,
      status: payment.status,
      ...(payment.paidAmount !== undefined ? { paidAmount: payment.paidAmount } : {}),
      ...cas,
    }),
  );
}

export async function getSalesOrderV2ById(
  id: string,
): Promise<{ item: SalesOrderV2; day: string }> {
  const res = await credoSmeConnector.getSalesOrderById({ id });
  return { item: res.item, day: res.day };
}
