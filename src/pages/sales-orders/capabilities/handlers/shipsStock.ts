import { planReservation } from '@/utils/inventoryReservation';
import type { Handler, HandlerContext, HandlerPlanResult } from '../types';

export const shipsStockHandler: Handler = {
  id: 'ship',
  plan(ctx: HandlerContext): HandlerPlanResult {
    const result = planReservation({
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
