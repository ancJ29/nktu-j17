import type { DeliveryRequest, Product, SalesOrder } from '@/types';
import type { InventoryLinkage } from '@/types/sales-order';
import type { ProductInventoryRow } from '@/types/product-inventory';
import {
  planReleaseFromLinkage,
  planUnshipFromLinkage,
  type PlanFailure,
  type ReservationPlan,
} from './inventoryReservation';
import { netRestockedReturns } from './returnRestockNetting';

export type CancelRollback =
  | { kind: 'none' }
  /** Delivered, but the app holds no record of what shipped: adjusted by hand. */
  | { kind: 'no-record' }
  | { kind: 'release'; plan: ReservationPlan }
  | { kind: 'unship'; plan: ReservationPlan }
  | { kind: 'fail'; failures: PlanFailure[] };

export function planCancelRollback(inputs: {
  linkage: InventoryLinkage | undefined;
  so: SalesOrder;
  productsByCode: Map<string, Product>;
  inventoryByProduct: Map<string, ProductInventoryRow[]>;

  returns: readonly DeliveryRequest[];
}): CancelRollback {
  const { linkage, so, productsByCode, inventoryByProduct, returns } = inputs;

  if (linkage?.state === 'reserved' && (linkage.reservedSnapshot?.length ?? 0) > 0) {
    const r = planReleaseFromLinkage({
      snapshot: linkage.reservedSnapshot!,
      so,
      productsByCode,
      inventoryByProduct,
    });
    return r.ok ? { kind: 'release', plan: r.plan } : { kind: 'fail', failures: r.failures };
  }

  if (linkage?.state === 'shipped') {
    const shipped = linkage.shippedSnapshot ?? [];
    if (shipped.length === 0) return { kind: 'no-record' };
    const net = netRestockedReturns(shipped, returns, productsByCode);
    if (!net.ok) {
      return {
        kind: 'fail',
        failures: [{ kind: 'unknown-unit', productCode: net.productCode, unit: net.unit }],
      };
    }
    if (net.snapshot.length === 0) {
      return { kind: 'unship', plan: { action: 'unship', ops: [], skippedLines: [] } };
    }
    const r = planUnshipFromLinkage({
      snapshot: net.snapshot,
      so,
      productsByCode,
      inventoryByProduct,
    });
    return r.ok ? { kind: 'unship', plan: r.plan } : { kind: 'fail', failures: r.failures };
  }

  return { kind: 'none' };
}

export function gaveShippedStockBackOnCancel(so: SalesOrder | undefined): boolean {
  const l = so?.extra?.inventoryLinkage;
  return l?.state === 'released' && l.lastTransition?.via.kind === 'cancel-unship';
}
