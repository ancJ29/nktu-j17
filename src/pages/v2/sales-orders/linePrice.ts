import type { ProductV2Row } from '@/types';
import type { SalesOrderV2ItemType } from '@/types/sales-order-v2';

export function catalogUnitPrice(
  itemType: SalesOrderV2ItemType,
  itemId: string,
  products: readonly ProductV2Row[],
  canSeePrice: boolean,
): number | undefined {
  if (!canSeePrice || itemType !== 'product') return undefined;
  return products.find((product) => product.id === itemId)?.price;
}
