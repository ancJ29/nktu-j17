import { cMngtConnector } from '@credo/connectors/connector';
import type { SalesOrder, SalesOrderExtra } from '@/types';
import { salesOrderFieldOptions } from '@/pages/sales-orders/useSalesOrderFieldOptions';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { salesOrderAnchorDate } from './buildSalesReport';
import { buildCustomerProductReport } from './buildCustomerProductReport';
import { addDays, resolveMonth } from './reportPeriods';
import { createReportCustomerResolver } from './reportCustomerIdentity';
import { sourceHashOf } from './sourceHash';
import type { CustomerProductReportData } from './types';

const LOOKBACK_DAYS = 45;
const LOOKAHEAD_DAYS = 14;

export interface CustomerProductSnapshotInput {
  data: CustomerProductReportData;
  sourceHash: string;
}

export async function aggregateCustomerProductReport(
  periodKey: string,
): Promise<CustomerProductSnapshotInput> {
  const period = resolveMonth(periodKey);

  const res = await cMngtConnector.querySalesOrders<SalesOrderExtra>({
    fromPeriod: addDays(period.startStr, -LOOKBACK_DAYS),
    toPeriod: addDays(period.endStr, LOOKAHEAD_DAYS),
  });
  const orders = (res.salesOrders as SalesOrder[]).filter((o) => {
    if ((o.extra as { isDeleted?: boolean } | undefined)?.isDeleted) return false;
    const d = salesOrderAnchorDate(o);
    return d >= period.startStr && d <= period.endStr;
  });

  await useCustomerStore.getState().loadAll();
  const customerOf = createReportCustomerResolver(useCustomerStore.getState().items);

  const data = buildCustomerProductReport(period, orders, {
    statusOptions: salesOrderFieldOptions.statusOptions,
    customerOf,
  });

  return { data, sourceHash: sourceHashOf(orders) };
}
