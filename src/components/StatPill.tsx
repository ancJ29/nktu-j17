import type { ReactNode } from 'react';
import { Box, Group, Stack, Text } from '@mantine/core';
import { FieldLabel } from '@credo/base-ui/components';

export type StatPillTone = 'neutral' | 'dim' | 'danger';

export type StatPillProps = {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
  readonly suffix?: string;
  readonly tone?: StatPillTone;
  readonly compact?: boolean;
};

const VALUE_COLOR: Record<StatPillTone, string | undefined> = {
  neutral: undefined,
  dim: 'var(--mantine-color-dimmed)',
  danger: 'var(--mantine-color-red-7)',
};

export function StatPill({ icon, label, value, suffix, tone = 'neutral', compact }: StatPillProps) {
  return (
    <Stack
      gap={2}
      align="flex-start"
      style={{
        padding: compact ? '4px 8px' : '8px 12px',
        borderRadius: 8,
        background: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        minWidth: compact ? 0 : 84,
      }}
    >
      <Group gap={4} wrap="nowrap">
        <Box style={{ color: 'var(--mantine-color-dimmed)', display: 'flex' }}>{icon}</Box>
        <FieldLabel>{label}</FieldLabel>
      </Group>
      <Group gap={4} wrap="nowrap" align="baseline">
        <Text size={compact ? 'md' : 'xl'} fw={800} lh={1.1} style={{ color: VALUE_COLOR[tone] }}>
          {value}
        </Text>
        {suffix && (
          <Text size="xs" c="dimmed">
            {suffix}
          </Text>
        )}
      </Group>
    </Stack>
  );
}
