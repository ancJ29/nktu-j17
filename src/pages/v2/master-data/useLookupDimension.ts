import { useCallback, useMemo } from 'react';
import type { SelectFilter } from '@/components/DesktopFilterBar';
import { useLookupV2Options } from '@/hooks/useLookupV2Options';

export function useLookupDimension<Row>(config: {
  readonly key: string;

  readonly category: string;

  readonly valueOf: (row: Row) => string | undefined;

  readonly title: string;
  readonly placeholder: string;
  readonly values: Readonly<Record<string, string>>;
  readonly setValue: (key: string, value: string | null) => void;
  readonly w?: number;
}): {
  readonly filter: SelectFilter | null;
  readonly predicate: (row: Row) => boolean;
} {
  const { key, category, valueOf, title, placeholder, values, setValue, w = 200 } = config;
  const options = useLookupV2Options(category);
  const value = values[key] ?? null;

  const filter = useMemo<SelectFilter | null>(
    () =>
      options.length === 0
        ? null
        : {
            value,
            onChange: (next: string | null) => setValue(key, next),
            data: options,
            placeholder,
            title,
            searchable: true,
            w,
          },
    [options, value, key, setValue, placeholder, title, w],
  );

  const predicate = useCallback(
    (row: Row) => value === null || (valueOf(row) ?? '') === value,
    [value, valueOf],
  );

  return { filter, predicate };
}
