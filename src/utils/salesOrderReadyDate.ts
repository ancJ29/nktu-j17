import type { DateTimeInput } from '@credo/kits/types';
import type { SalesOrder } from '@/types';

export function getSalesOrderReadyDate(order: SalesOrder): DateTimeInput {
  return order.extra?.readyAt ?? order.createdAt;
}

export function getSalesOrderReadyMs(order: SalesOrder): number {
  const ms = new Date(getSalesOrderReadyDate(order)).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
