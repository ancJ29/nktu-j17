import type { DateTimeInput } from '@credo/kits/types';
import type { TransportOrder } from '@/types';

export function orderPlanAt(order: TransportOrder): DateTimeInput | undefined {
  const route = order.route;
  return route?.pickupAt ?? route?.stuffingAt ?? route?.dropoffAt;
}

export function orderPlanDate(order: TransportOrder): DateTimeInput {
  return orderPlanAt(order) ?? order.entryDate;
}

export function orderPlanSortKey(order: TransportOrder): number {
  const value = orderPlanDate(order);
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
