import { IconName, ICON_MAP } from '@credo/base-ui/components';
import { Box, Group, Modal, ScrollArea, SimpleGrid, Text, UnstyledButton } from '@mantine/core';
import { memo, useCallback, useState } from 'react';

const ALL_ICONS = Object.values(IconName);

export const IconPicker = memo(function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: IconName;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const CurrentIcon = ICON_MAP[value] ?? ICON_MAP[IconName.Box];

  const handleSelect = useCallback(
    (icon: IconName) => {
      onChange(icon);
      setOpened(false);
    },
    [onChange],
  );

  return (
    <>
      <UnstyledButton
        onClick={() => setOpened(true)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 'var(--mantine-radius-sm)',
          border: '1px solid var(--mantine-color-default-border)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <CurrentIcon size={14} />
        <Text fz="xs" c="dimmed" truncate style={{ maxWidth: 100 }}>
          {value.replace('Icon', '')}
        </Text>
      </UnstyledButton>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Choose Icon"
        size="lg"
        centered
      >
        <ScrollArea.Autosize mah="60vh">
          <SimpleGrid cols={4} spacing="xs">
            {ALL_ICONS.map((icon) => {
              const Icon = ICON_MAP[icon];
              const isSelected = icon === value;
              return (
                <UnstyledButton
                  key={icon}
                  onClick={() => handleSelect(icon)}
                  p="xs"
                  style={{
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: isSelected
                      ? '2px solid var(--mantine-primary-color-filled)'
                      : '1px solid var(--mantine-color-default-border)',
                    backgroundColor: isSelected ? 'var(--mantine-primary-color-light)' : undefined,
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Box
                      w={32}
                      h={32}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--mantine-radius-sm)',
                        backgroundColor: 'var(--mantine-color-default-hover)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </Box>
                    <Text fz="xs" truncate>
                      {icon.replace('Icon', '')}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </ScrollArea.Autosize>
      </Modal>
    </>
  );
});
