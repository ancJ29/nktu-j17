import { Fragment, type ReactNode } from 'react';
import { ActionIcon, Box, Button, Group, Stack } from '@mantine/core';
import { SearchInput } from './SearchInput';
import { LIST_SEARCH_MIN_ROWS } from '@/config/listDefaults';
import { IconFilterOff, IconSearch } from '@tabler/icons-react';
import { MobileFilterSelect } from './MobileFilterSelect';

type FilterStatus = 'all' | 'active' | 'inactive';

const CHIPS_PER_ROW = 2;

type MobileFilterChipDisplay = {
  displayValue?: string;
};

export type MobileFilterDef = MobileFilterChipDisplay & {
  title: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  visible?: boolean;
  multi?: false;
};

export type MobileMultiFilterDef = MobileFilterChipDisplay & {
  title: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (value: string[]) => void;
  visible?: boolean;
  multi: true;
};

type MobileFilterBarProps = {
  noSearchInput?: boolean;

  recordCount?: number;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;

  status?: FilterStatus;
  onStatusChange?: (value: FilterStatus) => void;
  statusTitle?: string;

  statusLabels?: { all: string; active: string; inactive: string };

  hideStatus?: boolean;

  filters?: (MobileFilterDef | MobileMultiFilterDef)[];

  moreSection?: ReactNode;
  onClear: () => void;

  hasActiveFilters?: boolean;

  clearLabel?: string;

  actionsBelow?: boolean;

  labelChips?: boolean;

  wrapFilters?: boolean;
};

export function MobileFilterBar({
  search,
  noSearchInput,
  recordCount,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  statusTitle,
  statusLabels,
  hideStatus,
  filters,
  moreSection,
  onClear,
  hasActiveFilters: hasActiveFiltersProp,
  clearLabel: clearLabelProp,
  actionsBelow: actionsBelowProp,
  labelChips,
  wrapFilters: wrapFiltersProp,
}: MobileFilterBarProps) {
  const hasActiveFilters =
    hasActiveFiltersProp ??
    (!!search ||
      (!hideStatus && (status ?? 'all') !== 'all') ||
      filters?.some((f) => (f.multi ? f.value.length > 0 : f.value && f.value !== 'all')) === true);

  const visibleFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [];

  if (!hideStatus && statusLabels) {
    visibleFilters.push({
      title: statusTitle ?? '',
      value: status ?? 'all',
      options: [
        { value: 'all', label: statusLabels.all },
        { value: 'active', label: statusLabels.active },
        { value: 'inactive', label: statusLabels.inactive },
      ],
      onChange: (v) => onStatusChange?.(v as FilterStatus),
    });
  }

  if (filters) {
    for (const f of filters) {
      if ((f.visible ?? true) && f.options.length > 0) {
        visibleFilters.push(f);
      }
    }
  }

  const showSearch =
    !noSearchInput && (recordCount === undefined || recordCount > LIST_SEARCH_MIN_ROWS);

  const labelled = !!labelChips || !!clearLabelProp;
  const clearLabel = clearLabelProp;
  const wrapFilters = wrapFiltersProp ?? (labelled && visibleFilters.length > CHIPS_PER_ROW);
  const actionsBelow = actionsBelowProp ?? (labelled && !!moreSection);

  const chips = visibleFilters.map((f, i) => {
    const chip = f.multi ? (
      <MobileFilterSelect
        title={f.title}
        value={f.value}
        options={f.options}
        onChange={f.onChange}
        showTitleInBar={labelChips}
        displayValue={f.displayValue}
        multi
      />
    ) : (
      <MobileFilterSelect
        title={f.title}
        value={f.value}
        options={f.options}
        onChange={f.onChange}
        showTitleInBar={labelChips}
        displayValue={f.displayValue}
      />
    );

    return wrapFilters ? (
      <Box key={i} style={{ flex: '1 1 45%', minWidth: 0, display: 'flex' }}>
        {chip}
      </Box>
    ) : (
      <Fragment key={i}>{chip}</Fragment>
    );
  });

  const clearControl = !hasActiveFilters ? null : clearLabel ? (
    <Button
      variant="subtle"
      size="compact-sm"
      color="orange"
      leftSection={<IconFilterOff size={14} />}
      onClick={onClear}
      style={{ flexShrink: 0 }}
    >
      {clearLabel}
    </Button>
  ) : (
    <ActionIcon
      variant="subtle"
      color="orange"
      size="lg"
      onClick={onClear}
      style={{ flexShrink: 0 }}
    >
      <IconFilterOff size={16} />
    </ActionIcon>
  );

  const actions = moreSection || clearControl;

  return (
    <Stack gap="sm">
      {/* Line 1: Search — omitted on a list short enough to read at a glance. */}
      {showSearch && (
        <SearchInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={onSearchChange}
        />
      )}
      {/* Line 2 (+3): Filter chips, then more + clear — same row unless
          `actionsBelow` splits them or `wrapFilters` flows them. */}
      {actionsBelow ? (
        <Stack gap="xs">
          <Group gap="xs" wrap={wrapFilters ? 'wrap' : 'nowrap'}>
            {chips}
          </Group>
          {actions && (
            <Group gap="xs" wrap="nowrap">
              {moreSection}
              {clearControl}
            </Group>
          )}
        </Stack>
      ) : (
        <Group gap="xs" wrap={wrapFilters ? 'wrap' : 'nowrap'}>
          {chips}
          {moreSection}
          {clearControl}
        </Group>
      )}
    </Stack>
  );
}
