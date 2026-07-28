import { useMemo } from 'react';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import type { Product } from '@/types';
import { isNoInventoryProduct } from '@/utils/productSet';
import { convertUnit, getItemBaseUnit } from '@/utils/unitConversion';

export type InboundEntry = {
  totalBase: number;

  byUnit: Record<string, number>;

  draftCount: number;

  draftRefs: { id: string; receiptNumber: string; byUnit: Record<string, number> }[];

  unmappedCount: number;
};

const EMPTY_INDEX: ReadonlyMap<string, InboundEntry> = new Map();

export function useOpenInboundByProduct(): ReadonlyMap<string, InboundEntry> {
  const inventoryRows = useProductInventoryStore((s) => s.items);
  const products = useProductStore((s) => s.items);

  return useMemo(() => {
    if (inventoryRows.length === 0 || products.length === 0) return EMPTY_INDEX;

    const productByCode = new Map<string, Product>();
    for (const p of products) productByCode.set(p.code, p);

    const index = new Map<string, InboundEntry>();

    const refByGrPerProduct = new Map<string, Map<string, InboundEntry['draftRefs'][number]>>();

    for (const row of inventoryRows) {
      const expectedMap = row.extra?.expectedFromGoodsReceipt;
      if (!expectedMap) continue;
      const product = productByCode.get(row.itemCode);
      if (!product) continue;
      if (isNoInventoryProduct(product)) continue;
      const baseUnit = getItemBaseUnit(product);
      const allowedUnits = new Set(product.extra?.units ?? [product.unit]);
      const conversions = product.extra?.unitConversions ?? [];

      let entry = index.get(row.itemCode);
      if (!entry) {
        entry = {
          totalBase: 0,
          byUnit: {},
          draftCount: 0,
          draftRefs: [],
          unmappedCount: 0,
        };
        index.set(row.itemCode, entry);
      }

      let refsByGr = refByGrPerProduct.get(row.itemCode);
      if (!refsByGr) {
        refsByGr = new Map();
        refByGrPerProduct.set(row.itemCode, refsByGr);
      }

      for (const [grId, grEntry] of Object.entries(expectedMap)) {
        let ref = refsByGr.get(grId);
        if (!ref) {
          ref = { id: grId, receiptNumber: grEntry.receiptNumber, byUnit: {} };
          refsByGr.set(grId, ref);
          entry.draftRefs.push(ref);
          entry.draftCount += 1;
        }
        for (const [unit, qty] of Object.entries(grEntry.byUnit)) {
          if (qty === 0) continue;

          entry.byUnit[unit] = (entry.byUnit[unit] ?? 0) + qty;
          ref.byUnit[unit] = (ref.byUnit[unit] ?? 0) + qty;

          if (!allowedUnits.has(unit)) {
            entry.unmappedCount += 1;
            continue;
          }
          const converted = convertUnit(qty, unit, baseUnit, conversions);
          if (converted !== null) {
            entry.totalBase += converted;
          } else {
            entry.unmappedCount += 1;
          }
        }
      }
    }

    return index;
  }, [inventoryRows, products]);
}

export function useOpenInboundForProduct(productCode: string | undefined): InboundEntry | null {
  const index = useOpenInboundByProduct();
  if (!productCode) return null;
  return index.get(productCode) ?? null;
}
