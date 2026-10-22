import { Group, Stack, Text } from '@mantine/core';

export function SummaryRow({
  label,
  value,
  strong,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="wrap" align="baseline" gap="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size={strong ? 'md' : 'sm'} fw={strong ? 700 : 500} ta="right">
        {value}
      </Text>
    </Group>
  );
}

export function LineItemCell({
  line,
  unknownLabel,
}: {
  readonly line: { readonly itemCode?: string | undefined; readonly itemName?: string | undefined };
  readonly unknownLabel: string;
}) {
  if (!line.itemName && !line.itemCode) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        {unknownLabel}
      </Text>
    );
  }
  return (
    <Stack gap={0}>
      <Text size="sm">{line.itemName || line.itemCode}</Text>
      {line.itemName && line.itemCode && (
        <Text size="xs" c="dimmed">
          {line.itemCode}
        </Text>
      )}
    </Stack>
  );
}
