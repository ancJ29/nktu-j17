import { Card, Divider, Group, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { FieldLabel } from '@credo/base-ui/components';

type DangerZoneCardProps = {
  title: string;
  children: ReactNode;
};

export function DangerZoneCard({ title, children }: DangerZoneCardProps) {
  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      style={{
        borderColor: 'var(--mantine-color-red-3)',
        background: 'var(--mantine-color-red-0)',
      }}
    >
      <Stack gap="md">
        <Group gap="xs">
          <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
          <FieldLabel c="red">{title}</FieldLabel>
        </Group>
        <Divider color="red.3" />
        <Stack gap="sm">{children}</Stack>
      </Stack>
    </Card>
  );
}
