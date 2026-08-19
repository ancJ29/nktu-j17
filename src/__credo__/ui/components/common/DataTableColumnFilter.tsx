import React, { useMemo, useState } from 'react';

import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconFilter, IconFilterFilled, IconSearch } from '@tabler/icons-react';

import {
  columnFilterSelectionState,
  toggleColumnFilterAll,
  toggleColumnFilterValue,
} from './columnFilterSelection';

export type DataTableFilterOption = {
  value: string;

  label: string;

  count?: number;
};

export type DataTableColumnFilterLabels = {
  search?: string;
  selectAll?: string;
  clear?: string;
  empty?: string;
};

export type DataTableColumnFilterConfig = {
  options: DataTableFilterOption[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
  labels?: DataTableColumnFilterLabels;
};

const DEFAULT_LABELS: Required<DataTableColumnFilterLabels> = {
  search: 'Search',
  selectAll: 'Select all',
  clear: 'Clear',
  empty: 'No values',
};

export function DataTableColumnFilter({
  options,
  selected,
  onChange,
  labels,
}: DataTableColumnFilterConfig) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');

  const [cleared, setCleared] = useState(false);

  const active = selected.length > 0;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const state = columnFilterSelectionState({ selected, cleared });

  const changeOpened = (next: boolean) => {
    setOpened(next);
    if (!next) setCleared(false);
  };

  const apply = (result: { selected: string[]; cleared: boolean }) => {
    setCleared(result.cleared);
    onChange(result.selected);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const isChecked = (value: string) =>
    state === 'some' ? selectedSet.has(value) : state === 'all';

  const optionValues = useMemo(() => options.map((option) => option.value), [options]);

  const toggle = (value: string) =>
    apply(toggleColumnFilterValue({ selected, cleared }, optionValues, value));

  const toggleAll = () => apply(toggleColumnFilterAll({ selected, cleared }));

  const clear = () => apply({ selected: [], cleared: false });

  return (
    <Popover
      opened={opened}
      onChange={changeOpened}
      position="bottom-end"
      shadow="md"
      withArrow
      trapFocus
    >
      <Popover.Target>
        <ActionIcon
          size="sm"
          variant={active ? 'light' : 'subtle'}
          color={active ? 'primary' : 'gray'}
          aria-label={text.search}
          onClick={(event) => {
            event.stopPropagation();
            changeOpened(!opened);
          }}
        >
          {active ? <IconFilterFilled size={14} /> : <IconFilter size={14} />}
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown p="xs" onClick={(event) => event.stopPropagation()}>
        <Stack gap="xs" w={240}>
          <TextInput
            size="xs"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={text.search}
            leftSection={<IconSearch size={14} />}
          />

          {options.length > 0 && (
            <Checkbox
              size="xs"
              checked={state === 'all'}
              indeterminate={state === 'some'}
              onChange={toggleAll}
              label={
                <Text size="xs" fw={600}>
                  {text.selectAll}
                </Text>
              }
            />
          )}

          <Divider />

          <ScrollArea.Autosize mah={240} type="auto">
            <Stack gap={6} pr={4}>
              {visible.map((option) => (
                <Checkbox
                  key={option.value}
                  size="xs"
                  checked={isChecked(option.value)}
                  onChange={() => toggle(option.value)}
                  label={
                    <Group gap={6} wrap="nowrap" justify="space-between" w="100%">
                      <Text size="xs" lineClamp={1}>
                        {option.label}
                      </Text>
                      {option.count != null && (
                        <Text size="xs" c="dimmed">
                          {option.count}
                        </Text>
                      )}
                    </Group>
                  }
                  styles={{ labelWrapper: { flex: 1, minWidth: 0 } }}
                />
              ))}
              {visible.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="xs">
                  {text.empty}
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>

          {state !== 'all' && (
            <Button size="compact-xs" variant="subtle" color="orange" onClick={clear}>
              {text.clear}
            </Button>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function DataTableFilterableHeader({
  header,
  filter,
  ta,
}: {
  header: React.ReactNode;
  filter: DataTableColumnFilterConfig;
  ta?: 'left' | 'center' | 'right';
}) {
  return (
    <Group
      gap={4}
      wrap="nowrap"
      justify={ta === 'right' ? 'flex-end' : ta === 'center' ? 'center' : 'flex-start'}
    >
      <Box style={{ minWidth: 0 }}>{header}</Box>
      <DataTableColumnFilter {...filter} />
    </Group>
  );
}
