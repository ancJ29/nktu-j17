import { LIST_PAGINATION_DEFAULT } from '@/config/listDefaults';
import { useDebouncedValue } from '@mantine/hooks';
import { useEffect, useMemo, useRef, useState } from 'react';

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
};

const defaultShouldPagination = LIST_PAGINATION_DEFAULT;

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
  } = config;

  const shouldPagination = config.shouldPagination ?? defaultShouldPagination;

  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [pageSize, setPageSize] = useState(shouldPagination ? initialPageSize : 100000);

  const search = controlledSearch ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;
  const [debouncedSearch] = useDebouncedValue(search, searchDelay);
  const page = controlledPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;

  const filterValues = JSON.stringify(filters);

  const isFirstRun = useRef(true);

  const setPageRef = useRef(setPage);
  useEffect(() => {
    setPageRef.current = setPage;
  });
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setPageRef.current(1);
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

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

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
  };
}
