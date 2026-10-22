import type { ReactNode } from 'react';
import { Group } from '@mantine/core';
import type { DateRangePreset, DateRangeValue } from '@/types/date-range';
import { formatDateRangeLabel } from '@/utils/listFilterDateRange';
import { FilterPill } from './FilterPill';
import { LIST_DEFAULT_RANGE_PILL } from '@/config/listDefaults';

type TransactionalFilterPillsRowProps = {
  readonly defaultRange: {
    readonly label: string;
    readonly range: DateRangeValue;
    readonly presetLabels: Partial<Record<DateRangePreset, string>>;
  };

  readonly children?: ReactNode;
};

export function TransactionalFilterPillsRow({
  defaultRange,
  children,
}: TransactionalFilterPillsRowProps) {
  return (
    <Group gap="xs">
      {LIST_DEFAULT_RANGE_PILL && (
        <FilterPill color="gray">
          {defaultRange.label}:{' '}
          {formatDateRangeLabel(defaultRange.range, defaultRange.presetLabels)}
        </FilterPill>
      )}
      {children}
    </Group>
  );
}
