import { Button, Drawer, Divider, Group, Modal, Stack, Text } from '@mantine/core';
import { CodeLabel, type DataTableColumn } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useDisclosure } from '@mantine/hooks';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ActiveBadge } from '@/components/badges';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DesktopFilterBar } from '@/components/DesktopFilterBar';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import { Form } from '@/components/Form';
import { ListCardList } from '@/components/ListCardList';
import { ListDataTable } from '@/components/ListDataTable';
import { MobileFilterBar } from '@/components/MobileFilterBar';
import { MobileFilterMoreDrawer } from '@/components/MobileFilterMoreDrawer';
import { ListPageHeader } from '@/components/ListPageHeader';
import { ListPagination } from '@/components/custom/ListPagination';
import { QuickFilterChips } from '@/components/QuickFilterChips';
import { StickyListChrome } from '@/components/StickyListChrome';
import {
  LIST_LAZY_RENDER_CHUNK,
  LIST_PAGE_SIZE,
  LIST_PAGINATION_DEFAULT,
  LIST_PAGINATION_MIN_ROWS,
} from '@/config/listDefaults';
import { useCachedListFilters } from '@/hooks/useCachedListFilters';
import { useListFilter } from '@/hooks/useListFilter';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import type { MoreFilterDef } from '@/types/date-range';
import { orderListColumns } from '@/utils/listColumnOrder';
import { MasterDataDetailHeader } from './MasterDataDetailHeader';
import { MasterDataFormFields } from './MasterDataFormFields';
import type {
  MasterDataFormValues,
  MasterDataListFiltersHook,
  MasterDataRow,
  MasterDataSpec,
} from './spec';
import { useMasterDataForm, useMasterDataList, useMasterDataWrites } from './useMasterDataWrites';

type FilterStatus = 'all' | 'active' | 'inactive';
type ListFilters = {
  status: FilterStatus;
  search: string;
  page: number;

  extra?: Record<string, string>;
};

const FILTER_DEFAULTS: ListFilters = { status: 'active', search: '', page: 1 };
const NO_EXTRA: Readonly<Record<string, string>> = {};

const NO_FILTERS: ReturnType<MasterDataListFiltersHook<MasterDataRow>> = {
  filters: [],
  chips: [],
  predicate: () => true,
};
const useNoListFilters = () => NO_FILTERS;

const isMobile = device.isMobile;

export function MasterDataListPage<Row extends MasterDataRow, Values extends MasterDataFormValues>({
  spec,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollViewportRef = useListScrollRestoration(spec.routes.LIST);
  const text = useMemo(() => spec.text(t), [spec, t]);
  const { items, initialized, loading, cachedAt, loadAll, forceRefresh } = useMasterDataList(spec);
  const { save, archive, busy } = useMasterDataWrites(spec);

  useEffect(() => {
    if (!initialized && !loading) void loadAll();
  }, [initialized, loading, loadAll]);

  const live = useMemo(() => items.filter((row) => !row.extra?.isDeleted), [items]);

  const sorted = useMemo(() => [...live].sort((a, b) => a.code.localeCompare(b.code)), [live]);

  const shouldPagination = LIST_PAGINATION_DEFAULT && live.length >= LIST_PAGINATION_MIN_ROWS;

  const {
    state: filterState,
    updateState,
    clearFilters,
  } = useCachedListFilters(spec.filterCacheKey, FILTER_DEFAULTS);
  const onSearchChange = useCallback((v: string) => updateState({ search: v }), [updateState]);
  const onPageChange = useCallback((p: number) => updateState({ page: p }), [updateState]);
  const setStatus = useCallback((v: FilterStatus) => updateState({ status: v }), [updateState]);

  const extraValues = filterState.extra ?? NO_EXTRA;
  const setExtraValue = useCallback(
    (key: string, value: string | null) => {
      const next = { ...(filterState.extra ?? {}) };
      if (value === null) delete next[key];
      else next[key] = value;

      updateState({ extra: Object.keys(next).length > 0 ? next : undefined });
    },
    [filterState.extra, updateState],
  );

  const useRegisterFilters = spec.list.useFilters ?? useNoListFilters;
  const registerFilters = useRegisterFilters(live, extraValues, setExtraValue);

  const listFilters = useMemo(
    () => ({ status: filterState.status, ...extraValues }),
    [filterState.status, extraValues],
  );

  const registerPredicate = registerFilters.predicate;
  const filterFn = useCallback(
    (item: Row, f: { status: FilterStatus }) => {
      if (f.status === 'active' && !item.isActive) return false;
      if (f.status === 'inactive' && item.isActive) return false;
      return registerPredicate(item);
    },
    [registerPredicate],
  );

  const {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    paginated,
    totalPages,
    totalItems,
    hasMore,
    loadMore,
  } = useListFilter(sorted, {
    shouldPagination,
    pageSize: LIST_PAGE_SIZE,
    filters: listFilters,
    filterFn,
    searchFields: spec.list.searchFields,
    search: filterState.search,
    onSearchChange,
    page: filterState.page,
    onPageChange,

    lazyKey: spec.routes.LIST,
  });

  const hasActiveFilters =
    !!search ||
    filterState.status !== FILTER_DEFAULTS.status ||
    Object.keys(extraValues).length > 0;

  const entityColumns = spec.list.useColumns(live);
  const secondaryOf = spec.list.secondaryOf;

  const ignoreColumns = useMemo(
    () => new Set(spec.list.ignoreColumns ?? []),
    [spec.list.ignoreColumns],
  );

  const displayOrderColumns = useMemo(
    () => spec.list.displayOrderColumns ?? {},
    [spec.list.displayOrderColumns],
  );

  const columns = useMemo<Array<DataTableColumn<Row>>>(() => {
    const kept: Array<DataTableColumn<Row>> = [
      {
        key: 'code',
        width: '180px',
        header: t('common.labels.code'),
        render: (item: Row) => <CodeLabel code={item.code} size="sm" fw={600} />,
      },
      {
        key: 'name',
        header: t('common.labels.name'),
        render: (item: Row) => {
          const secondary = secondaryOf?.(item);
          return (
            <Stack gap={2}>
              <Text fz="md" fw={500}>
                {item.name}
              </Text>
              {secondary ? (
                <Text size="xs" c="dimmed">
                  {secondary}
                </Text>
              ) : null}
            </Stack>
          );
        },
      },
      ...entityColumns,
      {
        key: 'status',
        width: '120px',
        ta: 'right' as const,
        header: t('__new__.01-common.labels.status'),
        render: (item: Row) => (
          <Group justify="flex-end">
            <ActiveBadge
              isActive={item.isActive}
              activeLabel={text.statusLabels?.active ?? t('__new__.01-common.labels.active')}
              inactiveLabel={text.statusLabels?.inactive ?? t('__new__.01-common.labels.inactive')}
              size="sm"
            />
          </Group>
        ),
      },
    ].filter((column) => !ignoreColumns.has(column.key));

    const rank = (key: string, index: number) => displayOrderColumns[key] ?? (index + 1) * 1e6;
    const ranked = kept
      .map((column, index) => ({ column, rank: rank(column.key, index) }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ column }) => column);
    return orderListColumns(ranked, spec.list.listColumnOrder ?? [], spec.list.hiddenColumns ?? []);
  }, [
    t,
    entityColumns,
    ignoreColumns,
    displayOrderColumns,
    secondaryOf,
    spec.list.listColumnOrder,
    spec.list.hiddenColumns,
    text.statusLabels,
  ]);

  const mobileMoreFilters = useMemo<MoreFilterDef[]>(
    () => [
      {
        type: 'select',
        key: 'status',
        title: t('__new__.01-common.labels.status'),
        value: filterState.status,
        restingValue: FILTER_DEFAULTS.status,
        options: [
          { value: 'all', label: t('common.filters.all') },
          {
            value: 'active',
            label: text.statusLabels?.active ?? t('__new__.01-common.labels.active'),
          },
          {
            value: 'inactive',
            label: text.statusLabels?.inactive ?? t('__new__.01-common.labels.inactive'),
          },
        ],
        onChange: (value) => setStatus((value ?? FILTER_DEFAULTS.status) as FilterStatus),
      },
      ...registerFilters.filters
        .filter((f) => (f.visible ?? true) && f.data.length > 0)
        .map<MoreFilterDef>((f, index) => ({
          type: 'select',
          key: f.title ?? `filter-${index}`,

          title: f.title ?? f.placeholder,
          placeholder: f.placeholder,
          value: f.value,
          options: (f.data as Array<{ value: string; label: string }>).map((option) => ({
            value: option.value,
            label: option.label,
          })),
          onChange: f.onChange,
        })),
    ],
    [t, text.statusLabels, filterState.status, setStatus, registerFilters.filters],
  );

  const MobileCard = spec.mobile?.Card;
  const loadingMoreLabel = t('__new__.01-common.list.loadingMore', {
    chunk: Math.min(totalItems - paginated.length, LIST_LAZY_RENDER_CHUNK),
    total: totalItems,
  });

  const [viewing, setViewing] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [archiveTarget, setArchiveTarget] = useState<Row | null>(null);

  const form = useMasterDataForm(spec, null);

  const openCreate = useCallback(() => {
    if (!spec.simpleMode) return void navigate(spec.routes.NEW);
    setEditing(null);
    form.setValues(spec.form.empty);
    openForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, navigate, openForm]);

  const openEdit = useCallback(
    (row: Row) => {
      setEditing(row);
      form.setValues(spec.form.valuesOf(row));
      setViewing(null);
      openForm();
    },

    [spec, openForm],
  );

  const openRow = useCallback(
    (row: Row) => {
      if (spec.simpleMode && !isMobile) setViewing(row);
      else navigate(spec.routes.DETAIL.replace(':id', row.id));
    },
    [spec, navigate],
  );

  const handleSubmit = useCallback(
    async (values: Values) => {
      if (await save(values, editing, form)) closeForm();
    },
    [save, editing, form, closeForm],
  );

  const handleArchive = useCallback(async () => {
    if (!archiveTarget) return;
    if (await archive(archiveTarget)) {
      setArchiveTarget(null);
      setViewing(null);
    }
  }, [archive, archiveTarget]);

  const Shell = isMobile && !spec.mobile ? DesktopOnlyGuard : Fragment;

  return (
    <Shell>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        <StickyListChrome>
          <ListPageHeader
            title={text.navTitle}
            cachedAt={cachedAt}
            loading={loading}
            onRefresh={forceRefresh}
            createCta={{
              label: text.addItem,
              enabled: spec.can.create,
              onClick: openCreate,

              mobileVariant: 'hidden',
            }}
          />
          {/* Between the header and the bar (filter-pattern § 11), and on
              desktop too — `QuickFilterChips` is viewport-agnostic and these
              are the register's own one-click readings of a dimension the bar
              already carries. Renders nothing when a register offers none. */}
          <QuickFilterChips chips={registerFilters.chips ?? []} />
          {isMobile ? (
            <MobileFilterBar
              recordCount={live.length}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={text.searchPlaceholder}
              hideStatus
              moreSection={
                <MobileFilterMoreDrawer
                  filters={mobileMoreFilters}
                  drawerTitle={t('common.filters.more')}
                  applyLabel={t('common.filters.apply')}
                />
              }
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : (
            <DesktopFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={text.searchPlaceholder}
              status={filterState.status}
              onStatusChange={setStatus}
              statusLabels={{
                all: t('common.filters.all'),
                active: text.statusLabels?.active ?? t('__new__.01-common.labels.active'),
                inactive: text.statusLabels?.inactive ?? t('__new__.01-common.labels.inactive'),
              }}
              filters={registerFilters.filters}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          )}
        </StickyListChrome>

        {isMobile && MobileCard ? (
          <ListCardList
            data={paginated}
            isLoading={loading && !initialized}
            emptyMessage={text.noItems}
            onRowClick={openRow}
            renderCard={(row) => <MobileCard row={row} />}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMoreLabel={loadingMoreLabel}
          />
        ) : (
          <ListDataTable
            data={paginated}
            columns={columns}
            isLoading={loading && !initialized}
            emptyMessage={text.noItems}
            onRowClick={openRow}
            viewportRef={scrollViewportRef}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMoreLabel={loadingMoreLabel}
          />
        )}

        <ListPagination
          shouldPagination={shouldPagination}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        {/* Simple mode only — full mode navigates instead, and never sets these. */}
        <Drawer
          opened={!!viewing}
          onClose={() => setViewing(null)}
          position="right"
          size="75vw"
          title={text.detailTitle}
          padding="lg"
        >
          {viewing ? (
            <Stack gap="lg">
              <MasterDataDetailHeader spec={spec} row={viewing} showTimestamps={false} />
              <Divider />
              <spec.DetailBody row={viewing} />
              {spec.DetailSide ? <spec.DetailSide row={viewing} /> : null}
              <Group gap="sm">
                {spec.can.edit && (
                  <Button
                    leftSection={<IconPencil size={14} />}
                    onClick={() => openEdit(viewing)}
                    variant="light"
                  >
                    {t('common.actions.edit')}
                  </Button>
                )}
                {spec.can.delete && (
                  <Button
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    variant="subtle"
                    onClick={() => setArchiveTarget(viewing)}
                  >
                    {t('common.actions.remove')}
                  </Button>
                )}
              </Group>
            </Stack>
          ) : null}
        </Drawer>

        <Modal
          opened={formOpened}
          onClose={closeForm}
          title={editing ? text.editItem : text.addItem}
          centered
          size="lg"
          padding={0}
        >
          <Form form={form} onSubmit={handleSubmit}>
            {/* No SectionCards here: a dialog is already a card, and nesting one
                per cluster reads as chrome rather than structure. */}
            <Stack gap="md" p="md">
              <MasterDataFormFields spec={spec} form={form} isEditing={!!editing} />
            </Stack>
            <Group
              justify="flex-end"
              gap="sm"
              p="md"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <Button variant="default" onClick={closeForm}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" loading={busy}>
                {editing ? text.updateButton : text.createButton}
              </Button>
            </Group>
          </Form>
        </Modal>

        <ConfirmModal
          opened={!!archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={handleArchive}
          title={text.archive.title}
          message={text.archive.message(archiveTarget?.name ?? '')}
          loading={busy}
        />
      </Stack>
    </Shell>
  );
}
