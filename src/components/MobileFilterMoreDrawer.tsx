import {
  Box,
  Button,
  Divider,
  Group,
  Indicator,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAdjustments } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatePickerField } from './DatePickerField';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import {
  type MoreFilterDef,
  type MoreFilterDateRange,
  type MoreFilterSelect,
  type DateRangePreset,
  EMPTY_DATE_RANGE,
} from '../types/date-range';
import { getPresetRange } from '@/utils/listFilterDateRange';

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
      />
      <SimpleGrid cols={2} spacing="xs">
        {Object.keys(presetLabels)
          .filter((preset) => preset !== 'custom')
          .map((preset) => (
            <Button
              key={preset}
              size="compact-sm"
              variant={value.preset === preset ? 'filled' : 'outline'}
              color={value.preset === preset ? undefined : 'gray'}
              onClick={() => selectPreset(preset as DateRangePreset)}
              fullWidth
            >
              {presetLabels[preset as DateRangePreset]}
            </Button>
          ))}
      </SimpleGrid>
    </Stack>
  );
}

function SelectFilter({ filter }: { filter: MoreFilterSelect }) {
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
    if (f.type === 'dateRange' && f.value.preset !== null) count++;
    if (f.type === 'select' && f.value !== null) count++;
    if (f.type === 'switch' && f.value) count++;
  }
  return count;
}

type MobileFilterMoreDrawerProps = {
  filters: MoreFilterDef[];
  drawerTitle: string;
  applyLabel?: string;

  presetLabels?: Partial<Record<DateRangePreset, string>>;
};

export function MobileFilterMoreDrawer({
  filters,
  drawerTitle,
  applyLabel = 'Apply',
  presetLabels,
}: MobileFilterMoreDrawerProps) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const activeCount = countActive(filters);

  return (
    <>
      <Indicator label={activeCount} size={16} disabled={activeCount === 0} color="red" offset={4}>
        <Button
          variant={activeCount > 0 ? 'outline' : 'default'}
          size="compact-sm"
          leftSection={<IconAdjustments size={16} />}
          onClick={open}
          style={{ flexShrink: 0 }}
          w={100}
        >
          {t('common.filters.more')}
        </Button>
      </Indicator>

      <MobileFilterDrawer
        opened={opened}
        onClose={close}
        title={
          <Group>
            <Text fw={600}>{drawerTitle}</Text>
            <Divider orientation="vertical" />
            <Button variant="subtle" size="compact-sm" onClick={close} style={{ flexShrink: 0 }}>
              {applyLabel}
            </Button>
          </Group>
        }
        height="80vh"
      >
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ScrollArea style={{ flex: 1 }} offsetScrollbars>
            <Stack gap="md">
              {filters.map((f) =>
                f.type === 'select' ? (
                  <SelectFilter key={f.key} filter={f} />
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
          </ScrollArea>
          <Button fullWidth mt="md" onClick={close} style={{ flexShrink: 0 }}>
            {applyLabel}
          </Button>
        </Box>
      </MobileFilterDrawer>
    </>
  );
}
