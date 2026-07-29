import { Fragment, type ReactNode } from 'react';
import { ActionIcon, Box, Button, Group, Stack, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { SearchInput } from './SearchInput';
import { IconFilterOff, IconLink, IconSearch } from '@tabler/icons-react';
import { MobileFilterSelect } from './MobileFilterSelect';
import { URL_KEY } from '@/hooks/useUrlFilterState';
import { useCopyLink } from '@/hooks/useCopyLink';

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
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const canCopyLink = params.has(URL_KEY);
  const handleCopyLink = useCopyLink();

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

  const labelled = !!labelChips || !!clearLabelProp;
  const clearLabel =
    clearLabelProp ?? (labelChips ? t('__new__.01-common.actions.clearFilters') : undefined);
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

  const clearControl = clearLabel ? (
    <Button
      variant="subtle"
      size="compact-sm"
      color={hasActiveFilters ? 'orange' : 'gray'}
      leftSection={<IconFilterOff size={14} />}
      disabled={!hasActiveFilters}
      onClick={onClear}
      style={{ flexShrink: 0 }}
    >
      {clearLabel}
    </Button>
  ) : (
    <ActionIcon
      variant="subtle"
      color={hasActiveFilters ? 'orange' : 'gray'}
      size="lg"
      disabled={!hasActiveFilters}
      onClick={onClear}
      style={{ flexShrink: 0 }}
    >
      <IconFilterOff size={16} />
    </ActionIcon>
  );

  const copyLinkControl = (
    <Tooltip label={t('__new__.01-common.actions.copyLink')} withArrow>
      <ActionIcon
        disabled={!canCopyLink}
        variant="subtle"
        color="blue"
        size="lg"
        onClick={handleCopyLink}
        style={{ flexShrink: 0 }}
      >
        <IconLink size={16} />
      </ActionIcon>
    </Tooltip>
  );

  return (
    <Stack gap="sm">
      {/* Line 1: Search */}
      {!noSearchInput && (
        <SearchInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={onSearchChange}
        />
      )}
      {/* Line 2 (+3): Filter chips, then more + copy-link + clear — same row
          unless `actionsBelow` splits them or `wrapFilters` flows them. */}
      {actionsBelow ? (
        <Stack gap="xs">
          <Group gap="xs" wrap={wrapFilters ? 'wrap' : 'nowrap'}>
            {chips}
          </Group>
          <Group gap="xs" wrap="nowrap">
            {moreSection}
            {copyLinkControl}
            {clearControl}
          </Group>
        </Stack>
      ) : (
        <Group gap="xs" wrap={wrapFilters ? 'wrap' : 'nowrap'}>
          {chips}
          {moreSection}
          {copyLinkControl}
          {clearControl}
        </Group>
      )}
    </Stack>
  );
}
