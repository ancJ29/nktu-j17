import { useEffect, useMemo } from 'react';
import { useLookupStore } from '@/stores/useLookupStore';

export type LookupOption = { value: string; label: string };

export function useLookupOptions(category: string): LookupOption[] {
  const items = useLookupStore((s) => s.items);
  const initialized = useLookupStore((s) => s.initialized);
  const loading = useLookupStore((s) => s.loading);
  const error = useLookupStore((s) => s.error);
  const loadAll = useLookupStore((s) => s.loadAll);

  useEffect(() => {
    if (!initialized && !loading && !error) void loadAll();
  }, [initialized, loading, error, loadAll]);

  return useMemo(() => {
    return items
      .filter((l) => l.category === category && l.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map((l) => ({ value: l.value, label: l.label }));
  }, [items, category]);
}

export function useLookupLabels(category: string): Map<string, string> {
  const items = useLookupStore((s) => s.items);
  const initialized = useLookupStore((s) => s.initialized);
  const loading = useLookupStore((s) => s.loading);
  const error = useLookupStore((s) => s.error);
  const loadAll = useLookupStore((s) => s.loadAll);

  useEffect(() => {
    if (!initialized && !loading && !error) void loadAll();
  }, [initialized, loading, error, loadAll]);

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const l of items) {
      if (l.category !== category) continue;
      map.set(l.value, l.label);
    }
    return map;
  }, [items, category]);
}

export function lookupLabelOf(
  map: Map<string, string>,
  value: string | undefined,
  fallback: string = '—',
): string {
  if (!value) return fallback;
  return map.get(value) ?? value;
}
