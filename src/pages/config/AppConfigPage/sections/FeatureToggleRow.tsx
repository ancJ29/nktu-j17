import { Box, Group, Switch, Text } from '@mantine/core';
import { memo, type ReactNode } from 'react';

export const FeatureToggleRow = memo(function FeatureToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Group
      justify="space-between"
      p="xs"
      style={{ borderRadius: 'var(--mantine-radius-sm)' }}
      bg={checked ? undefined : 'var(--mantine-color-default-hover)'}
    >
      <Box>
        <Text fz="sm" fw={500}>
          {label}
        </Text>
        {description !== undefined && (
          <Text fz="xs" c="dimmed">
            {description}
          </Text>
        )}
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    </Group>
  );
});
