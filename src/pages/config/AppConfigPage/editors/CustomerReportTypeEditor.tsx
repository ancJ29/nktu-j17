import { useEffect } from 'react';
import { ActionIcon, Button, Group, Select, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { DEFAULT_CUSTOMER_REPORT_TYPE, customerReportTypeOptions } from '@/utils/customerReports';

export function CustomerReportTypeEditor({
  assignments,
  onChange,
}: {
  assignments: Record<string, number>;
  onChange: (assignments: Record<string, number>) => void;
}) {
  const customers = useCustomerStore((s) => s.items);
  const customersInit = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  useEffect(() => {
    if (!customersInit) loadCustomers();
  }, [customersInit, loadCustomers]);

  const rows = Object.entries(assignments);

  const customerData = customers
    .filter((c) => c.isActive && !c.extra?.isDeleted)
    .map((c) => ({ value: c.code, label: `${c.extra?.shortName || c.name} (${c.code})` }));

  const typeData = customerReportTypeOptions().map((t) => ({
    value: String(t.id),
    label: `${t.id}. ${t.label}`,
  }));

  const setCode = (oldCode: string, newCode: string | null) => {
    if (!newCode || newCode === oldCode) return;
    const next: Record<string, number> = {};

    for (const [code, type] of rows) next[code === oldCode ? newCode : code] = type;
    onChange(next);
  };

  const setType = (code: string, type: string | null) => {
    if (!type) return;
    onChange({ ...assignments, [code]: Number(type) });
  };

  const removeRow = (code: string) => {
    const next = { ...assignments };
    delete next[code];
    onChange(next);
  };

  const addRow = () => {
    const free = customerData.find((c) => !(c.value in assignments));
    if (!free) return;
    onChange({ ...assignments, [free.value]: DEFAULT_CUSTOMER_REPORT_TYPE });
  };

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Customer Report Types
      </Text>
      <Text fz="xs" c="dimmed">
        Which report layout the "Export customer report" button produces for each customer. A
        customer that isn&apos;t listed gets type {DEFAULT_CUSTOMER_REPORT_TYPE} (the house bảng
        kê), so only list the customers who need a different form. Layouts are code — ask for a new
        type when a customer insists on a form that isn&apos;t offered here.
      </Text>

      {rows.length === 0 && (
        <Text fz="xs" c="dimmed" fs="italic">
          No assignments — every customer gets type {DEFAULT_CUSTOMER_REPORT_TYPE}.
        </Text>
      )}

      {rows.map(([code, type]) => (
        <Group key={code} gap="xs" wrap="nowrap">
          <Select
            flex={1}
            size="xs"
            data={
              customerData.some((c) => c.value === code)
                ? customerData
                : [...customerData, { value: code, label: code }]
            }
            value={code}
            onChange={(v) => setCode(code, v)}
            searchable
            nothingFoundMessage="No customers"
          />
          <Select
            w={220}
            size="xs"
            data={typeData}
            value={String(type)}
            onChange={(v) => setType(code, v)}
            allowDeselect={false}
          />
          <ActionIcon variant="subtle" color="red" onClick={() => removeRow(code)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={addRow}
          disabled={customerData.every((c) => c.value in assignments)}
        >
          Add customer
        </Button>
      </Group>
    </Stack>
  );
}
