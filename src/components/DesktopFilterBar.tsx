import { useState, type ReactNode } from 'react';
import { ActionIcon, Group, MultiSelect, Select, Tooltip } from '@mantine/core';
import { SearchInput } from './SearchInput';
import type { ComboboxData } from '@mantine/core';
import { IconFilterOff, IconLink, IconSearch, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { URL_KEY } from '@/hooks/useUrlFilterState';
import { useCopyLink } from '@/hooks/useCopyLink';

type FilterStatus = 'all' | 'active' | 'inactive';

export type SelectFilter = {
  value: string | null;
  onChange: (value: string | null) => void;
  data: ComboboxData;
  placeholder: string;
  
  visible?: boolean;
  
  searchable?: boolean;
  
  w?: number;
  
  multi?: false;
};

export type MultiSelectFilter = {
  value: string[];
  onChange: (value: string[]) => void;
  data: ComboboxData;
  placeholder: string;
  visible?: boolean;
  searchable?: boolean;
  w?: number;
  multi: true;
};

type DesktopFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  
  status?: FilterStatus;
  onStatusChange?: (value: FilterStatus) => void;
  statusLabels: { all: string; active: string; inactive: string };
  
  hideStatus?: boolean;
  
  filters?: (SelectFilter | MultiSelectFilter)[];
  
  moreSection?: ReactNode;
  clearLabel?: string;
  onClear: () => void;
  
  hasActiveFilters?: boolean;
};

export function DesktopFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  statusLabels,
  hideStatus,
  filters,
  moreSection,
  onClear,
  hasActiveFilters: hasActiveFiltersProp,
}: DesktopFilterBarProps) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const canCopyLink = params.has(URL_KEY);

  const hasActiveFilters =
    hasActiveFiltersProp ??
    (!!search ||
      status !== 'all' ||
      filters?.some((f) =>
        f.multi ? f.value.length > 0 : f.value !== null && f.value !== 'all',
      ) === true);

  
  
  const handleCopyLink = useCopyLink();

  const [counter, setCounter] = useState(0);

  return (
    <Group gap="sm" wrap="nowrap">
      <SearchInput
        
        
        
        
        
        
        
        key={counter}
        placeholder={searchPlaceholder}
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={onSearchChange}
        style={{ flex: 1 }}
        rightSection={
          <ActionIcon
            aria-label={t('__new__.01-common.actions.clearSearch')}
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => {
              onSearchChange('');
              setCounter((c) => c + 1);
            }}
          >
            <IconX size={16} />
          </ActionIcon>
        }
      />
      {!hideStatus && (
        <Select
          size="sm"
          value={status}
          onChange={(v) => onStatusChange?.((v ?? 'all') as FilterStatus)}
          data={[
            { label: statusLabels.all, value: 'all' },
            { label: statusLabels.active, value: 'active' },
            { label: statusLabels.inactive, value: 'inactive' },
          ]}
          w={160}
        />
      )}
      {filters?.map((f, i) => {
        if (!(f.visible ?? true) || f.data.length === 0) return null;
        if (f.multi) {
          return (
            <MultiSelect
              key={i}
              size="sm"
              placeholder={f.placeholder}
              data={f.data}
              value={f.value}
              onChange={f.onChange}
              clearable
              searchable={f.searchable}
              w={f.w ?? 160}
              styles={{
                input: { minHeight: 36, height: 'auto' },
                pill: { display: 'none' },
              }}
            />
          );
        }
        return (
          <Select
            key={i}
            size="sm"
            placeholder={f.placeholder}
            data={f.data}
            value={f.value}
            onChange={f.onChange}
            clearable
            searchable={f.searchable}
            w={f.w ?? 160}
          />
        );
      })}
      {moreSection}
      <Tooltip label={t('__new__.01-common.actions.copyLink')} withArrow>
        <ActionIcon
          disabled={!canCopyLink}
          variant="subtle"
          color="blue"
          size="lg"
          onClick={handleCopyLink}
        >
          <IconLink size={16} />
        </ActionIcon>
      </Tooltip>
      <ActionIcon
        variant="subtle"
        color={hasActiveFilters ? 'orange' : 'gray'}
        size="lg"
        disabled={!hasActiveFilters}
        onClick={onClear}
      >
        <IconFilterOff size={16} />
      </ActionIcon>
    </Group>
  );
}
