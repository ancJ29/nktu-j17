import { Button, Indicator, Popover, Select, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAdjustments } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatePickerField } from './DatePickerField';
import {
  type MoreFilterDef,
  type MoreFilterDateRange,
  type MoreFilterSelect,
  type DateRangePreset,
  type DateRangeValue,
  EMPTY_DATE_RANGE,
} from '@/types/date-range';
import { getPresetRange } from '@/utils/listFilterDateRange';

export type {
  MoreFilterDef,
  MoreFilterDateRange,
  MoreFilterSelect,
  DateRangePreset,
  DateRangeValue,
};

function toDateString(d: Date | null | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateString(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function DateRangeFilter({
  filter,
  presetLabels,
}: {
  filter: MoreFilterDateRange;
  presetLabels: Partial<Record<DateRangePreset, string>>;
}) {
  const { t } = useTranslation();
  const { value, onChange } = filter;

  const [pendingStart, setPendingStart] = useState<string | null>(null);

  const selectPreset = useCallback(
    (preset: DateRangePreset) => {
      setPendingStart(null);
      if (preset === value.preset) {
        onChange(EMPTY_DATE_RANGE);
        return;
      }

      const range = getPresetRange(preset);
      onChange({ from: range.from, to: range.to, preset });
    },
    [value, onChange],
  );

  const handleRangeChange = useCallback(
    (range: [string | null, string | null]) => {
      const [from, to] = range;
      if (from && to) {
        setPendingStart(null);
        onChange({ from: fromDateString(from), to: fromDateString(to), preset: 'custom' });
      } else if (from) {
        setPendingStart(from); // first click — hold locally, don't propagate
      } else {
        setPendingStart(null);
        onChange(EMPTY_DATE_RANGE); // cleared via the picker's clear button
      }
    },
    [onChange],
  );

  const pickerValue: [string | null, string | null] =
    pendingStart != null
      ? [pendingStart, null]
      : filter.customOnly && value.preset !== 'custom'
        ? [null, null]
        : [toDateString(value.from), toDateString(value.to)];

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>
        {filter.title}
      </Text>
      {/* Range picker is always visible + editable; presets are quick-fills. */}
      <DatePickerField
        type="range"
        size="xs"
        placeholder={t('common.filters.selectDateRange')}
        value={pickerValue}
        onChange={(range) => handleRangeChange(range as [string | null, string | null])}
        popoverProps={{ withinPortal: false }}
      />
      {!filter.customOnly && (
        <SimpleGrid cols={3} spacing="xs">
          {Object.keys(presetLabels)
            .filter((preset) => preset !== 'custom')
            .map((preset) => (
              <Button
                key={preset}
                size="xs"
                radius="sm"
                variant={value.preset === preset ? 'light' : 'outline'}
                color={value.preset === preset ? undefined : 'gray'}
                onClick={() => selectPreset(preset as DateRangePreset)}
                fullWidth
              >
                {presetLabels[preset as DateRangePreset]}
              </Button>
            ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

function SelectFilterField({ filter }: { filter: MoreFilterSelect }) {
  return (
    <Select
      label={filter.title}
      placeholder={filter.placeholder ?? filter.title}
      data={filter.options}
      value={filter.value}
      onChange={filter.onChange}
      searchable
      clearable
      size="sm"
    />
  );
}

function countActive(filters: MoreFilterDef[]): number {
  let count = 0;
  for (const f of filters) {
    if (f.type === 'dateRange' && (f.customOnly ? f.value.preset === 'custom' : f.value.preset))
      count++;
    if (f.type === 'select' && f.value !== null) count++;
    if (f.type === 'switch' && f.value) count++;
  }
  return count;
}

type DesktopFilterMorePopoverProps = {
  filters: MoreFilterDef[];
  presetLabels?: Partial<Record<DateRangePreset, string>>;
};

export function DesktopFilterMorePopover({ filters, presetLabels }: DesktopFilterMorePopoverProps) {
  const { t } = useTranslation();
  const [opened, { close, toggle }] = useDisclosure(false);
  const activeCount = countActive(filters);

  return (
    <Popover position="bottom-end" shadow="md" width={420} opened={opened} onClose={close}>
      <Popover.Target>
        <Indicator
          label={activeCount}
          size={16}
          disabled={activeCount === 0}
          color="red"
          offset={4}
        >
          <Button
            variant={activeCount > 0 ? 'outline' : 'default'}
            leftSection={<IconAdjustments size={16} />}
            onClick={toggle}
            w={160}
          >
            {t('common.filters.more')}
          </Button>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="md">
          {filters.map((f) =>
            f.type === 'select' ? (
              <SelectFilterField key={f.key} filter={f} />
            ) : f.type === 'switch' ? (
              <Switch
                key={f.key}
                label={f.title}
                checked={f.value}
                onChange={(e) => f.onChange(e.currentTarget.checked)}
                color={f.color}
              />
            ) : (
              <DateRangeFilter key={f.key} filter={f} presetLabels={presetLabels!} />
            ),
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
