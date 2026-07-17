

import { useCallback, useMemo } from 'react';
import { type DateRangeValue } from '@/types/date-range';
import {
  type SerializedDateRange,
  ensureValidDateRange,
  isDefaultLastNDaysRange,
  isInDateRange,
  restoreDateRange,
  serializeDateRange,
} from '@/utils/listFilterDateRange';
import { EMPTY_DATE_RANGE, defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import { getSalesOrderReadyDate, getSalesOrderReadyMs } from '@/utils/salesOrderReadyDate';
import type { SalesOrder } from '@/types';

const DEFAULT_SORT = 'createdAt_desc';
const DEFAULT_PAGE = 1;

const EMPTY_STATUS: readonly string[] = [];

export type SalesOrderDeliveryKind = 'all' | 'internal' | 'external';

type SalesOrderUrlState = {
  s?: string[];
  c?: string;
  f?: string;
  u?: boolean;
  sr?: string;
  q?: string;
  cd?: SerializedDateRange;
  dd?: SerializedDateRange;
  dk?: 'internal' | 'external';
  pg?: number;
};

function compactState(state: SalesOrderUrlState): SalesOrderUrlState {
  const r: SalesOrderUrlState = {};
  if (state.s?.length) r.s = state.s;
  if (state.c) r.c = state.c;
  if (state.f) r.f = state.f;
  if (state.u) r.u = true;
  if (state.sr && state.sr !== DEFAULT_SORT) r.sr = state.sr;
  if (state.q) r.q = state.q;
  if (state.cd?.preset) r.cd = state.cd;
  if (state.dd?.preset) r.dd = state.dd;
  if (state.dk) r.dk = state.dk;
  if (state.pg && state.pg > DEFAULT_PAGE) r.pg = state.pg;
  return r;
}

export function useSalesOrderListFilters(
  storeOrders: SalesOrder[],
  
  defaultDateRangeDays?: number,
) {
  const { state, updateState, clearFilters } = useUrlBlobFilters<SalesOrderUrlState>({
    cacheKey: 'cmngt:sales-order-filters',
    compactState,
  });

  
  const statusFilter = (state.s ?? EMPTY_STATUS) as string[];
  const customerFilter = state.c ?? null;
  const staffFilter = state.f ?? null;
  const urgentOnly = state.u ?? false;
  const sortField = state.sr ?? DEFAULT_SORT;
  const search = state.q ?? '';
  const createdDateRange = useMemo(
    () => restoreDateRange(state.cd, defaultLastNDaysRange(defaultDateRangeDays)),
    [state.cd, defaultDateRangeDays],
  );
  const deliveryDateRange = useMemo(() => restoreDateRange(state.dd, EMPTY_DATE_RANGE), [state.dd]);
  const deliveryKind: SalesOrderDeliveryKind = state.dk ?? 'all';
  const page = state.pg ?? DEFAULT_PAGE;

  
  const setStatusFilter = useCallback(
    (values: string[]) => updateState({ s: values.length > 0 ? values : undefined, pg: undefined }),
    [updateState],
  );

  const setCustomerFilter = useCallback(
    (value: string | null) => updateState({ c: value || undefined, pg: undefined }),
    [updateState],
  );

  const setStaffFilter = useCallback(
    (value: string | null) => updateState({ f: value || undefined, pg: undefined }),
    [updateState],
  );

  const setUrgentOnly = useCallback(
    (value: boolean) => updateState({ u: value || undefined, pg: undefined }),
    [updateState],
  );

  const setSortField = useCallback(
    (value: string) =>
      updateState({
        sr: value === DEFAULT_SORT ? undefined : value,
        pg: undefined,
      }),
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

  const setDeliveryDateRange = useCallback(
    (next: DateRangeValue) => updateState({ dd: serializeDateRange(next), pg: undefined }),
    [updateState],
  );

  const setDeliveryKind = useCallback(
    (value: SalesOrderDeliveryKind) =>
      updateState({ dk: value === 'all' ? undefined : value, pg: undefined }),
    [updateState],
  );

  const setPage = useCallback(
    (value: number) => updateState({ pg: value !== DEFAULT_PAGE ? value : undefined }),
    [updateState],
  );

  
  const allOrders = useMemo(() => {
    const filtered = storeOrders.filter((o) => {
      if (statusFilter.length > 0 && !statusFilter.includes(o.extra?.status ?? '')) return false;
      if (customerFilter && o.extra?.customerCode !== customerFilter) return false;
      if (staffFilter && o.extra?.assignedStaff !== staffFilter) return false;
      if (urgentOnly && !o.extra?.isUrgent) return false;
      
      
      
      
      
      if (!isInDateRange(getSalesOrderReadyDate(o), createdDateRange)) return false;
      if (
        deliveryDateRange.preset &&
        o.extra?.deliveryDate &&
        !isInDateRange(o.extra.deliveryDate, deliveryDateRange)
      )
        return false;
      
      
      
      
      if (deliveryKind === 'internal' && o.extra?.isInternalDelivery === false) return false;
      if (deliveryKind === 'external' && o.extra?.isInternalDelivery !== false) return false;
      return true;
    });

    const [field, dir] = sortField.split('_') as [string, string];
    
    const mult = dir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      const aU = a.extra?.isUrgent ? 1 : 0;
      const bU = b.extra?.isUrgent ? 1 : 0;
      if (aU !== bU) return bU - aU;
      if (field === 'deliveryDate') {
        const aVal = a.extra?.deliveryDate ?? '';
        const bVal = b.extra?.deliveryDate ?? '';
        return aVal < bVal ? -mult : aVal > bVal ? mult : 0;
      }
      
      
      
      const aVal = getSalesOrderReadyMs(a);
      const bVal = getSalesOrderReadyMs(b);
      return aVal < bVal ? -mult : aVal > bVal ? mult : 0;
    });
  }, [
    storeOrders,
    statusFilter,
    customerFilter,
    staffFilter,
    urgentOnly,
    createdDateRange,
    deliveryDateRange,
    deliveryKind,
    sortField,
  ]);

  const hasActiveFilters = !!(
    statusFilter.length > 0 ||
    customerFilter ||
    staffFilter ||
    urgentOnly ||
    !isDefaultLastNDaysRange(createdDateRange) ||
    deliveryDateRange.preset ||
    deliveryKind !== 'all' ||
    undefined // search is handled externally by useListFilter
  );

  return {
    
    statusFilter,
    setStatusFilter,
    customerFilter,
    setCustomerFilter,
    staffFilter,
    setStaffFilter,
    urgentOnly,
    setUrgentOnly,
    sortField,
    setSortField,
    search,
    setSearch,
    createdDateRange,
    setCreatedDateRange,
    deliveryDateRange,
    setDeliveryDateRange,
    deliveryKind,
    setDeliveryKind,
    page,
    setPage,

    
    allOrders,
    hasActiveFilters,

    
    clearFilters,
  };
}
