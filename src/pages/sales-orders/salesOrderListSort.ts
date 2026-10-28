import type { Customer, SalesOrder } from '@/types';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import type { ResolvedStatusOption } from '@/utils/permission';
import { computeSalesOrderTotals } from '@/utils/salesOrderPricing';
import { getSalesOrderReadyMs } from '@/utils/salesOrderReadyDate';
import { formatWarehouseStaffNames, readWarehouseStaff } from './salesOrderWarehouseStaff';
import { isOpenUrgentSalesOrder } from './urgencyRowBg';

export type SalesOrderListSortLookups = {
  readonly resolveStatus: (value: string | undefined) => Pick<ResolvedStatusOption, 'stage'>;

  readonly statusOrder: readonly string[];

  readonly cancellationTargetStatus: string | undefined;
  readonly getCustomerByCode: (code: string) => Customer | undefined;
  readonly getEmployeeName: (id: string) => string | undefined;

  readonly showPrice: boolean;
  readonly vatRate: number;
};

function getDeliveryMs(order: SalesOrder): number | undefined {
  const raw = order.extra?.deliveryDate;
  if (raw == null || raw === '') return undefined;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

const collator = new Intl.Collator('vi', { numeric: true });

function cellValueReader(
  field: string,
  lookups: SalesOrderListSortLookups,
): ((o: SalesOrder) => string | number | undefined) | undefined {
  switch (field) {
    case 'orderNumber':
      return (o) => o.orderNumber || undefined;
    case 'customer':
      return (o) => resolveSalesOrderCustomerName(o, lookups.getCustomerByCode) || undefined;
    case 'assignedStaff':
      return (o) => {
        const id = o.extra?.assignedStaff;
        return (id && lookups.getEmployeeName(id)) || undefined;
      };
    case 'warehouseStaff':
      return (o) =>
        formatWarehouseStaffNames(readWarehouseStaff(o.extra), lookups.getEmployeeName) ||
        undefined;
    case 'grandTotal':
      if (!lookups.showPrice) return undefined;
      return (o) => computeSalesOrderTotals(o, lookups.vatRate).grandTotal;
    case 'status':
      return (o) => {
        const value =
          o.extra?.cancellation != null ? lookups.cancellationTargetStatus : o.extra?.status;
        if (!value) return undefined;
        const rank = lookups.statusOrder.indexOf(value);
        return rank === -1 ? lookups.statusOrder.length : rank;
      };
    default:
      return undefined;
  }
}

export function compareSalesOrdersForList(
  sortField: string,
  internalDeliveryFirst: boolean,
  lookups: SalesOrderListSortLookups,
) {
  const [field, dir] = sortField.split('_');

  const mult = dir === 'asc' ? 1 : -1;
  const leads = (o: SalesOrder) =>
    isOpenUrgentSalesOrder(o.extra?.isUrgent === true, lookups.resolveStatus(o.extra?.status).stage)
      ? 1
      : 0;
  const readCell = cellValueReader(field, lookups);
  return (a: SalesOrder, b: SalesOrder): number => {
    const aU = leads(a);
    const bU = leads(b);
    if (aU !== bU) return bU - aU;

    if (field === 'deliveryDate') {
      const aMs = getDeliveryMs(a);
      const bMs = getDeliveryMs(b);

      if (aMs === undefined || bMs === undefined) {
        if (aMs === bMs) return 0;
        return aMs === undefined ? 1 : -1;
      }
      return (aMs - bMs) * mult;
    }

    if (readCell) {
      const aV = readCell(a);
      const bV = readCell(b);

      if (aV === undefined || bV === undefined) {
        if (aV !== bV) return aV === undefined ? 1 : -1;
      } else {
        const byCell =
          typeof aV === 'number' && typeof bV === 'number'
            ? aV - bV
            : collator.compare(String(aV), String(bV));
        if (byCell !== 0) return byCell * mult;
      }
      return getSalesOrderReadyMs(b) - getSalesOrderReadyMs(a);
    }

    if (internalDeliveryFirst) {
      const aExternal = a.extra?.isInternalDelivery === false ? 1 : 0;
      const bExternal = b.extra?.isInternalDelivery === false ? 1 : 0;
      if (aExternal !== bExternal) return aExternal - bExternal;
    }

    return (getSalesOrderReadyMs(a) - getSalesOrderReadyMs(b)) * mult;
  };
}
