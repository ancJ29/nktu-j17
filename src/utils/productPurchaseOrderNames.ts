import type { ProductExtra } from '@/types';

export type PurchaseOrderNames = { zh: string; en: string };

export function purchaseOrderNamesOf(extra: ProductExtra | undefined): PurchaseOrderNames {
  return { zh: extra?.nameZh?.trim() ?? '', en: extra?.nameEn?.trim() ?? '' };
}

export function showsPurchaseOrderNames(
  extra: ProductExtra | undefined,
  printEnabled: boolean,
): boolean {
  const { zh, en } = purchaseOrderNamesOf(extra);
  return printEnabled || !!zh || !!en;
}
