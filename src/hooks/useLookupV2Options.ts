

import { useEffect, useMemo } from 'react';
import { useLookupV2Store } from '@/stores/useLookupV2Store';
import type { LookupOption } from './useLookupOptions';

export function useLookupV2Options(category: string): LookupOption[] {
  const items = useLookupV2Store((s) => s.items);
  const initialized = useLookupV2Store((s) => s.initialized);
  const loading = useLookupV2Store((s) => s.loading);
  const error = useLookupV2Store((s) => s.error);
  const loadAll = useLookupV2Store((s) => s.loadAll);

  useEffect(() => {
    if (!initialized && !loading && !error) void loadAll();
  }, [initialized, loading, error, loadAll]);

  return useMemo(() => {
    return items
      .filter((l) => l.category === category && l.isActive && !l.extra?.isDeleted)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map((l) => ({ value: l.value, label: l.label }));
  }, [items, category]);
}

export function useLookupV2Labels(category: string): Map<string, string> {
  const items = useLookupV2Store((s) => s.items);
  const initialized = useLookupV2Store((s) => s.initialized);
  const loading = useLookupV2Store((s) => s.loading);
  const error = useLookupV2Store((s) => s.error);
  const loadAll = useLookupV2Store((s) => s.loadAll);

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
