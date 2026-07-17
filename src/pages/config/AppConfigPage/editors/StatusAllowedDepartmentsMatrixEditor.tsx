import { Box, Checkbox, ColorSwatch, Group, Stack, Table, Text } from '@mantine/core';

type DepartmentGatedStatusOption = {
  value: string;
  label: Record<string, string>;
  color: string;
  allowedDepartments?: string[];
};

export function StatusAllowedDepartmentsMatrixEditor<T extends DepartmentGatedStatusOption>({
  statusOptions,
  departmentOptions,
  onChange,
}: {
  statusOptions: T[];
  departmentOptions: { value: string; label: string }[];
  onChange: (statusOptions: T[]) => void;
}) {
  const labelOf = (opt: T) => Object.values(opt.label).find(Boolean) ?? opt.value;

  const isChecked = (statusIdx: number, dept: string) =>
    statusOptions[statusIdx]?.allowedDepartments?.includes(dept) ?? false;

  const toggle = (statusIdx: number, dept: string) => {
    const next = statusOptions.map((opt, i) => {
      if (i !== statusIdx) return opt;
      const current = opt.allowedDepartments ?? [];
      const updated = current.includes(dept)
        ? current.filter((v) => v !== dept)
        : [...current, dept];
      return { ...opt, allowedDepartments: updated };
    });
    onChange(next);
  };

  if (statusOptions.length === 0 || departmentOptions.length === 0) return null;

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Status × Department Permissions
      </Text>
      <Text fz="xs" c="dimmed">
        Restrict which departments can transition INTO each status. Empty row = no restriction (any
        user with the "Change Status" permission can transition into it). Cancellation is gated
        separately by the Cancel permission.
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
                  ↓ Status / Department →
                </Text>
              </Table.Th>
              {departmentOptions.map((d) => (
                <Table.Th key={d.value} ta="center" miw={80}>
                  <Text fz="xs" fw={500}>
                    {d.label}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {statusOptions.map((opt, statusIdx) => (
              <Table.Tr key={opt.value || statusIdx}>
                <Table.Td
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'var(--mantine-color-body)',
                    zIndex: 1,
                  }}
                >
                  <Group gap={6} wrap="nowrap">
                    <ColorSwatch color={opt.color} size={12} />
                    <Text fz="xs" fw={500}>
                      {labelOf(opt)}
                    </Text>
                  </Group>
                </Table.Td>
                {departmentOptions.map((d) => (
                  <Table.Td key={d.value} ta="center">
                    <Checkbox
                      size="xs"
                      checked={isChecked(statusIdx, d.value)}
                      onChange={() => toggle(statusIdx, d.value)}
                      styles={{ input: { cursor: 'pointer' } }}
                    />
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
