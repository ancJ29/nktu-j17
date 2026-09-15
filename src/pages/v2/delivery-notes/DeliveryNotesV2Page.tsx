import { Group, Stack, Text } from '@mantine/core';
import type { DataTableColumn } from '@credo/base-ui/components';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeliveryNoteConfigAlerts, DeliveryNoteV2StatusBadge } from './chrome';
import { useDatePresetLabels } from '@/hooks/useDatePresetLabels';
import { useNavigate } from 'react-router';
import { DesktopFilterBar, type MultiSelectFilter } from '@/components/DesktopFilterBar';
import { summarizeSelection } from '@/components/desktopFilterDefs';
import { DesktopFilterMorePopover } from '@/components/DesktopFilterMorePopover';
import { FilterPill } from '@/components/FilterPill';
import { ListDataTable } from '@/components/ListDataTable';
import { ListPageHeader } from '@/components/ListPageHeader';
import { PostingPendingBadge } from '@/components/PostingPendingBadge';
import { StickyListChrome } from '@/components/StickyListChrome';
import { ROUTES } from '@/constants/routes';
import { LIST_LAZY_RENDER_CHUNK } from '@/config/listDefaults';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { setDeliveryNoteV2Range, useDeliveryNoteV2Store } from '@/stores/useDeliveryNoteV2Store';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DeliveryNoteV2 } from '@/types/delivery-note-v2';
import { EMPTY_DATE_RANGE, type MoreFilterDef } from '@/types/date-range';
import { featureFlags } from '@/utils/features';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { formatDateRangeLabel } from '@/utils/listFilterDateRange';
import { customFieldColumnKey, readCustomFieldValue } from '@/utils/customFields';
import { orderListColumns } from '@/utils/listColumnOrder';
import { anchorDayOf, inDayRange } from '../anchorDay';
import { useTransactionalV2ListFilters } from '../useTransactionalV2ListFilters';
import { useDeliveryNoteCustomFields } from './customFields';
import { deliveryNoteListColumns, deliveryNoteHiddenColumns } from './listColumns';
import {
  deliveryNoteDefaultListStatuses,
  deliveryNoteFlow,
  deliveryNoteStatusDisplay,
} from './statusFlow';

const RANGE_DAYS = featureFlags.deliveryNotesV2.defaultRangeDays;

const MULTI_KEYS = ['deliveryTypes', 'assigneeIds'] as const;

export function DeliveryNotesV2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const notes = useDeliveryNoteV2Store((s) => s.items);
  const loading = useDeliveryNoteV2Store((s) => s.loading);
  const initialized = useDeliveryNoteV2Store((s) => s.initialized);
  const loadAll = useDeliveryNoteV2Store((s) => s.loadAll);
  const forceRefresh = useDeliveryNoteV2Store((s) => s.forceRefresh);
  const cachedAt = useDeliveryNoteV2Store((s) => s.cachedAt);

  const myEmployeeId = useAuthStore((s) => s.user?.myInformation?.id ?? '');

  const scrollViewportRef = useListScrollRestoration(ROUTES.DELIVERY_NOTES_V2.LIST);

  const filters = useTransactionalV2ListFilters({
    cacheKey: 'cmngt:delivery-note-v2-filters',
    defaultStatuses: deliveryNoteDefaultListStatuses,
    rangeDays: RANGE_DAYS,
    multiKeys: MULTI_KEYS,
    setStoreRange: setDeliveryNoteV2Range,
    loadAll,
    forceRefresh,
  });
  const { statuses, search, dateRange, anchorRange } = filters;
  const deliveryTypes = filters.multi.deliveryTypes;
  const assigneeIds = filters.multi.assigneeIds;
  const setMulti = filters.setMulti;
  const setDeliveryTypes = useCallback(
    (values: string[]) => setMulti('deliveryTypes', values),
    [setMulti],
  );

  const [mineOnly, setMineOnly] = useState(false);

  const matches = useCallback(
    (note: DeliveryNoteV2, needle: string) =>
      [
        note.noteNumber,
        note.salesOrderNumber,
        note.customerName,
        note.assignedToName,
        note.carrier,
        note.reference,
        note.notes,
      ]
        .concat(note.items.flatMap((line) => [line.itemCode, line.itemName]))
        .some((field) => (field ?? '').toLowerCase().includes(needle)),
    [],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return notes.filter(
      (note) =>
        (note.derivativesPending === true ||
          statuses.length === 0 ||
          statuses.includes(note.status)) &&
        (deliveryTypes.length === 0 || deliveryTypes.includes(note.deliveryType)) &&
        (!mineOnly || (myEmployeeId !== '' && note.assignedTo === myEmployeeId)) &&
        (assigneeIds.length === 0 ||
          (note.assignedTo !== undefined && assigneeIds.includes(note.assignedTo))) &&
        inDayRange(anchorDayOf(note.deliveryDate, note.createdAt), anchorRange) &&
        (needle === '' || matches(note, needle)),
    );
  }, [
    notes,
    statuses,
    deliveryTypes,
    mineOnly,
    myEmployeeId,
    assigneeIds,
    anchorRange,
    search,
    matches,
  ]);

  const assigneeLabel = useCallback(
    (id: string) => notes.find((note) => note.assignedTo === id)?.assignedToName ?? id,
    [notes],
  );

  const { paginated, totalItems, hasMore, loadMore } = useListFilter(filtered, {
    shouldPagination: false,
    lazyKey: ROUTES.DELIVERY_NOTES_V2.LIST,
  });

  const customFields = useDeliveryNoteCustomFields();
  const listFields = useMemo(
    () => customFields.filter((field) => field.showInList === true),
    [customFields],
  );

  const columns = useMemo<Array<DataTableColumn<DeliveryNoteV2>>>(() => {
    const built: Array<DataTableColumn<DeliveryNoteV2>> = [
      {
        key: 'noteNumber',
        header: t('deliveryNotesV2.columns.noteNumber'),
        render: (row) => <Text fw={500}>{row.noteNumber}</Text>,
      },
      {
        key: 'salesOrderNumber',
        header: t('deliveryNotesV2.columns.salesOrder'),
        render: (row) => row.salesOrderNumber || '—',
      },
      {
        key: 'customerName',
        header: t('deliveryNotesV2.columns.customer'),
        render: (row) => row.customerName ?? '—',
      },
      {
        key: 'deliveryType',
        header: t('deliveryNotesV2.columns.deliveryType'),
        render: (row) => t(`deliveryNotesV2.deliveryType.${row.deliveryType}`),
      },
      {
        key: 'assignedToName',
        header: t('deliveryNotesV2.columns.assignedTo'),
        render: (row) => row.assignedToName ?? row.carrier ?? '—',
      },
      {
        key: 'deliveryDate',
        header: t('deliveryNotesV2.columns.deliveryDate'),
        render: (row) => (row.deliveryDate ? formatDate(row.deliveryDate) : '—'),
      },
      {
        key: 'items',
        header: t('deliveryNotesV2.columns.items'),
        render: (row) => formatNumber(row.items.length),
      },
      {
        key: 'totalQuantity',
        header: t('deliveryNotesV2.columns.totalQuantity'),
        render: (row) => formatNumber(row.totalQuantity),
      },
      {
        key: 'status',
        header: t('deliveryNotesV2.columns.status'),
        render: (row) => (
          <Group gap={6} wrap="nowrap">
            <DeliveryNoteV2StatusBadge status={row.status} />
            {row.derivativesPending === true && (
              <PostingPendingBadge
                label={t('deliveryNotesV2.pending.badge')}
                hint={t('deliveryNotesV2.pending.message')}
              />
            )}
          </Group>
        ),
      },
      ...listFields.map((field) => ({
        key: customFieldColumnKey(field.key),
        header: field.label,
        render: (row: DeliveryNoteV2) => readCustomFieldValue(row.extra, field) ?? '—',
      })),
    ];
    return orderListColumns(built, deliveryNoteListColumns, deliveryNoteHiddenColumns);
  }, [t, listFields]);

  const openRow = useCallback(
    (row: DeliveryNoteV2) => void navigate(ROUTES.DELIVERY_NOTES_V2.DETAIL.replace(':id', row.id)),
    [navigate],
  );

  const statusOptions = useMemo(
    () =>
      deliveryNoteFlow.statuses.map(({ value }) => ({
        value,
        label: deliveryNoteStatusDisplay(t, value).label,
      })),
    [t],
  );

  const typeOptions = useMemo(
    () => [
      { value: 'internal', label: t('deliveryNotesV2.deliveryType.internal') },
      { value: 'external', label: t('deliveryNotesV2.deliveryType.external') },
    ],
    [t],
  );

  const barFilters: MultiSelectFilter[] = [
    {
      multi: true,
      value: statuses,
      onChange: filters.setStatuses,
      data: statusOptions,
      placeholder: summarizeSelection(
        statuses,
        statusOptions,
        t('deliveryNotesV2.columns.status'),
        t('common.filters.statusCount', { count: statuses.length }),
      ),
      w: 220,
    },
    {
      multi: true,
      value: deliveryTypes,
      onChange: setDeliveryTypes,
      data: typeOptions,
      placeholder: summarizeSelection(
        deliveryTypes,
        typeOptions,
        t('deliveryNotesV2.columns.deliveryType'),
        t('common.filters.statusCount', { count: deliveryTypes.length }),
      ),
      w: 200,
    },
  ];

  const presetLabels = useDatePresetLabels();

  const moreFilters: MoreFilterDef[] = [
    {
      type: 'dateRange',
      key: 'partitionDay',
      title: t('deliveryNotesV2.filters.period'),
      value: dateRange,
      onChange: filters.setDateRange,
    },
  ];

  const dateIsDefault = filters.dateRangeIsDefault;
  const statusIsDefault = filters.statusesAreDefault;
  const hasPills =
    (!statusIsDefault && statuses.length > 0) ||
    deliveryTypes.length > 0 ||
    assigneeIds.length > 0 ||
    anchorRange !== undefined ||
    mineOnly ||
    !dateIsDefault;

  const clearAll = useCallback(() => {
    filters.clearFilters();
    setMineOnly(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.clearFilters]);

  return (
    <Stack gap="md">
      <DeliveryNoteConfigAlerts />
      <StickyListChrome>
        <ListPageHeader
          title={t('nav.deliveryNotesV2')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={() => void forceRefresh()}
        />
        <DesktopFilterBar
          search={search}
          onSearchChange={filters.setSearch}
          searchPlaceholder={t('deliveryNotesV2.searchPlaceholder')}
          hideStatus
          filters={barFilters}
          moreSection={
            <DesktopFilterMorePopover filters={moreFilters} presetLabels={presetLabels} />
          }
          hasActiveFilters={filters.hasActiveFilters || mineOnly}
          onClear={clearAll}
        />

        {hasPills && (
          <Group gap="xs">
            {!statusIsDefault &&
              statuses.map((value) => (
                <FilterPill
                  key={value}
                  onClose={() => filters.setStatuses(statuses.filter((kept) => kept !== value))}
                >
                  {t('deliveryNotesV2.columns.status')}: {deliveryNoteStatusDisplay(t, value).label}
                </FilterPill>
              ))}
            {deliveryTypes.map((value) => (
              <FilterPill
                key={value}
                onClose={() => setDeliveryTypes(deliveryTypes.filter((kept) => kept !== value))}
              >
                {t('deliveryNotesV2.columns.deliveryType')}:{' '}
                {typeOptions.find((option) => option.value === value)?.label ?? value}
              </FilterPill>
            ))}
            {assigneeIds.map((id) => (
              <FilterPill
                key={id}
                onClose={() =>
                  setMulti(
                    'assigneeIds',
                    assigneeIds.filter((kept) => kept !== id),
                  )
                }
              >
                {t('deliveryNotesV2.columns.assignedTo')}: {assigneeLabel(id)}
              </FilterPill>
            ))}
            {anchorRange && (
              <FilterPill onClose={filters.clearAnchorRange}>
                {t('deliveryNotesV2.filters.deliveryDate')}: {formatDate(anchorRange.from)} –{' '}
                {formatDate(anchorRange.to)}
              </FilterPill>
            )}
            {mineOnly && (
              <FilterPill onClose={() => setMineOnly(false)}>
                {t('deliveryNotesV2.filters.mine')}
              </FilterPill>
            )}
            {/* A linked business window owns the period; the widened query behind it is not a pill. */}
            {!dateIsDefault && !anchorRange && (
              <FilterPill onClose={() => filters.setDateRange(EMPTY_DATE_RANGE)}>
                {t('deliveryNotesV2.filters.period')}:{' '}
                {formatDateRangeLabel(dateRange, presetLabels)}
              </FilterPill>
            )}
          </Group>
        )}
      </StickyListChrome>

      <ListDataTable
        data={paginated}
        columns={columns}
        isLoading={loading && !initialized}
        emptyMessage={t('deliveryNotesV2.noItems')}
        onRowClick={openRow}
        viewportRef={scrollViewportRef}
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadingMoreLabel={t('__new__.01-common.list.loadingMore', {
          chunk: Math.min(totalItems - paginated.length, LIST_LAZY_RENDER_CHUNK),
          total: totalItems,
        })}
      />
    </Stack>
  );
}
