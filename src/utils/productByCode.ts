import type { Product } from '@/types';

export function findProductByCode(products: readonly Product[], code: string): Product | undefined {
  let tombstone: Product | undefined;
  for (const p of products) {
    if (p.code !== code) continue;
    if (!p.extra?.isDeleted) return p;
    tombstone ??= p;
  }
  return tombstone;
}

export function indexProductsByCode(products: readonly Product[]): Map<string, Product> {
  const byCode = new Map<string, Product>();
  for (const p of products) {
    const held = byCode.get(p.code);
    if (!held || (held.extra?.isDeleted && !p.extra?.isDeleted)) byCode.set(p.code, p);
  }
  return byCode;
}
