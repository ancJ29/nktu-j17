

import { useCallback, useMemo } from 'react';
import { type DateRangeValue } from '@/types/date-range';
import {
  EMPTY_DATE_RANGE,
  type SerializedDateRange,
  defaultLastNDaysRange,
  ensureValidDateRange,
  isDefaultLastNDaysRange,
  isInDateRange,
  restoreDateRange,
  serializeDateRange,
} from '@/utils/listFilterDateRange';
import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import type { GoodsReceipt } from '@/types';

const DEFAULT_PAGE = 1;

const EMPTY_STATUS: readonly string[] = [];

type GoodsReceiptUrlState = {
  s?: string[];
  v?: string;
  f?: string;
  l?: string;
  q?: string;
  cd?: SerializedDateRange;
  rd?: SerializedDateRange;
  pg?: number;
};

function compactState(state: GoodsReceiptUrlState): GoodsReceiptUrlState {
  const r: GoodsReceiptUrlState = {};
  if (state.s?.length) r.s = state.s;
  if (state.v) r.v = state.v;
  if (state.f) r.f = state.f;
  if (state.l) r.l = state.l;
  if (state.q) r.q = state.q;
  if (state.cd?.preset) r.cd = state.cd;
  if (state.rd?.preset) r.rd = state.rd;
  if (state.pg && state.pg > DEFAULT_PAGE) r.pg = state.pg;
  return r;
}

export function useGoodsReceiptListFilters(storeReceipts: GoodsReceipt[]) {
  const { state, updateState, clearFilters } = useUrlBlobFilters<GoodsReceiptUrlState>({
    cacheKey: 'cmngt:goods-receipt-filters',
    compactState,
  });

  
  const statusFilter = (state.s ?? EMPTY_STATUS) as string[];
  const vendorFilter = state.v ?? null;
  const staffFilter = state.f ?? null;
  const locationFilter = state.l ?? null;
  const search = state.q ?? '';
  const createdDateRange = useMemo(
    () => restoreDateRange(state.cd, defaultLastNDaysRange()),
    [state.cd],
  );
  const receivedDateRange = useMemo(() => restoreDateRange(state.rd, EMPTY_DATE_RANGE), [state.rd]);
  const page = state.pg ?? DEFAULT_PAGE;

  
  
  
  const setStatusFilter = useCallback(
    (values: string[]) => updateState({ s: values.length > 0 ? values : undefined, pg: undefined }),
    [updateState],
  );

  const setVendorFilter = useCallback(
    (value: string | null) => updateState({ v: value || undefined, pg: undefined }),
    [updateState],
  );

  const setStaffFilter = useCallback(
    (value: string | null) => updateState({ f: value || undefined, pg: undefined }),
    [updateState],
  );

  const setLocationFilter = useCallback(
    (value: string | null) => updateState({ l: value || undefined, pg: undefined }),
    [updateState],
  );

  const setSearch = useCallback(
    (value: string) => updateState({ q: value || undefined, pg: undefined }),
    [updateState],
  );

  
  
  const setCreatedDateRange = useCallback(
    (next: DateRangeValue) =>
      updateState({
        cd: serializeDateRange(ensureValidDateRange(next)),
        pg: undefined,
      }),
    [updateState],
  );

  const setReceivedDateRange = useCallback(
    (next: DateRangeValue) => updateState({ rd: serializeDateRange(next), pg: undefined }),
    [updateState],
  );

  const setPage = useCallback(
    (value: number) => updateState({ pg: value !== DEFAULT_PAGE ? value : undefined }),
    [updateState],
  );

  
  const allReceipts = useMemo(() => {
    const filtered = storeReceipts.filter((r) => {
      if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
      if (vendorFilter && r.vendorCode !== vendorFilter) return false;
      if (staffFilter && r.extra?.assignedTo !== staffFilter) return false;
      if (locationFilter && r.locationCode !== locationFilter) return false;
      if (!isInDateRange(r.createdAt, createdDateRange)) return false;
      if (receivedDateRange.preset && !isInDateRange(r.receivedDate, receivedDateRange))
        return false;
      return true;
    });

    return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [
    storeReceipts,
    statusFilter,
    vendorFilter,
    staffFilter,
    locationFilter,
    createdDateRange,
    receivedDateRange,
  ]);

  
  
  const hasActiveFilters = !!(
    statusFilter.length > 0 ||
    vendorFilter ||
    staffFilter ||
    locationFilter ||
    !isDefaultLastNDaysRange(createdDateRange) ||
    receivedDateRange.preset
  );

  return {
    
    statusFilter,
    setStatusFilter,
    vendorFilter,
    setVendorFilter,
    staffFilter,
    setStaffFilter,
    locationFilter,
    setLocationFilter,
    search,
    setSearch,
    createdDateRange,
    setCreatedDateRange,
    receivedDateRange,
    setReceivedDateRange,
    page,
    setPage,

    
    allReceipts,
    hasActiveFilters,

    
    clearFilters,
  };
}
