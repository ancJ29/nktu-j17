import type { Product } from '@/types';

export function getProductDefaultUnitPrice(product: Pick<Product, 'price' | 'extra'>): number {
  const suggested = product.extra?.suggestedPrice;
  if (typeof suggested === 'number') return suggested;
  return product.price ?? 0;
}

export function getProductSuggestedPrice(
  product: Pick<Product, 'extra'> | undefined,
): number | undefined {
  const suggested = product?.extra?.suggestedPrice;
  return typeof suggested === 'number' ? suggested : undefined;
}

export function isBelowSuggestedPrice(
  product: Pick<Product, 'extra'> | undefined,
  unitPrice: number,
): boolean {
  const suggested = getProductSuggestedPrice(product);
  return suggested !== undefined && unitPrice < suggested;
}
