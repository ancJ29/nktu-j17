import { useCallback, useMemo } from 'react';
import { serializeColumnFilters, type ColumnFilterValues } from '@credo/base-ui/hooks';
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
import {
  isDefaultStatusSelection,
  shouldEncodeStatusSelection,
} from '@/utils/listFilterStatusDefault';
import { getSalesOrderDefaultListStatuses } from '@/utils/permission';
import { getSalesOrderReadyDate } from '@/utils/salesOrderReadyDate';
import type { SalesOrder } from '@/types';
import { compareSalesOrdersForList } from './salesOrderListSort';
import type { SalesOrderListView } from './salesOrderListVariant';
import { salesOrderFieldOptions } from './useSalesOrderFieldOptions';

const DEFAULT_SORT = 'createdAt_desc';
const DEFAULT_PAGE = 1;

const DEFAULT_STATUS: readonly string[] = getSalesOrderDefaultListStatuses();

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
  cf?: string;
  pg?: number;
  v?: Exclude<SalesOrderListView, 'ops'>;
};

const KEEP_ON_CLEAR: readonly (keyof SalesOrderUrlState)[] = ['v'];

function compactState(state: SalesOrderUrlState): SalesOrderUrlState {
  const r: SalesOrderUrlState = {};

  if (shouldEncodeStatusSelection(state.s, DEFAULT_STATUS)) r.s = state.s;
  if (state.c) r.c = state.c;
  if (state.f) r.f = state.f;
  if (state.u) r.u = true;
  if (state.sr && state.sr !== DEFAULT_SORT) r.sr = state.sr;
  if (state.q) r.q = state.q;
  if (state.cd?.preset) r.cd = state.cd;
  if (state.dd?.preset) r.dd = state.dd;
  if (state.dk) r.dk = state.dk;
  if (state.cf) r.cf = state.cf;
  if (state.pg && state.pg > DEFAULT_PAGE) r.pg = state.pg;
  if (state.v) r.v = state.v;
  return r;
}

export function useSalesOrderListFilters(
  storeOrders: SalesOrder[],

  defaultDateRangeDays?: number,

  internalDeliveryFirstSort = false,
) {
  const { state, updateState, clearFilters } = useUrlBlobFilters<SalesOrderUrlState>({
    cacheKey: 'cmngt:sales-order-filters',
    compactState,
    keepOnClear: KEEP_ON_CLEAR,
  });

  const statusFilter = (state.s ?? DEFAULT_STATUS) as string[];
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
  const columnFilters = state.cf ?? '';
  const page = state.pg ?? DEFAULT_PAGE;
  const view: SalesOrderListView = state.v ?? 'ops';

  const setStatusFilter = useCallback(
    (values: string[]) => updateState({ s: values, pg: undefined }),
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

  const setColumnFilters = useCallback(
    (values: ColumnFilterValues) =>
      updateState({ cf: serializeColumnFilters(values) || undefined, pg: undefined }),
    [updateState],
  );

  const setPage = useCallback(
    (value: number) => updateState({ pg: value !== DEFAULT_PAGE ? value : undefined }),
    [updateState],
  );

  const setView = useCallback(
    (value: SalesOrderListView) => updateState({ v: value === 'ops' ? undefined : value }),
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

    return filtered.sort(
      compareSalesOrdersForList(
        sortField,
        internalDeliveryFirstSort,
        salesOrderFieldOptions.resolveStatus,
      ),
    );
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
    internalDeliveryFirstSort,
  ]);

  const statusFilterIsDefault = useMemo(
    () => isDefaultStatusSelection(statusFilter, DEFAULT_STATUS),
    [statusFilter],
  );

  const hasActiveFilters = !!(
    !statusFilterIsDefault ||
    customerFilter ||
    staffFilter ||
    urgentOnly ||
    !isDefaultLastNDaysRange(createdDateRange) ||
    deliveryDateRange.preset ||
    deliveryKind !== 'all' ||
    undefined // search + the header filters are handled by the page
  );

  return {
    statusFilter,
    setStatusFilter,

    statusFilterIsDefault,
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

    columnFilters,
    setColumnFilters,
    page,
    setPage,

    view,
    setView,

    allOrders,
    hasActiveFilters,

    clearFilters,
  };
}
