import { Button, Stack, Text, Title, type MantineStyleProp } from '@mantine/core';
import type { ReactNode } from 'react';

export function RecordField({
  label,
  value,
  showEmpty,
}: {
  readonly label: string;
  readonly value?: ReactNode;
  readonly showEmpty?: boolean;
}) {
  if (!value) {
    if (!showEmpty) return null;
    return (
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" c="dimmed">
          —
        </Text>
      </Stack>
    );
  }
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {typeof value === 'string' ? <Text size="sm">{value}</Text> : value}
    </Stack>
  );
}

export function RecordNotFound({
  title,
  message,
  backLabel,
  onBack,
  style,
}: {
  readonly title: string;
  readonly message: string;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly style?: MantineStyleProp;
}) {
  return (
    <Stack gap="sm" style={style}>
      <Title order={3}>{title}</Title>
      <Text c="dimmed">{message}</Text>
      <Button variant="light" onClick={onBack} w="fit-content">
        {backLabel}
      </Button>
    </Stack>
  );
}
