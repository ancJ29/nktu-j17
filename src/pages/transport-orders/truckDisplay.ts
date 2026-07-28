import { useMemo } from 'react';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';

export function truckNameWithPlate(name: string, plate: string | undefined | null): string {
  const trimmed = plate?.trim();
  return trimmed ? `${name} · ${trimmed}` : name;
}

export function useTruckPlate(): (truckId: string | undefined | null) => string | undefined {
  const items = useTruckAssetStore((s) => s.items);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const tr of items) {
      const plate = tr.extra?.plateNumber?.trim();
      if (plate) map.set(tr.id, plate);
    }
    return (id) => (id ? map.get(id) : undefined);
  }, [items]);
}
