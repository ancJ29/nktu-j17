import { Group } from '@mantine/core';
import { IconArrowDown, IconArrowsSort, IconArrowUp } from '@tabler/icons-react';

export function SortHeader({
  label,
  field,
  current,
  onChange,
}: {
  readonly label: string;
  readonly field: string;
  readonly current?: string;
  readonly onChange?: (field: string) => void;
}) {
  if (!onChange) return <>{label}</>;
  const [curField, curDir] = (current ?? '').split('_');
  const isActive = curField === field;
  const Icon = isActive ? (curDir === 'asc' ? IconArrowUp : IconArrowDown) : IconArrowsSort;
  return (
    <Group
      gap={4}
      wrap="nowrap"
      onClick={() =>
        onChange(isActive ? `${field}_${curDir === 'desc' ? 'asc' : 'desc'}` : `${field}_desc`)
      }
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {label}
      <Icon size={14} color={isActive ? undefined : 'var(--mantine-color-gray-5)'} />
    </Group>
  );
}
