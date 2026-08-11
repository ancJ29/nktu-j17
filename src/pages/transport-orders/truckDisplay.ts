import { useMemo } from 'react';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import type { Employee, TruckAssetRow } from '@/types';

export function truckNameWithPlate(name: string, plate: string | undefined | null): string {
  const trimmed = plate?.trim();
  return trimmed ? `${name} · ${trimmed}` : name;
}

export function truckOptionLabel(truck: Pick<TruckAssetRow, 'name' | 'code' | 'extra'>): string {
  const base = truckNameWithPlate(truck.name, truck.extra?.plateNumber);
  return truck.code ? `${base} (${truck.code})` : base;
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

export function useTruckTypeOf(): (truckId: string | undefined | null) => string | undefined {
  const items = useTruckAssetStore((s) => s.items);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const tr of items) {
      const type = tr.extra?.truckType?.trim();
      if (type) map.set(tr.id, type);
    }
    return (id) => (id ? map.get(id) : undefined);
  }, [items]);
}

export function useDriverWithPlate(): (employee: Pick<Employee, 'name' | 'extra'>) => string {
  const plateOf = useTruckPlate();
  return (employee) => truckNameWithPlate(employee.name, plateOf(employee.extra?.truckAssetId));
}
