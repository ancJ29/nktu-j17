import { Button, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type DangerActionProps = {
  title: string;
  description?: string;
  buttonLabel: string;
  buttonIcon?: ReactNode;
  buttonColor?: string;
  buttonVariant?: 'filled' | 'outline';
  onClick: () => void;
};

export function DangerAction({
  title,
  description,
  buttonLabel,
  buttonIcon,
  buttonColor = 'gray',
  buttonVariant = 'outline',
  onClick,
}: DangerActionProps) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={600}>
          {title}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
      </Stack>
      <Button
        variant={buttonVariant}
        color={buttonColor}
        size="compact-sm"
        leftSection={buttonIcon}
        onClick={onClick}
      >
        {buttonLabel}
      </Button>
    </Group>
  );
}
