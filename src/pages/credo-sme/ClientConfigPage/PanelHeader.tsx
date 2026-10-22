import { Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function PanelHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode;
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group
      gap="xs"
      wrap="nowrap"
      justify="space-between"
      styles={{
        root: {
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--mantine-color-gray-0)',
          paddingBottom: 'var(--mantine-spacing-xl)',
        },
      }}
    >
      <Group gap="xs" wrap="nowrap">
        {icon}
        <div>
          <Title order={3} lh={1.2}>
            {title}
          </Title>
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
        </div>
      </Group>
      {actions}
    </Group>
  );
}
