import { useCallback, useMemo } from 'react';
import { type DateRangeValue } from '@/types/date-range';
import {
  type SerializedDateRange,
  EMPTY_DATE_RANGE,
  defaultLastNDaysRange,
  ensureValidDateRange,
  isDefaultLastNDaysRange,
  isInDateRange,
  restoreDateRange,
  serializeDateRange,
} from '@/utils/listFilterDateRange';
import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import {
  isDefaultStatusSelection,
  shouldEncodeStatusSelection,
} from '@/utils/listFilterStatusDefault';
import { getTransportOrderDefaultListStatuses } from '@/utils/permission';
import { orderPlanSortKey } from './planDate';
import { useTruckTypeOf } from './truckDisplay';
import { usesTruckType } from './truckTypeMatch';
import type { TransportOrder, TransportOrderShipmentType } from '@/types';

const DEFAULT_SORT = 'createdAt_desc';
const DEFAULT_PAGE = 1;

const DEFAULT_STATUS: readonly string[] = getTransportOrderDefaultListStatuses();

function usesTruck(order: TransportOrder, truckId: string): boolean {
  if (order.truckId === truckId) return true;
  return (order.trips ?? []).some((trip) => trip.truckId === truckId);
}

function usesDriver(order: TransportOrder, driverId: string): boolean {
  if (order.driverId === driverId) return true;
  return (order.trips ?? []).some((trip) => trip.driverId === driverId);
}

export type TransportOrderShipmentFilter = 'all' | TransportOrderShipmentType;

type TransportOrderUrlState = {
  q?: string;
  s?: string[];
  c?: string;
  tk?: string;

  tt?: string;
  dv?: string;

  sh?: TransportOrderShipmentType;
  cz?: string;
  hc?: boolean;
  sr?: string;
  cd?: SerializedDateRange;
  ed?: SerializedDateRange;
  pg?: number;
};

function compactState(state: TransportOrderUrlState): TransportOrderUrlState {
  const r: TransportOrderUrlState = {};
  if (state.q) r.q = state.q;

  if (shouldEncodeStatusSelection(state.s, DEFAULT_STATUS)) r.s = state.s;
  if (state.c) r.c = state.c;
  if (state.tk) r.tk = state.tk;
  if (state.tt) r.tt = state.tt;
  if (state.dv) r.dv = state.dv;
  if (state.sh) r.sh = state.sh;
  if (state.cz) r.cz = state.cz;
  if (state.hc) r.hc = true;
  if (state.sr && state.sr !== DEFAULT_SORT) r.sr = state.sr;
  if (state.cd?.preset) r.cd = state.cd;
  if (state.ed?.preset) r.ed = state.ed;
  if (state.pg && state.pg > DEFAULT_PAGE) r.pg = state.pg;
  return r;
}

export function useTransportOrderListFilters(
  storeOrders: TransportOrder[],

  defaultDateRangeDays: number,
) {
  const { state, updateState, clearFilters } = useUrlBlobFilters<TransportOrderUrlState>({
    cacheKey: 'cmngt:transport-order-filters',
    compactState,
  });

  const truckTypeOf = useTruckTypeOf();

  const search = state.q ?? '';

  const statusFilter = (state.s ?? DEFAULT_STATUS) as string[];
  const customerFilter = state.c ?? null;
  const truckFilter = state.tk ?? null;
  const truckTypeFilter = state.tt ?? null;
  const driverFilter = state.dv ?? null;
  const shipmentFilter: TransportOrderShipmentFilter = state.sh ?? 'all';
  const containerSizeFilter = state.cz ?? null;
  const hideCancelled = state.hc ?? false;
  const sortField = state.sr ?? DEFAULT_SORT;
  const page = state.pg ?? DEFAULT_PAGE;
  const createdDateRange = useMemo(
    () => restoreDateRange(state.cd, defaultLastNDaysRange(defaultDateRangeDays)),
    [state.cd, defaultDateRangeDays],
  );
  const entryDateRange = useMemo(() => restoreDateRange(state.ed, EMPTY_DATE_RANGE), [state.ed]);

  const setSearch = useCallback(
    (v: string) => updateState({ q: v || undefined, pg: undefined }),
    [updateState],
  );

  const setStatusFilter = useCallback(
    (v: string[]) => updateState({ s: v, pg: undefined }),
    [updateState],
  );
  const setCustomerFilter = useCallback(
    (v: string | null) => updateState({ c: v || undefined, pg: undefined }),
    [updateState],
  );
  const setTruckFilter = useCallback(
    (v: string | null) => updateState({ tk: v || undefined, pg: undefined }),
    [updateState],
  );
  const setTruckTypeFilter = useCallback(
    (v: string | null) => updateState({ tt: v || undefined, pg: undefined }),
    [updateState],
  );
  const setDriverFilter = useCallback(
    (v: string | null) => updateState({ dv: v || undefined, pg: undefined }),
    [updateState],
  );
  const setShipmentFilter = useCallback(
    (v: TransportOrderShipmentFilter) =>
      updateState({ sh: v === 'all' ? undefined : v, pg: undefined }),
    [updateState],
  );
  const setContainerSizeFilter = useCallback(
    (v: string | null) => updateState({ cz: v || undefined, pg: undefined }),
    [updateState],
  );
  const setHideCancelled = useCallback(
    (v: boolean) => updateState({ hc: v || undefined, pg: undefined }),
    [updateState],
  );
  const setSortField = useCallback(
    (v: string) => updateState({ sr: v === DEFAULT_SORT ? undefined : v, pg: undefined }),
    [updateState],
  );
  const setPage = useCallback(
    (v: number) => updateState({ pg: v !== DEFAULT_PAGE ? v : undefined }),
    [updateState],
  );

  const setCreatedDateRange = useCallback(
    (next: DateRangeValue) =>
      updateState({ cd: serializeDateRange(ensureValidDateRange(next)), pg: undefined }),
    [updateState],
  );
  const setEntryDateRange = useCallback(
    (next: DateRangeValue) => updateState({ ed: serializeDateRange(next), pg: undefined }),
    [updateState],
  );

  const allOrders = useMemo(() => {
    const filtered = storeOrders.filter((o) => {
      if (o.extra?.isDeleted) return false;
      if (hideCancelled && o.extra?.cancellation) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(o.status)) return false;
      if (customerFilter && o.customerCode !== customerFilter) return false;
      if (truckFilter && !usesTruck(o, truckFilter)) return false;
      if (truckTypeFilter && !usesTruckType(o, truckTypeFilter, truckTypeOf)) return false;
      if (driverFilter && !usesDriver(o, driverFilter)) return false;
      if (shipmentFilter !== 'all' && o.shipmentType !== shipmentFilter) return false;
      if (containerSizeFilter && o.containerSize !== containerSizeFilter) return false;
      if (!isInDateRange(o.createdAt, createdDateRange)) return false;
      if (entryDateRange.preset && o.entryDate && !isInDateRange(o.entryDate, entryDateRange))
        return false;
      return true;
    });

    const [field, dir] = sortField.split('_') as [string, string];
    const mult = dir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      if (field === 'entryDate') {
        const diff = orderPlanSortKey(a) - orderPlanSortKey(b);
        return diff === 0 ? 0 : diff < 0 ? -mult : mult;
      }
      return a.createdAt < b.createdAt ? -mult : a.createdAt > b.createdAt ? mult : 0;
    });
  }, [
    storeOrders,
    hideCancelled,
    statusFilter,
    customerFilter,
    truckFilter,
    truckTypeFilter,
    truckTypeOf,
    driverFilter,
    shipmentFilter,
    containerSizeFilter,
    createdDateRange,
    entryDateRange,
    sortField,
  ]);

  const statusFilterIsDefault = useMemo(
    () => isDefaultStatusSelection(statusFilter, DEFAULT_STATUS),
    [statusFilter],
  );

  const hasActiveFilters = !!(
    !statusFilterIsDefault ||
    customerFilter ||
    truckFilter ||
    truckTypeFilter ||
    driverFilter ||
    shipmentFilter !== 'all' ||
    containerSizeFilter ||
    hideCancelled ||
    entryDateRange.preset ||
    !isDefaultLastNDaysRange(createdDateRange, defaultDateRangeDays)
  );

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,

    statusFilterIsDefault,
    customerFilter,
    setCustomerFilter,
    truckFilter,
    setTruckFilter,
    truckTypeFilter,
    setTruckTypeFilter,
    driverFilter,
    setDriverFilter,
    shipmentFilter,
    setShipmentFilter,
    containerSizeFilter,
    setContainerSizeFilter,
    hideCancelled,
    setHideCancelled,
    sortField,
    setSortField,
    createdDateRange,
    setCreatedDateRange,
    entryDateRange,
    setEntryDateRange,
    page,
    setPage,

    allOrders,
    hasActiveFilters,
    clearFilters,
  };
}
