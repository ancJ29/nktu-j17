import type { ReactNode } from 'react';
import { ActionIcon, Group, Stack } from '@mantine/core';
import { SearchInput } from './SearchInput';
import { IconFilterOff, IconSearch } from '@tabler/icons-react';
import { MobileFilterSelect } from './MobileFilterSelect';

type FilterStatus = 'all' | 'active' | 'inactive';

export type MobileFilterDef = {
  title: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  visible?: boolean;
  multi?: false;
};

export type MobileMultiFilterDef = {
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
  statusLabels: { all: string; active: string; inactive: string };

  hideStatus?: boolean;

  filters?: (MobileFilterDef | MobileMultiFilterDef)[];

  moreSection?: ReactNode;
  onClear: () => void;

  hasActiveFilters?: boolean;
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
}: MobileFilterBarProps) {
  const hasActiveFilters =
    hasActiveFiltersProp ??
    (!!search ||
      status !== 'all' ||
      filters?.some((f) => (f.multi ? f.value.length > 0 : f.value && f.value !== 'all')) === true);

  const visibleFilters: (MobileFilterDef | MobileMultiFilterDef)[] = [];

  if (!hideStatus) {
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
      {/* Line 2: Filter buttons + more + copy-link + clear */}
      <Group gap="xs" wrap="nowrap">
        {visibleFilters.map((f, i) =>
          f.multi ? (
            <MobileFilterSelect
              key={i}
              title={f.title}
              value={f.value}
              options={f.options}
              onChange={f.onChange}
              multi
            />
          ) : (
            <MobileFilterSelect
              key={i}
              title={f.title}
              value={f.value}
              options={f.options}
              onChange={f.onChange}
            />
          ),
        )}
        {moreSection}
        {/* Copy-link mirrors DesktopFilterBar — gated on `?f=` so the link
            actually carries a shareable view. PWA-installed users have no
            browser chrome to copy from, so the bar is the only path. */}
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
      </Group>
    </Stack>
  );
}
