import type { CMngtLayoutConfig } from '@credo/kits/types';
import { Box, Group, SegmentedControl, SimpleGrid, Switch, Text } from '@mantine/core';
import { memo } from 'react';
import { NumberField } from '@/components/NumberField';

export const LayoutSection = memo(function LayoutSection({
  layout,
  onChange,
}: {
  layout: CMngtLayoutConfig;
  onChange: (l: CMngtLayoutConfig) => void;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <NumberField
        label="Navbar Width (px)"
        value={layout.navbar.width}
        emptyValue={260}
        onChange={(width) => onChange({ ...layout, navbar: { ...layout.navbar, width } })}
        size="sm"
        min={180}
        max={400}
        step={10}
      />
      <Group justify="space-between" p="xs" align="center" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500}>
            Display Icon When Collapsed
          </Text>
          <Text fz="xs" c="dimmed">
            Show navigation icons when the sidebar is collapsed
          </Text>
        </Box>
        <Switch
          checked={layout.navbar.displayIconWhenCollapsed}
          onChange={() =>
            onChange({
              ...layout,
              navbar: {
                ...layout.navbar,
                displayIconWhenCollapsed: !layout.navbar.displayIconWhenCollapsed,
              },
            })
          }
        />
      </Group>
      <Box>
        <Text fz="sm" fw={500} mb={4}>
          Sidebar Style
        </Text>
        <SegmentedControl
          fullWidth
          value={layout.navbar.variant ?? 'dark'}
          onChange={(v) =>
            onChange({
              ...layout,
              navbar: { ...layout.navbar, variant: v === 'light' ? 'light' : 'dark' },
            })
          }
          data={[
            { value: 'dark', label: 'Dark (branded)' },
            { value: 'light', label: 'Light (white)' },
          ]}
        />
      </Box>
      <Box>
        <Text fz="sm" fw={500} mb={4}>
          Header Style
        </Text>
        <SegmentedControl
          fullWidth
          value={layout.header?.variant ?? 'dark'}
          onChange={(v) =>
            onChange({
              ...layout,
              header: { ...layout.header, variant: v === 'light' ? 'light' : 'dark' },
            })
          }
          data={[
            { value: 'dark', label: 'Dark (branded)' },
            { value: 'light', label: 'Light (white)' },
          ]}
        />
      </Box>
    </SimpleGrid>
  );
});
