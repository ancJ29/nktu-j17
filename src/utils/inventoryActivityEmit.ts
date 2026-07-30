import { logger } from '@credo/base-ui/utils';
import { useProductStore } from '@/stores/useProductStore';
import { logActivity } from './activityLogger';
import type { AppliedOp } from './inventoryReservation';

export type InventoryActivitySource = {
  kind: 'SO';
  id: string;
  label: string;
  suffix?: string;
};

export function emitInventoryActivityForApplied(
  applied: readonly AppliedOp[],
  source: InventoryActivitySource,
): void {
  if (applied.length === 0) return;
  const allProducts = useProductStore.getState().items;
  const productIdByCode = new Map<string, string>();
  for (const op of applied) {
    if (op.prevOnHand === op.nextOnHand) continue;
    let productId = productIdByCode.get(op.itemCode);
    if (productId === undefined) {
      const found = allProducts.find((p) => p.code === op.itemCode);
      if (found) {
        productId = found.id;
        productIdByCode.set(op.itemCode, productId);
      } else {
        logger.warn('[inventoryActivityEmit] unresolved product code — logging without target', {
          itemCode: op.itemCode,
          productCount: allProducts.length,
        });
      }
    }
    logActivity('productInventory.adjust', productId, {
      itemCode: op.itemCode,
      locationCode: op.locationCode,
      prevOnHand: op.prevOnHand,
      nextOnHand: op.nextOnHand,
      delta: op.nextOnHand - op.prevOnHand,
      source,
    });
  }
}
