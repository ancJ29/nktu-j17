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
import {
  getPricingVatRate,
  getSalesOrderDefaultListStatuses,
  isPricingManagementEnabled,
  perms,
} from '@/utils/permission';
import { getSalesOrderReadyDate } from '@/utils/salesOrderReadyDate';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { Customer, SalesOrder } from '@/types';
import { compareSalesOrdersForList } from './salesOrderListSort';
import {
  isPickOlderThanWindow,
  LIST_FETCH_WINDOW_DAYS,
  statusSelectionForPick,
} from '@/utils/statusSelectionForPick';
import { todayInVnDateString } from '@/utils/dateTimeField';
import {
  effectiveStatusSelection,
  matchesPaymentFilter,
  parsePaymentFilter,
  type SalesOrderPaymentFilter,
} from './salesOrderPaymentFilter';
import { hasWarehouseStaffMember } from './salesOrderWarehouseStaff';
import { getCancellationTargetStatusValue } from './transitionEngine';
import type { SalesOrderListView } from './salesOrderListVariant';
import { salesOrderFieldOptions } from './useSalesOrderFieldOptions';

const DEFAULT_SORT = 'createdAt_desc';
const DEFAULT_PAGE = 1;

const DEFAULT_STATUS: readonly string[] = getSalesOrderDefaultListStatuses();

const STATUS_ORDER: readonly string[] = salesOrderFieldOptions.statusOptions.map((o) => o.value);
const CANCELLATION_TARGET_STATUS = getCancellationTargetStatusValue();
const showPrice = isPricingManagementEnabled() && perms.salesOrder.canViewPrice();
const vatRate = getPricingVatRate();

export type SalesOrderDeliveryKind = 'all' | 'internal' | 'external';

type SalesOrderUrlState = {
  s?: string[];
  c?: string;
  f?: string;
  ws?: string;
  u?: boolean;
  sr?: string;
  q?: string;
  cd?: SerializedDateRange;
  dd?: SerializedDateRange;
  dk?: 'internal' | 'external';
  pf?: SalesOrderPaymentFilter;
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
  if (state.ws) r.ws = state.ws;
  if (state.u) r.u = true;
  if (state.sr && state.sr !== DEFAULT_SORT) r.sr = state.sr;
  if (state.q) r.q = state.q;
  if (state.cd?.preset) r.cd = state.cd;
  if (state.dd?.preset) r.dd = state.dd;
  if (state.dk) r.dk = state.dk;
  if (parsePaymentFilter(state.pf)) r.pf = state.pf;
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

  const customers = useCustomerStore((s) => s.items);
  const employees = useEmployeeStore((s) => s.items);
  const sortLookups = useMemo(() => {
    const customerByCode = new Map<string, Customer>();
    for (const c of customers) customerByCode.set(c.code, c);
    const employeeNameById = new Map<string, string>();
    for (const e of employees) employeeNameById.set(e.id, e.name);
    return {
      resolveStatus: salesOrderFieldOptions.resolveStatus,
      statusOrder: STATUS_ORDER,
      cancellationTargetStatus: CANCELLATION_TARGET_STATUS,
      getCustomerByCode: (code: string) => customerByCode.get(code),
      getEmployeeName: (id: string) => employeeNameById.get(id),
      showPrice,
      vatRate,
    };
  }, [customers, employees]);

  const paymentFilter = parsePaymentFilter(state.pf);
  const customerFilter = state.c ?? null;
  const staffFilter = state.f ?? null;
  const warehouseStaffFilter = state.ws ?? null;
  const urgentOnly = state.u ?? false;
  const sortField = state.sr ?? DEFAULT_SORT;
  const search = state.q ?? '';
  const createdDateRange = useMemo(
    () => restoreDateRange(state.cd, defaultLastNDaysRange(defaultDateRangeDays)),
    [state.cd, defaultDateRangeDays],
  );
  const deliveryDateRange = useMemo(() => restoreDateRange(state.dd, EMPTY_DATE_RANGE), [state.dd]);

  const fetchBase = useMemo(() => defaultLastNDaysRange(LIST_FETCH_WINDOW_DAYS), []);
  const oldPickStatus = statusSelectionForPick({
    selection: state.s,
    defaultSelection: DEFAULT_STATUS,
    allStatuses: STATUS_ORDER,
    excluded: CANCELLATION_TARGET_STATUS,
    pickIsOld: isPickOlderThanWindow(fetchBase, [createdDateRange, deliveryDateRange]),
  });
  const statusReadsAsAll = oldPickStatus.widened;
  const statusFilter = statusReadsAsAll
    ? oldPickStatus.selection
    : effectiveStatusSelection({
        selection: state.s,
        defaultSelection: DEFAULT_STATUS,
        paymentFilter,
        allStatuses: STATUS_ORDER,
        cancellationTarget: CANCELLATION_TARGET_STATUS,
      });
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

  const setPaymentFilter = useCallback(
    (value: SalesOrderPaymentFilter | null) =>
      updateState({ pf: value ?? undefined, pg: undefined }),
    [updateState],
  );

  const setStaffFilter = useCallback(
    (value: string | null) => updateState({ f: value || undefined, pg: undefined }),
    [updateState],
  );

  const setWarehouseStaffFilter = useCallback(
    (value: string | null) => updateState({ ws: value || undefined, pg: undefined }),
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

  const todayVn = todayInVnDateString();
  const allOrders = useMemo(() => {
    const filtered = storeOrders.filter((o) => {
      if (statusFilter.length > 0 && !statusFilter.includes(o.extra?.status ?? '')) return false;
      if (customerFilter && o.extra?.customerCode !== customerFilter) return false;
      if (staffFilter && o.extra?.assignedStaff !== staffFilter) return false;
      if (warehouseStaffFilter && !hasWarehouseStaffMember(o, warehouseStaffFilter)) return false;
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
      if (paymentFilter && !matchesPaymentFilter(o, paymentFilter, todayVn, vatRate)) return false;
      return true;
    });

    return filtered.sort(
      compareSalesOrdersForList(sortField, internalDeliveryFirstSort, sortLookups),
    );
  }, [
    storeOrders,
    statusFilter,
    customerFilter,
    staffFilter,
    warehouseStaffFilter,
    urgentOnly,
    createdDateRange,
    deliveryDateRange,
    deliveryKind,
    paymentFilter,
    todayVn,
    sortField,
    internalDeliveryFirstSort,
    sortLookups,
  ]);

  const statusFilterIsDefault = useMemo(
    () => isDefaultStatusSelection(state.s ?? DEFAULT_STATUS, DEFAULT_STATUS),
    [state.s],
  );

  const hasActiveFilters = !!(
    !statusFilterIsDefault ||
    customerFilter ||
    staffFilter ||
    warehouseStaffFilter ||
    urgentOnly ||
    !isDefaultLastNDaysRange(createdDateRange) ||
    deliveryDateRange.preset ||
    deliveryKind !== 'all' ||
    paymentFilter ||
    undefined // search + the header filters are handled by the page
  );

  return {
    statusFilter,

    statusReadsAsAll,
    setStatusFilter,

    statusFilterIsDefault,
    customerFilter,
    setCustomerFilter,
    staffFilter,
    setStaffFilter,
    warehouseStaffFilter,
    setWarehouseStaffFilter,
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

    paymentFilter,
    setPaymentFilter,

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
