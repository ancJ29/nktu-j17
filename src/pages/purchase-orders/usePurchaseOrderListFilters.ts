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
import { PURCHASE_ORDER_RANGE_DAYS } from '@/stores/usePurchaseOrderStore';
import type { PurchaseOrder } from '@/types';
import { businessDateString } from '@/utils/code';
import {
  isOverdue,
  poCustomer,
  poOrderDayInRange,
  poRequestedByIs,
  poExtra,
  poIsPaid,
  poPayment,
  poPaymentUntracked,
  poStatus,
} from './purchaseOrderModel';

const DEFAULT_PAGE = 1;

export type PaidFilter = 'paid' | 'partial' | 'unpaid' | 'overdue';

type PurchaseOrderUrlState = {
  s?: string[];
  v?: string;
  c?: string;
  f?: string;
  p?: PaidFilter;
  q?: string;
  cd?: SerializedDateRange;
  dd?: SerializedDateRange;
  od?: SerializedDateRange;
  rb?: string;
  pg?: number;
};

function compactState(state: PurchaseOrderUrlState): PurchaseOrderUrlState {
  const r: PurchaseOrderUrlState = {};
  if (state.s && state.s.length > 0) r.s = state.s;
  if (state.v) r.v = state.v;
  if (state.c) r.c = state.c;
  if (state.f) r.f = state.f;
  if (state.p) r.p = state.p;
  if (state.q) r.q = state.q;
  if (state.cd?.preset) r.cd = state.cd;
  if (state.dd?.preset) r.dd = state.dd;
  if (state.od?.preset) r.od = state.od;
  if (state.rb) r.rb = state.rb;
  if (state.pg && state.pg > DEFAULT_PAGE) r.pg = state.pg;
  return r;
}

export function usePurchaseOrderListFilters(storeOrders: PurchaseOrder[], vendorVisible = true) {
  const { state, updateState, clearFilters } = useUrlBlobFilters<PurchaseOrderUrlState>({
    cacheKey: 'cmngt:purchase-order-filters',
    compactState,
  });

  const statusFilter = useMemo(() => state.s ?? [], [state.s]);

  const vendorFilter = vendorVisible ? (state.v ?? null) : null;
  const customerFilter = state.c ?? null;
  const staffFilter = state.f ?? null;
  const paidFilter = state.p ?? null;
  const search = state.q ?? '';
  const createdDateRange = useMemo(
    () => restoreDateRange(state.cd, defaultLastNDaysRange(PURCHASE_ORDER_RANGE_DAYS)),
    [state.cd],
  );
  const deadlineDateRange = useMemo(() => restoreDateRange(state.dd, EMPTY_DATE_RANGE), [state.dd]);
  const orderDateRange = useMemo(() => restoreDateRange(state.od, EMPTY_DATE_RANGE), [state.od]);
  const requestedByFilter = state.rb ?? null;
  const page = state.pg ?? DEFAULT_PAGE;

  const setStatusFilter = useCallback(
    (values: string[]) => updateState({ s: values, pg: undefined }),
    [updateState],
  );
  const setVendorFilter = useCallback(
    (value: string | null) => updateState({ v: value || undefined, pg: undefined }),
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
  const setPaidFilter = useCallback(
    (value: string | null) =>
      updateState({ p: (value as PaidFilter | null) || undefined, pg: undefined }),
    [updateState],
  );
  const setSearch = useCallback(
    (value: string) => updateState({ q: value || undefined, pg: undefined }),
    [updateState],
  );

  const setCreatedDateRange = useCallback(
    (next: DateRangeValue) =>
      updateState({
        cd: serializeDateRange(
          ensureValidDateRange(next, defaultLastNDaysRange(PURCHASE_ORDER_RANGE_DAYS)),
        ),
        pg: undefined,
      }),
    [updateState],
  );
  const setDeadlineDateRange = useCallback(
    (next: DateRangeValue) => updateState({ dd: serializeDateRange(next), pg: undefined }),
    [updateState],
  );
  const setOrderDateRange = useCallback(
    (next: DateRangeValue) => updateState({ od: serializeDateRange(next), pg: undefined }),
    [updateState],
  );
  const setRequestedByFilter = useCallback(
    (value: string | null) => updateState({ rb: value || undefined, pg: undefined }),
    [updateState],
  );
  const setPage = useCallback(
    (value: number) => updateState({ pg: value !== DEFAULT_PAGE ? value : undefined }),
    [updateState],
  );

  const allOrders = useMemo(() => {
    const today = businessDateString();
    const filtered = storeOrders.filter((r) => {
      if (poExtra(r).isDeleted === true) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(poStatus(r))) return false;
      if (vendorFilter && r.vendorCode !== vendorFilter) return false;

      if (customerFilter && poCustomer(r)?.code !== customerFilter) return false;
      if (staffFilter && poExtra(r).assignedTo !== staffFilter) return false;
      if (paidFilter === 'paid' && !poIsPaid(r)) return false;

      if (paidFilter === 'unpaid' && (poIsPaid(r) || poPaymentUntracked(r))) return false;
      if (paidFilter === 'partial' && (poPayment(r).state !== 'partial' || poPaymentUntracked(r))) {
        return false;
      }
      if (paidFilter === 'overdue' && !isOverdue(r, today)) return false;
      if (!isInDateRange(r.createdAt, createdDateRange)) return false;
      if (deadlineDateRange.preset && !isInDateRange(r.paymentDeadline, deadlineDateRange)) {
        return false;
      }

      if (!poOrderDayInRange(r, orderDateRange)) return false;
      if (requestedByFilter && !poRequestedByIs(r, requestedByFilter)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1));
  }, [
    storeOrders,
    statusFilter,
    vendorFilter,
    customerFilter,
    staffFilter,
    paidFilter,
    createdDateRange,
    deadlineDateRange,
    orderDateRange,
    requestedByFilter,
  ]);

  const hasActiveFilters = !!(
    statusFilter.length > 0 ||
    vendorFilter ||
    customerFilter ||
    staffFilter ||
    paidFilter ||
    !isDefaultLastNDaysRange(createdDateRange, PURCHASE_ORDER_RANGE_DAYS) ||
    deadlineDateRange.preset ||
    orderDateRange.preset ||
    requestedByFilter
  );

  return {
    statusFilter,
    setStatusFilter,
    vendorFilter,
    setVendorFilter,
    customerFilter,
    setCustomerFilter,
    staffFilter,
    setStaffFilter,
    paidFilter,
    setPaidFilter,
    search,
    setSearch,
    createdDateRange,
    setCreatedDateRange,
    deadlineDateRange,
    setDeadlineDateRange,
    orderDateRange,
    setOrderDateRange,
    requestedByFilter,
    setRequestedByFilter,
    page,
    setPage,
    allOrders,
    hasActiveFilters,
    clearFilters,
  };
}
