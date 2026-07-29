import {
  LIST_LAZY_RENDER_CHUNK,
  LIST_LAZY_RENDER_THRESHOLD,
  LIST_PAGINATION_DEFAULT,
} from '@/config/listDefaults';
import { useDebouncedValue } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseListFilterConfig<T, F extends Record<string, unknown>> = {
  shouldPagination?: boolean;

  pageSize?: number;

  searchFields?: (item: T) => (string | undefined | null)[];

  filters?: F;

  filterFn?: (item: T, filters: F) => boolean;

  searchDelay?: number;

  search?: string;
  onSearchChange?: (value: string) => void;

  page?: number;
  onPageChange?: (page: number) => void;

  lazyKey?: string;
};

const defaultShouldPagination = LIST_PAGINATION_DEFAULT;

const lazyRenderLimits = new Map<string, number>();

export function useListFilter<T, F extends Record<string, unknown> = Record<string, unknown>>(
  items: T[],
  config: UseListFilterConfig<T, F> = {},
) {
  const {
    pageSize: initialPageSize = 20,
    searchFields,
    filters = {} as F,
    filterFn,
    searchDelay = 200,
    search: controlledSearch,
    onSearchChange,
    page: controlledPage,
    onPageChange,
    lazyKey,
  } = config;

  const shouldPagination = config.shouldPagination ?? defaultShouldPagination;

  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [pageSize, setPageSize] = useState(shouldPagination ? initialPageSize : 100000);

  const lazyEligible = Boolean(lazyKey) && !shouldPagination;
  const [renderLimit, setRenderLimit] = useState(() =>
    lazyKey ? (lazyRenderLimits.get(lazyKey) ?? LIST_LAZY_RENDER_CHUNK) : LIST_LAZY_RENDER_CHUNK,
  );
  useEffect(() => {
    if (lazyKey) lazyRenderLimits.set(lazyKey, renderLimit);
  }, [lazyKey, renderLimit]);
  const loadMore = useCallback(() => {
    setRenderLimit((current) => current + LIST_LAZY_RENDER_CHUNK);
  }, []);

  const search = controlledSearch ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;
  const [debouncedSearch] = useDebouncedValue(search, searchDelay);
  const page = controlledPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;

  const filterValues = JSON.stringify(filters);

  const prevResetKeyRef = useRef<string | null>(null);

  const setPageRef = useRef(setPage);
  useEffect(() => {
    setPageRef.current = setPage;
  });
  useEffect(() => {
    const resetKey = JSON.stringify([debouncedSearch, filterValues, pageSize]);
    const previous = prevResetKeyRef.current;
    prevResetKeyRef.current = resetKey;

    if (previous === null || previous === resetKey) return;

    setPageRef.current(1);

    setRenderLimit(LIST_LAZY_RENDER_CHUNK);
  }, [debouncedSearch, filterValues, pageSize]);

  const filtered = useMemo(() => {
    let result = items;

    if (filterFn) {
      result = result.filter((item) => filterFn(item, filters));
    }

    if (debouncedSearch && searchFields) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((item) =>
        searchFields(item).some((field) => field?.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [items, filters, debouncedSearch, filterFn, searchFields]);

  const totalPages = shouldPagination ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;

  useEffect(() => {
    if (filtered.length > 0 && page > totalPages) {
      setPageRef.current(totalPages);
    }
  }, [filtered.length, totalPages, page]);

  const lazyRender = lazyEligible && filtered.length > LIST_LAZY_RENDER_THRESHOLD;

  const paginated = useMemo(() => {
    if (lazyRender) return filtered.slice(0, renderLimit);
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize, lazyRender, renderLimit]);

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtered,
    paginated,
    totalPages,
    totalItems: filtered.length,

    hasMore: lazyRender && filtered.length > paginated.length,
    loadMore,
  };
}
