import type { ReactNode } from 'react';
import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';

export type SegmentTabOption<T extends string = string> = {
  value: T;

  label: ReactNode;

  icon?: ReactNode;

  title?: ReactNode;

  description?: ReactNode;
};

type SegmentTabsProps<T extends string> = {
  data: SegmentTabOption<T>[];
  value: T;
  onChange: (value: T) => void;

  disabled?: boolean;
};

export function SegmentTabs<T extends string>({
  data,
  value,
  onChange,
  disabled,
}: SegmentTabsProps<T>) {
  const active = data.find((o) => o.value === value);
  const showPanel = !!active && !!(active.icon || active.title || active.description);

  return (
    <Stack gap="sm">
      {/* Folder-style tabs sitting on a baseline: the active tab is bordered
          (rounded top) with its bottom edge merged into the baseline. */}
      <Box
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        {data.map((opt) => {
          const isActive = opt.value === value;
          return (
            <UnstyledButton
              key={opt.value}
              onClick={() => {
                if (!disabled && !isActive) onChange(opt.value);
              }}
              data-active={isActive || undefined}
              style={{
                padding: '8px 18px',
                marginBottom: -1,
                fontSize: 'var(--mantine-font-size-sm)',
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? 'var(--mantine-primary-color-filled)'
                  : 'var(--mantine-color-dimmed)',
                backgroundColor: isActive
                  ? 'var(--mantine-color-body)'
                  : 'var(--mantine-color-default-hover)',
                border: '1px solid',
                borderColor: isActive ? 'var(--mantine-primary-color-filled)' : 'transparent',

                borderBottomColor: isActive ? 'var(--mantine-color-body)' : 'transparent',
                borderTopLeftRadius: 'var(--mantine-radius-md)',
                borderTopRightRadius: 'var(--mantine-radius-md)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled && !isActive ? 0.6 : 1,
              }}
            >
              {opt.label}
            </UnstyledButton>
          );
        })}
      </Box>

      {showPanel && active && (
        <Box
          p="md"
          style={{
            backgroundColor: 'var(--mantine-primary-color-light)',
            border: '1px solid var(--mantine-primary-color-filled)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Group gap="sm" wrap="nowrap" align={active.description ? 'flex-start' : 'center'}>
            {active.icon && (
              <Box
                style={{
                  display: 'flex',
                  color: 'var(--mantine-primary-color-light-color)',
                }}
              >
                {active.icon}
              </Box>
            )}
            <Stack gap={2}>
              <Text fw={600} style={{ color: 'var(--mantine-primary-color-light-color)' }}>
                {active.title ?? active.label}
              </Text>
              {active.description && (
                <Text size="sm" c="dimmed">
                  {active.description}
                </Text>
              )}
            </Stack>
          </Group>
        </Box>
      )}
    </Stack>
  );
}
