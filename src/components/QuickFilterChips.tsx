import { Chip, Group, ScrollArea } from '@mantine/core';

export type QuickFilterChip = {
  
  readonly key: string;
  
  readonly label: string;
  
  readonly active: boolean;
  
  readonly onClick: () => void;
};

type QuickFilterChipsProps = {
  readonly chips: readonly QuickFilterChip[];
};

export function QuickFilterChips({ chips }: QuickFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ScrollArea scrollbarSize={0} type="never">
      <Group gap="xs" wrap="nowrap">
        {chips.map((chip) => (
          <Chip
            key={chip.key}
            checked={chip.active}
            onClick={chip.onClick}
            size="sm"
            variant="light"
            fw={chip.active ? 700 : 500}
          >
            {chip.label}
          </Chip>
        ))}
      </Group>
    </ScrollArea>
  );
}
