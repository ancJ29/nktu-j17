

import { cMngtConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import type { DeliveryRequest, Product, ProductInventoryExtra, ProductInventoryRow } from '@/types';
import { DEFAULT_LOCATION_CODE } from '@/types/location';
import { applyDelta, readRowBreakdown, type OnHandByUnit } from './inventoryMath';
import { logActivity } from './activityLogger';
import { getItemBaseUnit } from './unitConversion';
import { isNoInventoryProduct } from './productSet';
import { getCurrentEmployeeId } from '@/hooks';

export type ReturnRestockResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

export async function applyReturnRestock(dr: DeliveryRequest): Promise<ReturnRestockResult> {
  const result: ReturnRestockResult = { attempted: 0, succeeded: 0, failed: 0, errors: [] };

  
  
  
  const byRow = new Map<string, { itemCode: string; locationCode: string; deltas: OnHandByUnit }>();
  for (const line of dr.items) {
    if (line.quantity <= 0) continue;
    const locationCode = line.fromLocationCode || DEFAULT_LOCATION_CODE;
    const key = `${line.productCode}::${locationCode}`;
    const entry = byRow.get(key) ?? { itemCode: line.productCode, locationCode, deltas: {} };
    entry.deltas[line.unit] = (entry.deltas[line.unit] ?? 0) + line.quantity;
    byRow.set(key, entry);
  }
  if (byRow.size === 0) return result;

  const productStore = useProductStore.getState();
  if (!productStore.initialized) await productStore.loadAll();
  const products = useProductStore.getState().items;
  const findProduct = (code: string): Product | undefined => products.find((p) => p.code === code);

  
  const snap = await cMngtConnector.getAllProductInventory<ProductInventoryExtra>();
  const rows: ProductInventoryRow[] = snap.changed
    ? snap.productInventory
    : useProductInventoryStore.getState().items;

  const lastUpdatedBy =
    getCurrentEmployeeId() ?? useAuthStore.getState().user?.email ?? 'delivery-request';
  const note = `Return ${dr.requestNumber}`;

  for (const { itemCode, locationCode, deltas } of byRow.values()) {
    result.attempted += 1;
    const product = findProduct(itemCode);
    if (!product) {
      result.failed += 1;
      result.errors.push(`${itemCode} — product master-data not found`);
      continue;
    }
    
    if (isNoInventoryProduct(product)) {
      result.attempted -= 1;
      continue;
    }
    const baseUnit = getItemBaseUnit(product);
    const existing = rows.find((r) => r.itemCode === itemCode && r.locationCode === locationCode);

    try {
      if (existing) {
        const breakdown = readRowBreakdown(existing, baseUnit);
        const applied = applyDelta(product, breakdown, deltas);
        if (!applied.ok) {
          result.failed += 1;
          result.errors.push(
            applied.reason === 'unknown-unit'
              ? `${itemCode} — unknown unit ${applied.unit}`
              : `${itemCode} — invalid result (${applied.unit})`,
          );
          continue;
        }
        await useProductInventoryStore.getState().updateSafely({
          id: existing.id,
          version: existing.version,
          patch: {
            onHand: applied.onHand,
            extra: {
              ...existing.extra,
              unit: baseUnit,
              onHandByUnit: applied.onHandByUnit,
              lastUpdatedBy,
            } as ProductInventoryExtra,
          },
        });
        logActivity('productInventory.adjust', product.id, {
          locationCode,
          prevOnHand: existing.onHand,
          nextOnHand: applied.onHand,
          delta: applied.onHand - existing.onHand,
          note,
        });
      } else {
        
        const applied = applyDelta(product, {}, deltas);
        if (!applied.ok) {
          result.failed += 1;
          result.errors.push(
            applied.reason === 'unknown-unit'
              ? `${itemCode} — unknown unit ${applied.unit}`
              : `${itemCode} — invalid seed`,
          );
          continue;
        }
        await useProductInventoryStore.getState().createSafely({
          patch: {
            itemCode,
            locationCode,
            onHand: applied.onHand,
            extra: {
              unit: baseUnit,
              onHandByUnit: applied.onHandByUnit,
              lastUpdatedBy,
            } as ProductInventoryExtra,
          },
        });
        logActivity('productInventory.create', product.id, {
          locationCode,
          onHand: applied.onHand,
          note,
        });
      }
      result.succeeded += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(`${itemCode} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await useProductInventoryStore.getState().forceRefresh();
  return result;
}
