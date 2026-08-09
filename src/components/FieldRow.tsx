import type { ReactNode } from 'react';
import { Group, Text } from '@mantine/core';

export function FieldRow({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}:
      </Text>
      <Text size="sm" fw={500} component="div" style={{ minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Text>
    </Group>
  );
}
