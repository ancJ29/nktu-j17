import { Box, Group, SegmentedControl, SimpleGrid, Switch, Text } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import { layoutDefaults, type LayoutForm, type Variant } from './layoutFields';

const VARIANTS = [
  { value: 'dark', label: 'Dark (branded)' },
  { value: 'light', label: 'Light (white)' },
];

export function LayoutSection({
  value,
  onChange,
}: {
  value: LayoutForm;
  onChange: (next: LayoutForm) => void;
}) {
  const d = layoutDefaults();
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <NumberField
        label="Navbar width (px)"
        value={value.navbarWidth}
        emptyValue={d.navbarWidth}
        onChange={(navbarWidth) => onChange({ ...value, navbarWidth })}
        size="sm"
        min={180}
        max={400}
        step={10}
      />

      <Group justify="space-between" p="xs" align="center" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500}>
            Display icon when collapsed
          </Text>
          <Text fz="xs" c="dimmed">
            Show navigation icons when the sidebar is collapsed.
          </Text>
        </Box>
        <Switch
          checked={value.displayIconWhenCollapsed}
          onChange={(e) =>
            onChange({ ...value, displayIconWhenCollapsed: e.currentTarget.checked })
          }
        />
      </Group>

      <Box>
        <Text fz="sm" fw={500} mb={4}>
          Sidebar style
        </Text>
        <SegmentedControl
          fullWidth
          data={VARIANTS}
          value={value.navbarVariant}
          onChange={(v) => onChange({ ...value, navbarVariant: v as Variant })}
        />
      </Box>

      <Box>
        <Text fz="sm" fw={500} mb={4}>
          Header style
        </Text>
        <SegmentedControl
          fullWidth
          data={VARIANTS}
          value={value.headerVariant}
          onChange={(v) => onChange({ ...value, headerVariant: v as Variant })}
        />
      </Box>
    </SimpleGrid>
  );
}
