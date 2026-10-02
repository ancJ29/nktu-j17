import { logger } from '@credo/base-ui/utils';
import { useProductStore } from '@/stores/useProductStore';
import { logActivity } from './activityLogger';
import type { AppliedOp } from './inventoryReservation';
import { indexProductsByCode } from './productByCode';

export type InventoryActivitySource = {
  kind: 'SO';
  id: string;
  label: string;
  suffix?: string;
};

export function emitInventoryActivityForApplied(
  applied: readonly AppliedOp[],
  source: InventoryActivitySource,
  auditTag?: string,
): void {
  if (applied.length === 0) return;
  const allProducts = useProductStore.getState().items;
  const productsByCode = indexProductsByCode(allProducts);
  for (const op of applied) {
    if (op.prevOnHand === op.nextOnHand) continue;
    const productId = productsByCode.get(op.itemCode)?.id;
    if (productId === undefined) {
      logger.warn('[inventoryActivityEmit] unresolved product code — logging without target', {
        itemCode: op.itemCode,
        productCount: allProducts.length,
      });
    }
    logActivity('productInventory.adjust', productId, {
      itemCode: op.itemCode,
      locationCode: op.locationCode,
      prevOnHand: op.prevOnHand,
      nextOnHand: op.nextOnHand,
      delta: op.nextOnHand - op.prevOnHand,
      source,
      ...(auditTag && { auditTag }),
    });
  }
}
