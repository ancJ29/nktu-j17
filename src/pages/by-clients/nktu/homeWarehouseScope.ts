import type { DeliveryRequest, SalesOrder, SalesOrderExtra } from '@/types';
import { readWarehouseStaff } from '@/pages/sales-orders/salesOrderWarehouseStaff';

const WAREHOUSE_DEPARTMENT_CODE = 'warehouse';

export const READY_STATUS = 'ready';

export type WarehouseScope =
  { readonly seeAll: true } | { readonly seeAll: false; readonly me: string };

export function resolveWarehouseScope(
  viewer: { me: string | null; department: string | null | undefined },
  module: { warehouseStaffOn: boolean; canViewAllAsWarehouse: boolean },
): WarehouseScope | null {
  if (!viewer.me || viewer.department !== WAREHOUSE_DEPARTMENT_CODE) return null;
  if (!module.warehouseStaffOn) return null;
  return module.canViewAllAsWarehouse ? { seeAll: true } : { seeAll: false, me: viewer.me };
}

function isMineOrUnassigned(
  extra: Pick<SalesOrderExtra, 'warehouseStaff'> | undefined,
  me: string,
): boolean {
  const staff = readWarehouseStaff(extra);
  return staff.length === 0 || staff.includes(me);
}

export function scopeWarehouseOrders(orders: SalesOrder[], scope: WarehouseScope): SalesOrder[] {
  if (scope.seeAll) return orders;
  return orders.filter(
    (o) => (o.extra?.status ?? '') === READY_STATUS || isMineOrUnassigned(o.extra, scope.me),
  );
}

export function scopeWarehouseRequests(
  requests: DeliveryRequest[],
  scope: WarehouseScope,
): DeliveryRequest[] {
  if (scope.seeAll) return requests;
  return requests.filter((d) => isMineOrUnassigned(d.extra, scope.me));
}
