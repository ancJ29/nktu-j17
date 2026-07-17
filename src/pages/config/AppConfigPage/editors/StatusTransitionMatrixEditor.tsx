import { Box, Checkbox, ColorSwatch, Group, Stack, Table, Text } from '@mantine/core';

type StatusOptionLike = { value: string; label: Record<string, string>; color?: string };

export function StatusTransitionMatrixEditor({
  statusOptions,
  transitions,
  onChange,
}: {
  statusOptions: StatusOptionLike[];
  transitions: Record<string, string[]>;
  onChange: (transitions: Record<string, string[]>) => void;
}) {
  const values = statusOptions.map((opt) => opt.value);

  const labelOf = (opt: StatusOptionLike) => Object.values(opt.label).find(Boolean) ?? opt.value;

  const isChecked = (from: string, to: string) => transitions[from]?.includes(to) ?? false;

  const toggle = (from: string, to: string) => {
    const current = transitions[from] ?? [];
    const next = current.includes(to) ? current.filter((v) => v !== to) : [...current, to];
    onChange({ ...transitions, [from]: next });
  };

  if (statusOptions.length === 0) return null;

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Status Transitions
      </Text>
      <Text fz="xs" c="dimmed">
        Define which status transitions are allowed. Rows = current status, columns = target status.
      </Text>
      <Box style={{ overflowX: 'auto' }}>
        <Table withRowBorders withColumnBorders verticalSpacing={4} horizontalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  position: 'sticky',
                  left: 0,
                  background: 'var(--mantine-color-body)',
                  zIndex: 1,
                }}
              >
                <Text fz="xs" c="dimmed" fw={600}>
                  ↓ From / To →
                </Text>
              </Table.Th>
              {statusOptions.map((opt) => (
                <Table.Th key={opt.value} ta="center" miw={60}>
                  <Text fz="xs" fw={500}>
                    {labelOf(opt)}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {statusOptions.map((fromOpt) => (
              <Table.Tr key={fromOpt.value}>
                <Table.Td
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'var(--mantine-color-body)',
                    zIndex: 1,
                  }}
                >
                  <Group gap={6} wrap="nowrap">
                    <ColorSwatch color={fromOpt.color ?? '#228be6'} size={12} />
                    <Text fz="xs" fw={500}>
                      {labelOf(fromOpt)}
                    </Text>
                  </Group>
                </Table.Td>
                {values.map((toVal) => (
                  <Table.Td key={toVal} ta="center">
                    {fromOpt.value === toVal ? (
                      <Text fz="xs" c="dimmed">
                        —
                      </Text>
                    ) : (
                      <Checkbox
                        size="xs"
                        checked={isChecked(fromOpt.value, toVal)}
                        onChange={() => toggle(fromOpt.value, toVal)}
                        styles={{ input: { cursor: 'pointer' } }}
                      />
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
