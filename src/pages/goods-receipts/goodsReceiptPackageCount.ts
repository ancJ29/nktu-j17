import type { GoodsReceiptItem } from '@/types';

export function packageCountOf(item: Pick<GoodsReceiptItem, 'packageCount'>): number | null {
  const n = item.packageCount;
  return typeof n === 'number' && n > 0 ? n : null;
}

export function showsPackageCount(
  items: readonly Pick<GoodsReceiptItem, 'packageCount'>[],
  printEnabled: boolean,
): boolean {
  return printEnabled || items.some((it) => packageCountOf(it) !== null);
}
