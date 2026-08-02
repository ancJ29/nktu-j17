import type { Product, ProductSetItem, SalesOrderItem } from '@/types';

export function isProductSet(p: Pick<Product, 'extra'> | undefined | null): boolean {
  return !!p?.extra?.setItems?.length;
}

export function getSetMode(p: Pick<Product, 'extra'> | undefined | null): 'bundle' | 'breakdown' {
  return p?.extra?.setMode === 'breakdown' ? 'breakdown' : 'bundle';
}

export function isBundleSet(p: Pick<Product, 'extra'> | undefined | null): boolean {
  return isProductSet(p) && getSetMode(p) === 'bundle';
}

export function isBreakdownSet(p: Pick<Product, 'extra'> | undefined | null): boolean {
  return isProductSet(p) && getSetMode(p) === 'breakdown';
}

export function isNoInventoryProduct(p: Pick<Product, 'extra'> | undefined | null): boolean {
  return p?.extra?.noInventory === true;
}

export function isHiddenFromInventoryListProduct(
  p: Pick<Product, 'extra'> | undefined | null,
): boolean {
  return p?.extra?.hiddenFromInventoryList === true;
}

export function getSetItems(p: Pick<Product, 'extra'> | undefined | null): ProductSetItem[] {
  return p?.extra?.setItems ?? [];
}

export function groupLinesBySet<T extends Pick<SalesOrderItem, 'groupId'>>(
  items: readonly T[],
): Array<{ groupId: string | null; lines: T[] }> {
  const buckets: Array<{ groupId: string | null; lines: T[] }> = [];
  const byId = new Map<string, T[]>();
  items.forEach((line, idx) => {
    if (line.groupId) {
      const existing = byId.get(line.groupId);
      if (existing) {
        existing.push(line);
      } else {
        const lines: T[] = [line];
        byId.set(line.groupId, lines);
        buckets.push({ groupId: line.groupId, lines });
      }
    } else {
      buckets.push({ groupId: null, lines: [line] });
    }

    void idx;
  });
  return buckets;
}

export function newSetGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
