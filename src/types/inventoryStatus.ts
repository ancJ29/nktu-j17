export type InventorySecondaryStatus = 'outOfStock' | 'mustOrder' | 'ok';

export const INVENTORY_SECONDARY_STATUSES: readonly InventorySecondaryStatus[] = [
  'outOfStock',
  'mustOrder',
  'ok',
];

export function deriveSecondaryStatus(
  onHand: number,
  forecasted: number,
  min: number | undefined,
): InventorySecondaryStatus {
  if (onHand <= 0) return 'outOfStock';
  if (typeof min === 'number' && forecasted <= min) return 'mustOrder';
  return 'ok';
}
