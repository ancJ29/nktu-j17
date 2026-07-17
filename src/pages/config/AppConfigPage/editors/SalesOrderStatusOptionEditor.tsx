import { listCapabilitiesForStage } from '@/pages/sales-orders/capabilities/registry';
import { STAGES } from '@/pages/sales-orders/capabilities/types';
import { IconName } from '@credo/base-ui/components';
import type {
  CMngtSalesOrderStage,
  CMngtSalesOrderStatusOption,
  CMngtStatusCapabilityBinding,
  Language,
} from '@credo/kits/types';
import {
  ActionIcon,
  Box,
  Button,
  ColorPicker,
  ColorSwatch,
  Group,
  Popover,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { IconPicker } from '../../IconPicker';
import { CapabilitiesEditorModal } from './CapabilitiesEditorModal';

export function SalesOrderStatusOptionEditor({
  options,
  onChange,
  languages,
}: {
  options: CMngtSalesOrderStatusOption[];
  onChange: (opts: CMngtSalesOrderStatusOption[]) => void;
  languages: Language[];
}) {
  const langCodes = languages.map((l) => l.code).filter(Boolean);
  const [editingCapsIdx, setEditingCapsIdx] = useState<number | null>(null);

  const addOption = () => {
    const emptyLabel: Record<string, string> = {};
    for (const code of langCodes) emptyLabel[code] = '';
    onChange([
      ...options,
      {
        value: '',
        label: emptyLabel,
        color: '#228be6',
        icon: 'IconBox',
        stage: 'IN_PROGRESS',
        capabilities: [],
      },
    ]);
  };

  const updateOption = (idx: number, field: string, val: unknown) => {
    const updated = options.map((opt, i) => {
      if (i !== idx) return opt;
      if (field === 'value') return { ...opt, value: val as string };
      if (field === 'color') return { ...opt, color: val as string };
      if (field === 'icon') return { ...opt, icon: (val as string) || undefined };
      if (field === 'stage') {
        
        
        const newStage = val as CMngtSalesOrderStage;
        const allowed = new Set(listCapabilitiesForStage(newStage).map((c) => c.id));
        const filteredCaps = (opt.capabilities ?? []).filter((b) => allowed.has(b.id));
        return { ...opt, stage: newStage, capabilities: filteredCaps };
      }
      if (field === 'capabilities') {
        return { ...opt, capabilities: val as CMngtStatusCapabilityBinding[] };
      }
      if (field.startsWith('action:')) {
        const langCode = field.slice(7);
        return { ...opt, actionLabel: { ...(opt.actionLabel ?? {}), [langCode]: val as string } };
      }
      return { ...opt, label: { ...opt.label, [field]: val as string } };
    });
    onChange(updated);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const editingOpt = editingCapsIdx != null ? options[editingCapsIdx] : null;

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Status Options
      </Text>
      <Box style={{ overflowX: 'auto' }}>
        <Table withRowBorders={false} verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={130}>Value</Table.Th>
              {langCodes.map((code) => (
                <Table.Th key={code}>Label ({code.toUpperCase()})</Table.Th>
              ))}
              {langCodes.map((code) => (
                <Table.Th key={`action-${code}`}>Action ({code.toUpperCase()})</Table.Th>
              ))}
              <Table.Th w={140}>Stage</Table.Th>
              <Table.Th w={150}>Capabilities</Table.Th>
              <Table.Th w={80} ta="center">
                Icon
              </Table.Th>
              <Table.Th w={60} ta="center">
                Color
              </Table.Th>
              <Table.Th w={40} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {options.map((opt, idx) => (
              <Table.Tr key={idx}>
                <Table.Td>
                  <TextInput
                    placeholder="value"
                    value={opt.value}
                    onChange={(e) => updateOption(idx, 'value', e.currentTarget.value)}
                    size="sm"
                  />
                </Table.Td>
                {langCodes.map((code) => (
                  <Table.Td key={code}>
                    <TextInput
                      placeholder={code}
                      value={opt.label[code] ?? ''}
                      onChange={(e) => updateOption(idx, code, e.currentTarget.value)}
                      size="sm"
                    />
                  </Table.Td>
                ))}
                {langCodes.map((code) => (
                  <Table.Td key={`action-${code}`}>
                    <TextInput
                      placeholder={opt.label[code] ?? code}
                      value={opt.actionLabel?.[code] ?? ''}
                      onChange={(e) => updateOption(idx, `action:${code}`, e.currentTarget.value)}
                      size="sm"
                    />
                  </Table.Td>
                ))}
                <Table.Td>
                  <Select
                    data={STAGES.map((s) => ({ value: s, label: s }))}
                    value={opt.stage}
                    onChange={(v) => v && updateOption(idx, 'stage', v)}
                    size="sm"
                    allowDeselect={false}
                  />
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setEditingCapsIdx(idx)}
                    fullWidth
                  >
                    {(opt.capabilities ?? []).length === 0
                      ? 'Add capability'
                      : (opt.capabilities ?? []).length === 1
                        ? `${(opt.capabilities ?? []).length} capability — Edit`
                        : `${(opt.capabilities ?? []).length} capabilities — Edit`}
                  </Button>
                </Table.Td>
                <Table.Td>
                  <Group justify="right">
                    <IconPicker
                      value={(opt.icon as IconName) ?? IconName.Box}
                      onChange={(v) => updateOption(idx, 'icon', v)}
                    />
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group justify="center">
                    <Popover position="bottom" withArrow shadow="md">
                      <Popover.Target>
                        <UnstyledButton>
                          <ColorSwatch color={opt.color ?? '#228be6'} size={28} />
                        </UnstyledButton>
                      </Popover.Target>
                      <Popover.Dropdown p="sm">
                        <ColorPicker
                          value={opt.color}
                          onChange={(v) => updateOption(idx, 'color', v)}
                          size="sm"
                          format="hex"
                        />
                      </Popover.Dropdown>
                    </Popover>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group justify="center">
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="lg"
                      onClick={() => removeOption(idx)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
      <Button
        variant="light"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={addOption}
        w="fit-content"
      >
        Add Option
      </Button>

      {editingOpt && editingCapsIdx != null && (
        <CapabilitiesEditorModal
          opened={true}
          onClose={() => setEditingCapsIdx(null)}
          status={editingOpt}
          onChange={(newCaps) => updateOption(editingCapsIdx, 'capabilities', newCaps)}
        />
      )}
    </Stack>
  );
}
