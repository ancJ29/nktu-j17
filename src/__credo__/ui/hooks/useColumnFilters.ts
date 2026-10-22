import { useCallback, useMemo, useState } from 'react';

import type {
  DataTableColumnFilterConfig,
  DataTableColumnFilterLabels,
  DataTableFilterOption,
} from '../components/common/DataTableColumnFilter';

export type { DataTableColumnFilterConfig, DataTableColumnFilterLabels };

export const COLUMN_FILTER_BLANK = '\u0000blank';

export type ColumnFilterDef<T> = {
  
  key: string;
  
  getValue: (item: T) => string | string[] | null | undefined;
  
  getLabel?: (value: string) => string;
  
  blankLabel?: string;
  
  labels?: DataTableColumnFilterLabels;
};

export type ColumnFilterValues = Record<string, string[]>;

type UseColumnFiltersOptions = {
  
  value?: ColumnFilterValues;
  onChange?: (next: ColumnFilterValues) => void;
};

const EMPTY: string[] = [];

export function useColumnFilters<T>(
  source: readonly T[],
  defs: ColumnFilterDef<T>[],
  options: UseColumnFiltersOptions = {},
) {
  const [internal, setInternal] = useState<ColumnFilterValues>({});
  const values = options.value ?? internal;
  const setValues = options.onChange ?? setInternal;

  const valuesOf = useCallback((def: ColumnFilterDef<T>, item: T): string[] => {
    const raw = def.getValue(item);
    const list = (Array.isArray(raw) ? raw : [raw]).filter(
      (value): value is string => typeof value === 'string' && value !== '',
    );
    return list.length > 0 ? list : [COLUMN_FILTER_BLANK];
  }, []);

  const matches = useCallback(
    (def: ColumnFilterDef<T>, item: T, selected: string[]) =>
      selected.length === 0 || valuesOf(def, item).some((value) => selected.includes(value)),
    [valuesOf],
  );

  const predicate = useCallback(
    (item: T) => defs.every((def) => matches(def, item, values[def.key] ?? EMPTY)),
    [defs, matches, values],
  );

  const optionsByKey = useMemo(() => {
    const result: Record<string, DataTableFilterOption[]> = {};

    for (const def of defs) {
      const counts = new Map<string, number>();
      for (const item of source) {
        
        
        
        const passesOthers = defs.every(
          (other) => other.key === def.key || matches(other, item, values[other.key] ?? EMPTY),
        );
        if (!passesOthers) continue;
        for (const value of valuesOf(def, item)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }

      
      
      for (const value of values[def.key] ?? EMPTY) {
        if (!counts.has(value)) counts.set(value, 0);
      }

      const blankLabel = def.blankLabel ?? '—';
      result[def.key] = [...counts.entries()]
        .map(([value, count]) => ({
          value,
          label: value === COLUMN_FILTER_BLANK ? blankLabel : (def.getLabel?.(value) ?? value),
          count,
        }))
        .sort((a, b) => {
          if (a.value === COLUMN_FILTER_BLANK) return 1;
          if (b.value === COLUMN_FILTER_BLANK) return -1;
          
          
          
          const left = Number(a.value);
          const right = Number(b.value);
          if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
          return a.label.localeCompare(b.label, undefined, { numeric: true });
        });
    }

    return result;
  }, [defs, source, values, matches, valuesOf]);

  const setColumnValues = useCallback(
    (key: string, next: string[]) => {
      const merged = { ...values };
      
      
      if (next.length > 0) merged[key] = next;
      else delete merged[key];
      setValues(merged);
    },
    [values, setValues],
  );

  const clear = useCallback(() => setValues({}), [setValues]);

  const filterFor = useCallback(
    (key: string): DataTableColumnFilterConfig | undefined => {
      const def = defs.find((candidate) => candidate.key === key);
      if (!def) return undefined;
      return {
        options: optionsByKey[key] ?? [],
        selected: values[key] ?? EMPTY,
        onChange: (next: string[]) => setColumnValues(key, next),
        labels: def.labels,
      };
    },
    [defs, optionsByKey, values, setColumnValues],
  );

  return {
    values,
    setColumnValues,
    clear,
    predicate,
    filterFor,
    activeCount: Object.values(values).filter((selection) => selection.length > 0).length,
    hasActiveFilters: Object.values(values).some((selection) => selection.length > 0),
  };
}

export function serializeColumnFilters(values: ColumnFilterValues): string {
  const active = Object.entries(values).filter(([, selection]) => selection.length > 0);
  return active.length > 0 ? JSON.stringify(Object.fromEntries(active)) : '';
}

export function parseColumnFilters(raw: string | undefined | null): ColumnFilterValues {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: ColumnFilterValues = {};
    for (const [key, selection] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(selection)) {
        const values = selection.filter((value): value is string => typeof value === 'string');
        if (values.length > 0) result[key] = values;
      }
    }
    return result;
  } catch {
    
    return {};
  }
}
