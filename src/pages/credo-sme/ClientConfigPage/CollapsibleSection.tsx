import { Box, Collapse, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export function CollapsibleSection({
  icon,
  title,
  description,
  opened,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  opened: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <UnstyledButton onClick={onToggle} style={{ flex: 1 }}>
          <Group gap="xs" wrap="nowrap">
            {icon}
            <Box>
              <Text fw={600} fz="sm">
                {title}
              </Text>
              {!opened && (
                <Text c="dimmed" fz="xs">
                  {description}
                </Text>
              )}
            </Box>
          </Group>
        </UnstyledButton>
        {/* Outside the button: a control nested in one is invalid markup. */}
        <UnstyledButton onClick={onToggle} aria-label={opened ? 'Collapse' : 'Expand'}>
          {opened ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </UnstyledButton>
      </Group>
      <Collapse in={opened}>
        {opened && (
          <>
            <Text c="dimmed" fz="xs" mt="xs" mb="md">
              {description}
            </Text>
            {children}
          </>
        )}
      </Collapse>
    </Paper>
  );
}
