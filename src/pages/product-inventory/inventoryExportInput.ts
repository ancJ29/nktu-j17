import type { ProductInventorySummary } from '@/types/product-inventory';

export function inventoryExportInput(filtered: ReadonlyArray<ProductInventorySummary>) {
  return {
    items: filtered.map((s) => s.product),
    rows: filtered.flatMap((s) => s.rows),
  };
}
