import type { Material, MaterialInventoryRow, WarehouseDocRow } from '@/types';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { materialToPackagingItem } from '@/utils/materialPackaging';
import { readRowBreakdown, recomputeOnHand } from '@/utils/inventoryMath';
import { logActivity } from '@/utils/activityLogger';

export async function postWarehouseDocInventory(
  doc: WarehouseDocRow,
  direction: 'in' | 'out',
  materialByCode: Map<string, Material>,
  invByCode: Map<string, MaterialInventoryRow>,
): Promise<void> {
  const sign = direction === 'in' ? 1 : -1;

  const deltaByMaterial = new Map<string, Map<string, number>>();
  for (const l of doc.extra.lines ?? []) {
    const material = materialByCode.get(l.itemCode);
    if (!material) continue;
    const unit = l.unit || material.extra?.units?.[0] || '';
    const qty = Number(l.quantity) || 0;
    if (!unit || qty === 0) continue;
    const byUnit = deltaByMaterial.get(l.itemCode) ?? new Map<string, number>();
    byUnit.set(unit, (byUnit.get(unit) ?? 0) + sign * qty);
    deltaByMaterial.set(l.itemCode, byUnit);
  }

  const store = useMaterialInventoryStore.getState();
  const code = doc.extra.code;

  for (const [itemCode, unitDeltas] of deltaByMaterial) {
    const material = materialByCode.get(itemCode)!;
    const baseUnit = material.extra?.units?.[0] ?? '';
    const packagingItem = materialToPackagingItem(material);
    const row = invByCode.get(itemCode);
    const prevOnHand = row?.onHand ?? 0;

    const next = row ? readRowBreakdown(row, baseUnit) : {};
    for (const [unit, delta] of unitDeltas) {
      const q = (next[unit] ?? 0) + delta;
      if (q === 0) delete next[unit];
      else next[unit] = q;
    }
    const nextOnHand = recomputeOnHand(packagingItem, next);

    if (row) {
      await store.updateSafely({
        id: row.id,
        version: row.version,
        patch: { onHand: nextOnHand, extra: { ...row.extra, onHandByUnit: next } },
      });
    } else {
      await store.createSafely({
        patch: { itemCode, onHand: nextOnHand, extra: { onHandByUnit: next } },
      });
    }

    logActivity('materialInventory.adjust', material.id, {
      prevOnHand,
      nextOnHand,
      delta: nextOnHand - prevOnHand,
      source: { kind: direction === 'in' ? 'WR' : 'WDN', id: doc.id, label: code },
    });
  }
}
