import { Combobox, Group, Stack, Text, TextInput, useCombobox } from '@mantine/core';
import { IconCheck, IconSearch } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';

export type SearchableItem = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly unit?: string | undefined;
  readonly price?: number | undefined;
  readonly itemType: 'product' | 'material';
};

const optionValue = (item: SearchableItem) => `${item.itemType}:${item.id}`;

export function ItemSearchBox({
  items,
  alreadyAdded,
  placeholder,
  emptyLabel,
  renderMeta,
  onPick,
}: {
  readonly items: readonly SearchableItem[];

  readonly alreadyAdded: ReadonlySet<string>;
  readonly placeholder: string;
  readonly emptyLabel: string;

  readonly renderMeta?: ((item: SearchableItem) => ReactNode) | undefined;
  readonly onPick: (item: SearchableItem) => void;
}) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const hits =
      needle === ''
        ? items
        : items.filter(
            (item) =>
              item.name.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle),
          );

    return hits.slice(0, 50);
  }, [items, search]);

  return (
    <Combobox
      store={combobox}

      withinPortal
      onOptionSubmit={(value) => {
        const item = items.find((candidate) => optionValue(candidate) === value);
        if (item) onPick(item);

        setSearch('');
        combobox.updateSelectedOptionIndex();
      }}
    >
      <Combobox.Target>
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={placeholder}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          onClick={() => combobox.openDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={320} style={{ overflowY: 'auto' }}>
          {matches.map((item) => {
            const already = alreadyAdded.has(optionValue(item));
            return (
              <Combobox.Option value={optionValue(item)} key={optionValue(item)}>
                <Group justify="space-between" wrap="nowrap" gap="md">
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      {/* Marked, never hidden or disabled: the item IS still
                          addable — picking it deepens the row already there —
                          and removing it from the list would read as "not
                          stocked" rather than "already on this record". */}
                      {already && <IconCheck size={14} color="var(--mantine-color-teal-6)" />}
                      <Text size="sm" truncate>
                        {item.name}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {item.code}
                    </Text>
                  </Stack>
                  {renderMeta && (
                    <Stack gap={0} align="end" style={{ flexShrink: 0 }}>
                      {renderMeta(item)}
                    </Stack>
                  )}
                </Group>
              </Combobox.Option>
            );
          })}

          {matches.length === 0 && <Combobox.Empty>{emptyLabel}</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
