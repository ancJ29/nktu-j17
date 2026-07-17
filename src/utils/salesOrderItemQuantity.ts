import type { SalesOrderItem } from '@/types';

export function getLinePhysicalQuantity(
  line: Pick<SalesOrderItem, 'quantity' | 'extraQuantity' | 'role'>,
): number {
  const extra = line.role ? 0 : (line.extraQuantity ?? 0);
  return line.quantity + (extra > 0 ? extra : 0);
}
