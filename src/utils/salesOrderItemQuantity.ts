import type { SalesOrderItem } from '@/types';

export function getLinePhysicalQuantity(
  line: Pick<SalesOrderItem, 'quantity' | 'extraQuantity' | 'role'>,
): number {
  const extra = line.role ? 0 : (line.extraQuantity ?? 0);
  return line.quantity + (extra > 0 ? extra : 0);
}

export function getSalesOrderTotalQuantity(
  items: readonly Pick<SalesOrderItem, 'quantity' | 'role'>[],
): number {
  return items.reduce(
    (sum, line) => (line.role === 'set-component' ? sum : sum + (line.quantity || 0)),
    0,
  );
}
