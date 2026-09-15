import { Group, Text } from '@mantine/core';

export function QuantityWithUnit({
  value,
  unit,
  color,
}: {
  readonly value: string;
  readonly unit?: string | undefined;
  readonly color?: string | undefined;
}) {
  return (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      <Text size="sm" fw={600} ta="right" c={color}>
        {value}
      </Text>
      {unit ? (
        <Text size="xs" c="dimmed">
          {unit}
        </Text>
      ) : null}
    </Group>
  );
}
