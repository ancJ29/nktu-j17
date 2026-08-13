import { useEffect } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { TransportOrderBangKeTemplateConfig } from '@/config/schema';
import { useCustomerStore } from '@/stores/useCustomerStore';

export function TransportOrderBangKeTemplateEditor({
  templates,
  onChange,
}: {
  templates: TransportOrderBangKeTemplateConfig[];
  onChange: (templates: TransportOrderBangKeTemplateConfig[]) => void;
}) {
  const customers = useCustomerStore((s) => s.items);
  const customersInit = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  useEffect(() => {
    if (!customersInit) loadCustomers();
  }, [customersInit, loadCustomers]);

  const customerData = customers
    .filter((c) => c.isActive && !c.extra?.isDeleted)
    .map((c) => ({ value: c.code, label: `${c.extra?.shortName || c.name} (${c.code})` }));

  const patch = (idx: number, next: Partial<TransportOrderBangKeTemplateConfig>) =>
    onChange(templates.map((t, i) => (i === idx ? { ...t, ...next } : t)));

  const addTemplate = () =>
    onChange([
      ...templates,
      {
        name: '',
        customerCodes: [],
        serviceFeeColumns: [],
        otherFeesColumn: true,
        noteColumn: 'auto',
        footerSummary: true,
      },
    ]);

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Bảng kê Statement Templates
      </Text>
      <Text fz="xs" c="dimmed">
        Per-customer layout overrides for the statement (bảng kê) export. Without a template — or
        with its fields left empty — the export derives the layout from the exported orders, which
        is right for most customers. Add a template only to freeze a layout a customer insists on.
        Each customer should appear in at most one template (the first match wins).
      </Text>
      {templates.map((tpl, idx) => (
        <Paper key={idx} p="sm" withBorder>
          <Stack gap="xs">
            <Group justify="space-between" align="flex-end" wrap="nowrap">
              <TextInput
                label="Template name"
                placeholder="e.g. DONGA"
                value={tpl.name}
                onChange={(e) => patch(idx, { name: e.currentTarget.value })}
                size="sm"
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="light"
                color="red"
                size="lg"
                onClick={() => onChange(templates.filter((_, i) => i !== idx))}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
            <MultiSelect
              label="Customers"
              description="Registry customers this template applies to."
              data={customerData}
              value={tpl.customerCodes ?? []}
              onChange={(v) => patch(idx, { customerCodes: v })}
              placeholder={
                customerData.length === 0 ? 'No customers in the registry' : 'Pick customers'
              }
              size="sm"
              searchable
              clearable
            />
            <TagsInput
              label="Service fee columns (in order)"
              description="Fee names as they appear on the statement (case-insensitive) — i.e. the labels of the Meta-data › Fee Name entries, e.g. Phí vận chuyển, Phụ thu VC, Bốc xếp, Phí neo xe. Leave empty to derive the columns from the exported orders."
              value={tpl.serviceFeeColumns ?? []}
              onChange={(v) => patch(idx, { serviceFeeColumns: v })}
              placeholder="Type a fee name and press Enter"
              size="sm"
              clearable
            />
            {(tpl.serviceFeeColumns?.length ?? 0) > 0 && (
              <Switch
                label="PHÍ KHÁC catch-all column"
                description="On: fee names not listed above sum into one PHÍ KHÁC column. Off: each unlisted name gets its own extra column. Money is never dropped either way."
                checked={tpl.otherFeesColumn ?? true}
                onChange={(e) => patch(idx, { otherFeesColumn: e.currentTarget.checked })}
                size="sm"
              />
            )}
            <Group grow align="flex-start">
              <Select
                label="NOTE column"
                data={[
                  { value: 'auto', label: 'Auto — only when some order has notes' },
                  { value: 'always', label: 'Always' },
                  { value: 'never', label: 'Never' },
                ]}
                value={tpl.noteColumn ?? 'auto'}
                onChange={(v) =>
                  patch(idx, { noteColumn: (v as 'auto' | 'always' | 'never') ?? 'auto' })
                }
                size="sm"
                allowDeselect={false}
              />
              <Switch
                label="Footer summary lines"
                description="Số tiền cước / chi hộ / cần thanh toán."
                checked={tpl.footerSummary ?? true}
                onChange={(e) => patch(idx, { footerSummary: e.currentTarget.checked })}
                size="sm"
                mt={22}
              />
            </Group>
          </Stack>
        </Paper>
      ))}
      <Button
        variant="light"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={addTemplate}
        w="fit-content"
      >
        Add Template
      </Button>
    </Stack>
  );
}
