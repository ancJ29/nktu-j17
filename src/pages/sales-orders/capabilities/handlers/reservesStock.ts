import { DEFAULT_LOCATION_CODE, type SalesOrderExtra } from '@/types';
import {
  getOwnReservedAtLocation,
  getProductLocationAvailability,
} from '@/utils/inventoryCommitment';
import {
  expandSetReservationItems,
  planReservation,
  type PlanFailure,
} from '@/utils/inventoryReservation';
import { getShortagePolicy } from '@/utils/permission';
import type { Handler, HandlerContext, HandlerPlanResult } from '../types';

export const reservesStockHandler: Handler = {
  id: 'reserve',
  plan(ctx: HandlerContext): HandlerPlanResult {
    const linkage = (ctx.order.extra as SalesOrderExtra | undefined)?.inventoryLinkage;

    if (getShortagePolicy() === 'block') {
      const failures: PlanFailure[] = [];

      const effectiveLines = expandSetReservationItems(
        ctx.order.items,
        ctx.productsByCode,
        ctx.inventoryByProduct,
        linkage?.reservedSnapshot,
      );
      for (const line of effectiveLines) {
        if (!line.productCode || line.quantity <= 0) continue;
        const product = ctx.productsByCode.get(line.productCode);
        if (!product) continue;
        const target = line.fromLocationCode || DEFAULT_LOCATION_CODE;
        const avail = getProductLocationAvailability(product, target, ctx.inventoryByProduct);

        const ownReserved = getOwnReservedAtLocation(product, target, linkage?.reservedSnapshot);
        const effectiveAvailable = avail.available + ownReserved;
        if (line.quantity > effectiveAvailable) {
          failures.push({
            kind: 'shortage',
            productCode: line.productCode,
            locationCode: target,
            requested: line.quantity,
            available: effectiveAvailable,
          });
        }
      }
      if (failures.length > 0) return { ok: false, failures };
    }

    const result = planReservation({
      action: 'reserve',
      so: ctx.order,
      productsByCode: ctx.productsByCode,
      inventoryByProduct: ctx.inventoryByProduct,
    });
    if (!result.ok) return { ok: false, failures: result.failures };
    return {
      ok: true,
      inventoryOps: [...result.plan.ops],
    };
  },
};
