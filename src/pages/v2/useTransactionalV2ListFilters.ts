import { useCallback, useEffect, useMemo } from 'react';
import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import type { DayRange } from './anchorDay';
import type { DateRangeValue } from '@/types/date-range';
import { businessDateString } from '@/utils/code';
import {
  type SerializedDateRange,
  defaultLastNDaysRange,
  isDefaultLastNDaysRange,
  restoreDateRange,
  serializeDateRange,
} from '@/utils/listFilterDateRange';
import {
  isDefaultStatusSelection,
  shouldEncodeStatusSelection,
} from '@/utils/listFilterStatusDefault';

type TransactionalV2UrlState = {
  s?: string[];
  m?: Record<string, string[]>;
  b?: string[];
  q?: string;
  d?: SerializedDateRange;
  a?: DayRange;
};

export type TransactionalV2FilterOptions<M extends string, F extends string> = {
  readonly cacheKey: string;

  readonly defaultStatuses: readonly string[];
  readonly rangeDays: number;

  readonly multiKeys?: readonly M[];
  readonly flagKeys?: readonly F[];

  readonly setStoreRange: (range: { from: string; to: string }) => boolean;
  readonly loadAll: () => Promise<void>;
  readonly forceRefresh: () => Promise<void>;
};

const EMPTY_VALUES: readonly string[] = [];

function storeWindowOf(range: DateRangeValue, rangeDays: number): { from: string; to: string } {
  const fallback = defaultLastNDaysRange(rangeDays);
  const day = (value: Date | null, spare: Date | null): string =>
    businessDateString(new Date(value ?? spare ?? new Date()).getTime());
  return { from: day(range.from, fallback.from), to: day(range.to, fallback.to) };
}

export function useTransactionalV2ListFilters<M extends string = never, F extends string = never>(
  options: TransactionalV2FilterOptions<M, F>,
) {
  const { cacheKey, defaultStatuses, rangeDays, setStoreRange, loadAll, forceRefresh } = options;
  const multiKeys = options.multiKeys ?? (EMPTY_VALUES as readonly M[]);
  const flagKeys = options.flagKeys ?? (EMPTY_VALUES as readonly F[]);

  const compactState = useCallback(
    (state: TransactionalV2UrlState): TransactionalV2UrlState => {
      const result: TransactionalV2UrlState = {};

      if (shouldEncodeStatusSelection(state.s, defaultStatuses)) result.s = state.s;
      const multi = Object.fromEntries(
        Object.entries(state.m ?? {}).filter(([, values]) => values.length > 0),
      );
      if (Object.keys(multi).length > 0) result.m = multi;
      if (state.b && state.b.length > 0) result.b = state.b;
      if (state.q) result.q = state.q;
      if (state.d?.preset) result.d = state.d;
      if (state.a?.from && state.a?.to) result.a = state.a;
      return result;
    },
    [defaultStatuses],
  );

  const {
    state,
    updateState,
    clearFilters: dropState,
  } = useUrlBlobFilters<TransactionalV2UrlState>({ cacheKey, compactState });

  const statuses = useMemo(() => state.s ?? [...defaultStatuses], [state.s, defaultStatuses]);

  const multi = useMemo(() => {
    const bag = state.m ?? {};
    return Object.fromEntries(multiKeys.map((key) => [key, bag[key] ?? []])) as Record<M, string[]>;
  }, [state.m, multiKeys]);

  const flags = useMemo(() => {
    const on = new Set(state.b ?? []);
    return Object.fromEntries(flagKeys.map((key) => [key, on.has(key)])) as Record<F, boolean>;
  }, [state.b, flagKeys]);

  const dateRange = useMemo(
    () => restoreDateRange(state.d, defaultLastNDaysRange(rangeDays)),
    [state.d, rangeDays],
  );

  const anchorRange: DayRange | undefined = state.a;
  const clearAnchorRange = useCallback(() => {
    updateState({ a: undefined, d: undefined });
    setStoreRange(storeWindowOf(defaultLastNDaysRange(rangeDays), rangeDays));
    void forceRefresh();
  }, [updateState, rangeDays, setStoreRange, forceRefresh]);

  const storeWindow = useMemo(() => storeWindowOf(dateRange, rangeDays), [dateRange, rangeDays]);
  useEffect(() => {
    if (setStoreRange(storeWindow)) void forceRefresh();
    else void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatuses = useCallback((values: string[]) => updateState({ s: values }), [updateState]);

  const setMulti = useCallback(
    (key: M, values: string[]) => updateState({ m: { ...(state.m ?? {}), [key]: values } }),
    [updateState, state.m],
  );

  const setFlag = useCallback(
    (key: F, on: boolean) => {
      const next = new Set(state.b ?? []);
      if (on) next.add(key);
      else next.delete(key);
      updateState({ b: [...next] });
    },
    [updateState, state.b],
  );

  const setSearch = useCallback(
    (value: string) => updateState({ q: value || undefined }),
    [updateState],
  );

  const setDateRange = useCallback(
    (next: DateRangeValue) => {
      const effective = next.from && next.to ? next : defaultLastNDaysRange(rangeDays);
      updateState({ d: serializeDateRange(effective) });
      setStoreRange(storeWindowOf(effective, rangeDays));
      void forceRefresh();
    },
    [updateState, rangeDays, setStoreRange, forceRefresh],
  );

  const statusesAreDefault = useMemo(
    () => isDefaultStatusSelection(statuses, defaultStatuses),
    [statuses, defaultStatuses],
  );
  const dateRangeIsDefault = isDefaultLastNDaysRange(dateRange, rangeDays);

  const hasActiveFilters =
    state.q !== undefined ||
    !statusesAreDefault ||
    !dateRangeIsDefault ||
    anchorRange !== undefined ||
    Object.values<string[]>(multi).some((values) => values.length > 0) ||
    Object.values<boolean>(flags).some(Boolean);

  const clearFilters = useCallback(() => {
    dropState();
    if (!dateRangeIsDefault) {
      setStoreRange(storeWindowOf(defaultLastNDaysRange(rangeDays), rangeDays));
      void forceRefresh();
    }
  }, [dropState, dateRangeIsDefault, rangeDays, setStoreRange, forceRefresh]);

  return {
    statuses,
    setStatuses,

    statusesAreDefault,
    multi,
    setMulti,
    flags,
    setFlag,
    dateRange,
    setDateRange,
    dateRangeIsDefault,

    anchorRange,
    clearAnchorRange,
    search: state.q ?? '',
    setSearch,
    hasActiveFilters,
    clearFilters,
  };
}
