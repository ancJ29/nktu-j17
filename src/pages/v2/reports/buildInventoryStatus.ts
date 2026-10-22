import type { InventoryV2Row } from '@/types';

export interface InventoryStatusItem {
  itemId: string;
  code: string;
  name: string;
  unit?: string;
  onHand: number;
  incoming: number;
  outgoing: number;

  available: number;
}

export interface InventoryStatus {
  items: InventoryStatusItem[];

  uncountedProducts: number;
}

export function buildInventoryStatus(
  stock: ReadonlyArray<InventoryV2Row>,
  products: ReadonlyArray<{ id: string; code?: string; name?: string; unit?: string }>,
): InventoryStatus {
  const productById = new Map(products.map((p) => [p.id, p]));
  const countedIds = new Set(stock.map((row) => row.itemId));

  const items = stock
    .map((row) => {
      const product = productById.get(row.itemId);
      const outgoing = row.outgoing ?? 0;
      return {
        itemId: row.itemId,

        code: product?.code ?? row.itemCode,
        name: product?.name ?? row.itemCode,
        ...(product?.unit ? { unit: product.unit } : {}),
        onHand: row.onHand,
        incoming: row.incoming ?? 0,
        outgoing,
        available: row.onHand - outgoing,
      };
    })
    .sort((a, b) => a.available - b.available || a.name.localeCompare(b.name, 'vi'));

  return {
    items,
    uncountedProducts: products.filter((p) => !countedIds.has(p.id)).length,
  };
}
