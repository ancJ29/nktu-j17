import type { SalesOrderExtra } from '@/types';
import { planReservation, planShipFromLinkage } from '@/utils/inventoryReservation';
import type { Handler, HandlerContext, HandlerPlanResult } from '../types';

export const shipsStockHandler: Handler = {
  id: 'ship',
  plan(ctx: HandlerContext): HandlerPlanResult {
    const linkage = (ctx.order.extra as SalesOrderExtra | undefined)?.inventoryLinkage;
    const snapshot = linkage?.state === 'reserved' ? linkage.reservedSnapshot : undefined;

    const result =
      snapshot && snapshot.length > 0
        ? planShipFromLinkage({
            snapshot,
            so: ctx.order,
            productsByCode: ctx.productsByCode,
            inventoryByProduct: ctx.inventoryByProduct,
          })
        : planReservation({
            action: 'ship',
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
