import type { Product } from '@/types';

type WarehouseMemoLine = {
  productCode: string;
  productName?: string;
};

export function buildSalesOrderWarehouseMemo(
  items: readonly WarehouseMemoLine[],
  productByCode: ReadonlyMap<string, Product>,
): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const item of items) {
    const code = item.productCode?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const product = productByCode.get(code);
    const memo = product?.extra?.warehouseMemo?.trim();
    if (!memo) continue;

    const name = item.productName?.trim() || product?.name?.trim() || code;
    lines.push(`${name}: ${memo}`);
  }

  return lines.join('\n');
}
