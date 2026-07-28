import { Badge, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileInvoice } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { ListPagination } from '@/components/custom/ListPagination';
import { DesktopFilterBar, type SelectFilter } from '@/components/DesktopFilterBar';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { MobileFilterBar, type MobileFilterDef } from '@/components/MobileFilterBar';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { FilterPill } from '@/components/FilterPill';
import { ROUTES } from '@/constants/routes';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useListFilter } from '@/hooks/useListFilter';
import {
  EMPTY_DATE_RANGE,
  type DateRangePreset,
  type DateRangeValue,
  type MoreFilterDef,
} from '@/types/date-range';
import {
  defaultLastNDaysRange,
  formatDateRangeLabel,
  isDefaultLastNDaysRange,
} from '@/utils/listFilterDateRange';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import { quotationBundle, useQuotationStore } from './useQuotationStore';
import {
  quotationBadgeProps,
  quotationListDate,
  quotationTotal,
  type Quotation,
  type QuotationStatus,
} from './types';

const isMobile = device.isMobile;

const RANGE_DAYS = 90;

const canViewAll = perms.salesOrder.canViewAll();
const canViewSelf = perms.salesOrder.canViewSelf();

function detailRoute(id: string): string {
  return ROUTES.QUOTATIONS.DETAIL.replace(':id', id);
}

export function QuotationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canCreate = perms.salesOrder.canCreate();

  const items = useQuotationStore((s) => s.items) as Quotation[];
  const loading = useQuotationStore((s) => s.loading);
  const initialized = useQuotationStore((s) => s.initialized);
  const error = useQuotationStore((s) => s.error);
  const cachedAt = useQuotationStore((s) => s.cachedAt);
  const loadAll = useQuotationStore((s) => s.loadAll);
  const forceRefresh = useQuotationStore((s) => s.forceRefresh);

  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);
  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);

  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    defaultLastNDaysRange(RANGE_DAYS),
  );
  const [searchState, setSearchState] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | QuotationStatus>('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);
  useEffect(() => {
    if (!customersInitialized) loadCustomers();
  }, [customersInitialized, loadCustomers]);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);
  useEffect(() => {
    if (error) {
      notifications.show({ color: 'red', message: t('quotations.notifications.fetchError') });
    }
  }, [error, t]);

  const applyDateRange = useCallback(
    (next: DateRangeValue) => {
      const effective = next.from && next.to ? next : defaultLastNDaysRange(RANGE_DAYS);
      setDateRange(effective);
      quotationBundle.setRange(effective.from, effective.to);
      forceRefresh();
    },
    [forceRefresh],
  );

  const rows = useMemo(() => {
    const live = items.filter((r) => !r.extra.isDeleted);
    let scoped = live;
    if (!canViewAll) {
      if (!canViewSelf) {
        scoped = [];
      } else {
        const me = getCurrentEmployeeId();
        scoped = me ? live.filter((r) => r.extra.assignedStaff === me) : [];
      }
    }
    return scoped.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `employees` recomputes the memo once the current-employee id resolves
  }, [items, employees]);

  const { search, setSearch, page, setPage, pageSize, setPageSize, paginated, totalPages } =
    useListFilter(rows, {
      filters: { status: statusFilter, customerCode: customerFilter, assignedStaff: staffFilter },
      filterFn: (q, f) =>
        (!f.status || (q.extra.status ?? 'draft') === f.status) &&
        (!f.customerCode || q.extra.customerCode === f.customerCode) &&
        (!f.assignedStaff || q.extra.assignedStaff === f.assignedStaff),
      searchFields: (q) => [q.extra.code, q.extra.customerName ?? '', q.extra.customerCode ?? ''],
      search: searchState,
      onSearchChange: setSearchState,
    });

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const customerByCode = useMemo(() => new Map(customers.map((c) => [c.code, c])), [customers]);
  const staffName = useCallback((id: string) => employeeById.get(id)?.name ?? id, [employeeById]);
  const customerName = useCallback(
    (row: Quotation) =>
      (row.extra.customerCode && customerByCode.get(row.extra.customerCode)?.extra?.shortName) ||
      row.extra.customerName ||
      '—',
    [customerByCode],
  );

  const statusData = useMemo(
    () => [
      { value: 'draft', label: t('quotations.status.draft') },
      { value: 'sent', label: t('quotations.status.sent') },
      { value: 'converted', label: t('quotations.status.converted') },
      { value: 'cancelled', label: t('quotations.status.cancelled') },
    ],
    [t],
  );
  const customerData = useMemo(
    () =>
      customers
        .filter((c) => c.isActive && !c.extra?.isDeleted && c.code)
        .map((c) => ({ value: c.code, label: c.extra?.shortName?.trim() || c.name })),
    [customers],
  );
  const staffData = useMemo(
    () =>
      employees
        .filter((e) => e.isActive && !e.extra?.isDeleted)
        .map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );

  const presetLabels: Partial<Record<DateRangePreset, string>> = {
    today: t('common.datePreset.today'),
    yesterday: t('common.datePreset.yesterday'),
    thisWeek: t('common.datePreset.thisWeek'),
    lastWeek: t('common.datePreset.lastWeek'),
    thisMonth: t('common.datePreset.thisMonth'),
    lastMonth: t('common.datePreset.lastMonth'),
    custom: t('common.datePreset.custom'),
  };
  const dateIsDefault = isDefaultLastNDaysRange(dateRange, RANGE_DAYS);

  const desktopFilters: SelectFilter[] = [
    {
      value: statusFilter || null,
      onChange: (v) => setStatusFilter((v ?? '') as '' | QuotationStatus),
      data: statusData,
      placeholder: t('__new__.01-common.labels.status'),
      w: 150,
    },
    {
      value: customerFilter || null,
      onChange: (v) => setCustomerFilter(v ?? ''),
      data: customerData,
      placeholder: t('common.labels.customer'),
      visible: customerData.length > 0,
      searchable: true,
      w: 200,
    },
    {
      value: staffFilter || null,
      onChange: (v) => setStaffFilter(v ?? ''),
      data: staffData,
      placeholder: t('salesOrders.columns.assignedStaff'),
      visible: canViewAll && staffData.length > 0,
      searchable: true,
      w: 200,
    },
  ];

  const mobileFilters: MobileFilterDef[] = [
    {
      title: t('__new__.01-common.labels.status'),
      value: statusFilter || 'all',
      options: [{ value: 'all', label: t('__new__.01-common.filters.all') }, ...statusData],
      onChange: (v) => setStatusFilter((v === 'all' ? '' : v) as '' | QuotationStatus),
    },
    {
      title: t('common.labels.customer'),
      value: customerFilter || 'all',
      options: [{ value: 'all', label: t('__new__.01-common.filters.all') }, ...customerData],
      onChange: (v) => setCustomerFilter(v === 'all' ? '' : v),
      visible: customerData.length > 0,
    },
    {
      title: t('salesOrders.columns.assignedStaff'),
      value: staffFilter || 'all',
      options: [{ value: 'all', label: t('__new__.01-common.filters.all') }, ...staffData],
      onChange: (v) => setStaffFilter(v === 'all' ? '' : v),
      visible: canViewAll && staffData.length > 0,
    },
  ];

  const dateFilter: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'createdAt',
      title: t('common.labels.createdAt'),
      value: dateRange,
      onChange: applyDateRange,
    },
  ];

  const isFirstLoad = loading && !initialized;

  const columns = useMemo(
    () => [
      {
        key: 'code',
        header: t('common.labels.code'),
        width: '160px',
        render: (row: Quotation) => (
          <Text fz="md" fw={500}>
            {row.extra.code}
          </Text>
        ),
      },
      {
        key: 'customer',
        header: t('common.labels.customer'),
        render: (row: Quotation) => <Text fz="sm">{customerName(row)}</Text>,
      },
      {
        key: 'assignedStaff',
        header: t('salesOrders.columns.assignedStaff'),
        render: (row: Quotation) => (
          <Text fz="sm">{row.extra.assignedStaff ? staffName(row.extra.assignedStaff) : '—'}</Text>
        ),
      },
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        width: '130px',
        render: (row: Quotation) => (
          <StatusBadge
            status={row.extra.status ?? 'draft'}
            label={t(`quotations.status.${row.extra.status ?? 'draft'}`)}
          />
        ),
      },
      {
        key: 'total',
        header: t('quotations.form.totalLabel'),
        ta: 'right' as const,
        width: '140px',
        render: (row: Quotation) => (
          <Text fz="sm" ta="right">
            {formatNumber(quotationTotal(row.extra.lines ?? []))}
          </Text>
        ),
      },
      {
        key: 'date',
        header: t('quotations.columns.date'),
        width: '150px',
        render: (row: Quotation) => <QuotationDate row={row} />,
      },
    ],
    [t, customerName, staffName],
  );

  const clearAll = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setCustomerFilter('');
    setStaffFilter('');
    applyDateRange(EMPTY_DATE_RANGE);
  }, [setSearch, applyDateRange]);

  const hasActiveFilters =
    !!search || !!statusFilter || !!customerFilter || !!staffFilter || !dateIsDefault;
  const hasPills = !!statusFilter || !!customerFilter || !!staffFilter || !dateIsDefault;

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={t('quotations.title')}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconFileInvoice size={20} stroke={1.75} />
            </ThemeIcon>
          }
          subtitle={
            <Text size="sm" c="dimmed">
              {t('quotations.countLabel', { count: rows.length })}
            </Text>
          }
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={() => void forceRefresh()}
          createCta={{
            label: t('quotations.actions.new'),
            to: ROUTES.QUOTATIONS.NEW,
            enabled: canCreate,
            mobileVariant: 'hidden',
          }}
        />

        {isMobile ? (
          <MobileFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('quotations.filter.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            hideStatus
            statusLabels={{ all: t('__new__.01-common.filters.all'), active: '', inactive: '' }}
            filters={mobileFilters}
            moreSection={
              <MobileFilterMoreDrawer
                filters={dateFilter}
                drawerTitle={t('common.filters.more')}
                applyLabel={t('common.filters.apply')}
                presetLabels={presetLabels}
              />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        ) : (
          <DesktopFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('quotations.filter.searchPlaceholder')}
            status="all"
            onStatusChange={() => {}}
            hideStatus
            statusLabels={{ all: t('__new__.01-common.filters.all'), active: '', inactive: '' }}
            filters={desktopFilters}
            moreSection={
              <DesktopFilterMorePopover filters={dateFilter} presetLabels={presetLabels} />
            }
            hasActiveFilters={hasActiveFilters}
            onClear={clearAll}
          />
        )}

        {hasPills && (
          <Group gap="xs">
            {statusFilter && (
              <FilterPill onClose={() => setStatusFilter('')}>
                {t('__new__.01-common.labels.status')}:{' '}
                {statusData.find((s) => s.value === statusFilter)?.label ?? statusFilter}
              </FilterPill>
            )}
            {customerFilter && (
              <FilterPill onClose={() => setCustomerFilter('')}>
                {t('common.labels.customer')}:{' '}
                {customerData.find((c) => c.value === customerFilter)?.label ?? customerFilter}
              </FilterPill>
            )}
            {staffFilter && (
              <FilterPill onClose={() => setStaffFilter('')}>
                {t('salesOrders.columns.assignedStaff')}: {staffName(staffFilter)}
              </FilterPill>
            )}
            {!dateIsDefault && (
              <FilterPill onClose={() => applyDateRange(EMPTY_DATE_RANGE)}>
                {t('common.labels.createdAt')}: {formatDateRangeLabel(dateRange, presetLabels)}
              </FilterPill>
            )}
          </Group>
        )}
      </StickyListChrome>

      {isMobile ? (
        !isFirstLoad && paginated.length === 0 ? (
          <Card withBorder radius="md" padding="xl">
            <Text ta="center" c="dimmed">
              {t('quotations.emptyState')}
            </Text>
          </Card>
        ) : (
          <Stack gap="sm">
            {paginated.map((row) => (
              <Card
                key={row.id}
                withBorder
                radius="md"
                padding="md"
                onClick={() => navigate(detailRoute(row.id))}
                style={{ cursor: 'pointer' }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fz="md" fw={500}>
                      {row.extra.code}
                    </Text>
                    <Text size="sm" c="dimmed" truncate>
                      {customerName(row)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {row.extra.assignedStaff ? `${staffName(row.extra.assignedStaff)} · ` : ''}
                      {formatDate(quotationListDate(row).at)}
                    </Text>
                  </Stack>
                  <Stack gap={4} align="flex-end">
                    <StatusBadge
                      status={row.extra.status ?? 'draft'}
                      label={t(`quotations.status.${row.extra.status ?? 'draft'}`)}
                    />
                    <Text fw={600}>{formatNumber(quotationTotal(row.extra.lines ?? []))}</Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        )
      ) : (
        <ListDataTable
          data={paginated}
          columns={columns}
          isLoading={isFirstLoad}
          emptyMessage={t('quotations.emptyState')}
          detailRoute={ROUTES.QUOTATIONS.DETAIL}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Stack>
  );
}

function StatusBadge({ status, label }: { status: QuotationStatus; label: string }) {
  const { color, variant } = quotationBadgeProps(status);
  return (
    <Badge color={color} variant={variant}>
      {label}
    </Badge>
  );
}

function QuotationDate({ row }: { row: Quotation }) {
  const { t } = useTranslation();
  const d = quotationListDate(row);
  return (
    <>
      <Text size="sm">{formatDate(d.at)}</Text>
      <Text size="xs" c="dimmed">
        {t(`quotations.dateKind.${d.kind}`)}
      </Text>
    </>
  );
}
