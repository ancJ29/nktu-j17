import { cMngtConnector } from '@credo/connectors/connector';
import type { SalesOrder, SalesOrderExtra } from '@/types';
import { salesOrderFieldOptions } from '@/pages/sales-orders/useSalesOrderFieldOptions';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { buildSalesReport, salesOrderAnchorDate } from './buildSalesReport';
import { addDays, resolveMonth, resolveWeekPeriod, type ResolvedPeriod } from './reportPeriods';
import { createReportCustomerResolver } from './reportCustomerIdentity';
import { sourceHashOf } from './sourceHash';
import type { NktuReportKind, SalesReportData } from './types';

const LOOKBACK_DAYS = 45;
const LOOKAHEAD_DAYS = 14;

function resolveSalesPeriod(kind: NktuReportKind, periodKey: string): ResolvedPeriod {
  return kind === 'sales-monthly' ? resolveMonth(periodKey) : resolveWeekPeriod(periodKey);
}

export interface SalesSnapshotInput {
  data: SalesReportData;
  sourceHash: string;
}

export async function aggregateSalesReport(
  kind: NktuReportKind,
  periodKey: string,
): Promise<SalesSnapshotInput> {
  const period = resolveSalesPeriod(kind, periodKey);

  const res = await cMngtConnector.querySalesOrders<SalesOrderExtra>({
    fromPeriod: addDays(period.startStr, -LOOKBACK_DAYS),
    toPeriod: addDays(period.endStr, LOOKAHEAD_DAYS),
  });
  const orders = (res.salesOrders as SalesOrder[]).filter((o) => {
    if ((o.extra as { isDeleted?: boolean } | undefined)?.isDeleted) return false;
    const d = salesOrderAnchorDate(o);
    return d >= period.startStr && d <= period.endStr;
  });

  await Promise.all([useEmployeeStore.getState().loadAll(), useCustomerStore.getState().loadAll()]);
  const empName = new Map(useEmployeeStore.getState().items.map((e) => [e.id, e.name]));

  const data = buildSalesReport(period, orders, {
    statusOptions: salesOrderFieldOptions.statusOptions,
    employeeName: (id) => (id ? empName.get(id) : undefined),
    methodLabel: (code) => salesOrderFieldOptions.resolveDeliveryMethod(code),
    customerOf: createReportCustomerResolver(useCustomerStore.getState().items),
  });

  return { data, sourceHash: sourceHashOf(orders) };
}
