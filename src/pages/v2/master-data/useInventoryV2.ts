import { useEffect, useMemo } from 'react';
import type { InventoryV2Store } from '@/stores/createInventoryV2Store';
import type { InventoryV2Row } from '@/types';

export function useInventoryV2(
  useStore: InventoryV2Store,
  enabled: boolean,
): {
  readonly byItemId: ReadonlyMap<string, InventoryV2Row>;
  readonly loading: boolean;

  readonly ready: boolean;
} {
  const items = useStore((s) => s.items);
  const loading = useStore((s) => s.loading);
  const initialized = useStore((s) => s.initialized);
  const loadAll = useStore((s) => s.loadAll);

  useEffect(() => {
    if (enabled && !initialized && !loading) void loadAll();
  }, [enabled, initialized, loading, loadAll]);

  const byItemId = useMemo(() => {
    const map = new Map<string, InventoryV2Row>();
    if (!enabled) return map;
    for (const row of items) map.set(row.itemId, row);
    return map;
  }, [enabled, items]);

  return { byItemId, loading: enabled && loading, ready: !enabled || initialized };
}
