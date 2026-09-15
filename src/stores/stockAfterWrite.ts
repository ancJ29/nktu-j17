import { useMaterialInventoryV2Store } from './useMaterialInventoryV2Store';
import { useProductInventoryV2Store } from './useProductInventoryV2Store';

export function revalidateStockFor(record: {
  readonly items: ReadonlyArray<{ readonly itemType: 'product' | 'material' }>;
}): void {
  const kinds = new Set(record.items.map((line) => line.itemType));
  for (const [kind, store] of [
    ['product', useProductInventoryV2Store],
    ['material', useMaterialInventoryV2Store],
  ] as const) {
    if (!kinds.has(kind)) continue;
    const state = store.getState();
    if (state.initialized) void state.revalidate();
  }
}
