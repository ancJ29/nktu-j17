import { deriveSecondaryStatus, type InventorySecondaryStatus } from '@/types/inventoryStatus';
import type { InventoryV2Row } from '@/types';

export function forecastOf(stock: InventoryV2Row | undefined): number {
  return (stock?.onHand ?? 0) + (stock?.incoming ?? 0) - (stock?.outgoing ?? 0);
}

export function stockLevelOf(config: {
  readonly stock: InventoryV2Row | undefined;
  readonly min?: number | undefined;
  readonly alertsOff?: boolean;
}): InventorySecondaryStatus {
  const { stock, min, alertsOff } = config;
  if (alertsOff) return 'ok';
  return deriveSecondaryStatus(stock?.onHand ?? 0, forecastOf(stock), min);
}
