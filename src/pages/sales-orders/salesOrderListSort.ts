import type { SalesOrder } from '@/types';
import type { ResolvedStatusOption } from '@/utils/permission';
import { getSalesOrderReadyMs } from '@/utils/salesOrderReadyDate';
import { isOpenUrgentSalesOrder } from './urgencyRowBg';

function getDeliveryMs(order: SalesOrder): number | undefined {
  const raw = order.extra?.deliveryDate;
  if (raw == null || raw === '') return undefined;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

export function compareSalesOrdersForList(
  sortField: string,
  internalDeliveryFirst: boolean,
  resolveStatus: (value: string | undefined) => Pick<ResolvedStatusOption, 'stage'>,
) {
  const [field, dir] = sortField.split('_');

  const mult = dir === 'asc' ? 1 : -1;
  const leads = (o: SalesOrder) =>
    isOpenUrgentSalesOrder(o.extra?.isUrgent === true, resolveStatus(o.extra?.status).stage)
      ? 1
      : 0;
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

    if (internalDeliveryFirst) {
      const aExternal = a.extra?.isInternalDelivery === false ? 1 : 0;
      const bExternal = b.extra?.isInternalDelivery === false ? 1 : 0;
      if (aExternal !== bExternal) return aExternal - bExternal;
    }

    return (getSalesOrderReadyMs(a) - getSalesOrderReadyMs(b)) * mult;
  };
}
