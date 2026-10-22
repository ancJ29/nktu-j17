import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Group,
  Paper,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconLink,
  IconRotate,
  type IconSettings,
} from '@tabler/icons-react';
import { memo, useCallback } from 'react';
import type { SectionKey } from './types';

export const CollapsibleSection = memo(function CollapsibleSection({
  icon: SectionIcon,
  sectionKey,
  title,
  description,
  opened,
  onToggle,
  onReset,
  isDefault,
  children,
}: {
  icon: typeof IconSettings;
  sectionKey: SectionKey;
  title: string;
  description: string;
  opened: boolean;
  onToggle: (key: SectionKey) => void;
  onReset?: () => void;

  isDefault?: boolean;
  children: React.ReactNode;
}) {
  const handleToggle = useCallback(() => onToggle(sectionKey), [onToggle, sectionKey]);
  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onReset?.();
    },
    [onReset],
  );
  const handleCopyLink = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = `${window.location.origin}${window.location.pathname}#${sectionKey}`;
      window.location.hash = sectionKey;
      navigator.clipboard.writeText(url);
    },
    [sectionKey],
  );

  return (
    <Paper p="md" withBorder id={sectionKey}>
      <UnstyledButton onClick={handleToggle} w="100%">
        <Group justify="space-between">
          <Group gap="xs">
            <SectionIcon size={18} />
            <Box>
              <Group gap={6}>
                <Text fw={600} fz="sm">
                  {title}
                </Text>
                {isDefault && (
                  <Badge size="xs" color="gray" variant="light" tt="none" fw={500}>
                    Default
                  </Badge>
                )}
              </Group>
              {!opened && (
                <Text c="dimmed" fz="xs">
                  {description}
                </Text>
              )}
            </Box>
          </Group>
          <Group gap="xs">
            {opened && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                title="Copy link to section"
                onClick={handleCopyLink}
              >
                <IconLink size={14} />
              </ActionIcon>
            )}
            {opened && onReset && !isDefault && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                title="Reset to default"
                onClick={handleReset}
              >
                <IconRotate size={14} />
              </ActionIcon>
            )}
            {opened ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </Group>
        </Group>
      </UnstyledButton>
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
});
