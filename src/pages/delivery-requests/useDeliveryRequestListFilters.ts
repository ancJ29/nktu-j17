import { useCallback, useMemo } from 'react';
import { type DateRangeValue } from '@/types/date-range';
import {
  EMPTY_DATE_RANGE,
  type SerializedDateRange,
  isInDateRange,
  restoreDateRange,
  serializeDateRange,
} from '@/utils/listFilterDateRange';
import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import {
  isDefaultStatusSelection,
  shouldEncodeStatusSelection,
} from '@/utils/listFilterStatusDefault';
import { getDeliveryRequestDefaultListStatuses } from '@/utils/permission';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { deliveryRequestPartyKey } from './deliveryRequestParty';
import { formatYYMMDD_GMT7 } from './displayOrderNumber';

function deliveryDayKey(r: DeliveryRequest, don: string): string {
  if (r.scheduledDate != null) {
    const d = new Date(r.scheduledDate);
    if (!Number.isNaN(d.getTime())) return formatYYMMDD_GMT7(d);
  }
  return don ? don.slice(0, 6) : '';
}

const DEFAULT_PAGE = 1;

const DEFAULT_STATUS: readonly string[] = getDeliveryRequestDefaultListStatuses();

const partyKey = deliveryRequestPartyKey;

type DeliveryRequestUrlState = {
  s?: string[];
  o?: string;
  dv?: string;
  pt?: string;
  q?: string;
  sd?: SerializedDateRange;
  pg?: number;
};

function compactState(state: DeliveryRequestUrlState): DeliveryRequestUrlState {
  const r: DeliveryRequestUrlState = {};

  if (shouldEncodeStatusSelection(state.s, DEFAULT_STATUS)) r.s = state.s;
  if (state.o) r.o = state.o;
  if (state.dv) r.dv = state.dv;
  if (state.pt) r.pt = state.pt;
  if (state.q) r.q = state.q;
  if (state.sd?.preset) r.sd = state.sd;
  if (state.pg && state.pg > DEFAULT_PAGE) r.pg = state.pg;
  return r;
}

export function useDeliveryRequestListFilters(
  storeRequests: DeliveryRequest[],

  driverCodeById?: ReadonlyMap<string, string>,
) {
  const { state, updateState, clearFilters } = useUrlBlobFilters<DeliveryRequestUrlState>({
    cacheKey: 'cmngt:delivery-request-filters',
    compactState,
  });

  const statusFilter = (state.s ?? DEFAULT_STATUS) as string[];
  const salesOrderFilter = state.o ?? null;
  const driverFilter = state.dv ?? null;
  const partyFilter = state.pt ?? null;
  const search = state.q ?? '';
  const scheduledDateRange = useMemo(
    () => restoreDateRange(state.sd, EMPTY_DATE_RANGE),
    [state.sd],
  );
  const page = state.pg ?? DEFAULT_PAGE;

  const setStatusFilter = useCallback(
    (values: string[]) => updateState({ s: values, pg: undefined }),
    [updateState],
  );

  const setDriverFilter = useCallback(
    (value: string | null) => updateState({ dv: value || undefined, pg: undefined }),
    [updateState],
  );

  const setPartyFilter = useCallback(
    (value: string | null) => updateState({ pt: value || undefined, pg: undefined }),
    [updateState],
  );

  const setSearch = useCallback(
    (value: string) => updateState({ q: value || undefined, pg: undefined }),
    [updateState],
  );

  const setScheduledDateRange = useCallback(
    (next: DateRangeValue) => updateState({ sd: serializeDateRange(next), pg: undefined }),
    [updateState],
  );

  const setPage = useCallback(
    (value: number) => updateState({ pg: value !== DEFAULT_PAGE ? value : undefined }),
    [updateState],
  );

  const allRequests = useMemo(() => {
    const filtered = storeRequests.filter((r) => {
      const status = (r.extra as { status?: string })?.status ?? '';
      const assignedDriverId = (r.extra as { assignedDriverId?: string } | undefined)
        ?.assignedDriverId;
      if (statusFilter.length > 0 && !statusFilter.includes(status)) return false;
      if (salesOrderFilter && r.salesOrderNumber !== salesOrderFilter) return false;
      if (driverFilter && assignedDriverId !== driverFilter) return false;
      if (partyFilter && partyKey(r) !== partyFilter) return false;

      if (scheduledDateRange.preset) {
        const filterDate =
          (r.extra as DeliveryRequestExtra | undefined)?.deliveryTimestamp ?? r.scheduledDate;
        if (!isInDateRange(filterDate, scheduledDateRange)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const aExtra = (a.extra ?? {}) as DeliveryRequestExtra;
      const bExtra = (b.extra ?? {}) as DeliveryRequestExtra;
      const aDon = aExtra.displayOrderNumber ?? '';
      const bDon = bExtra.displayOrderNumber ?? '';

      const aDay = deliveryDayKey(a, aDon);
      const bDay = deliveryDayKey(b, bDon);
      if (aDay !== bDay) {
        if (!aDay) return -1;
        if (!bDay) return 1;
        return aDay > bDay ? -1 : 1;
      }

      const aUrgent = aExtra.isUrgent === true;
      const bUrgent = bExtra.isUrgent === true;
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;

      const aCode = driverCodeById?.get(aExtra.assignedDriverId ?? '') ?? '';
      const bCode = driverCodeById?.get(bExtra.assignedDriverId ?? '') ?? '';
      if (aCode !== bCode) {
        if (!aCode) return 1;
        if (!bCode) return -1;
        return aCode < bCode ? -1 : 1;
      }

      if (aDon && bDon) return aDon < bDon ? -1 : aDon > bDon ? 1 : 0;
      if (aDon) return -1;
      if (bDon) return 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [
    storeRequests,
    statusFilter,
    salesOrderFilter,
    driverFilter,
    partyFilter,
    scheduledDateRange,
    driverCodeById,
  ]);

  const statusFilterIsDefault = useMemo(
    () => isDefaultStatusSelection(statusFilter, DEFAULT_STATUS),
    [statusFilter],
  );

  const hasActiveFilters = !!(
    !statusFilterIsDefault ||
    salesOrderFilter ||
    driverFilter ||
    partyFilter ||
    scheduledDateRange.preset ||
    undefined // search handled externally by useListFilter
  );

  return {
    statusFilter,
    setStatusFilter,

    statusFilterIsDefault,
    salesOrderFilter,
    driverFilter,
    setDriverFilter,
    partyFilter,
    setPartyFilter,
    search,
    setSearch,
    scheduledDateRange,
    setScheduledDateRange,
    page,
    setPage,

    allRequests,
    hasActiveFilters,

    clearFilters,
  };
}
