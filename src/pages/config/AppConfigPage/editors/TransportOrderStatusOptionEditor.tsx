import type { CMngtTransportOrderStatusOption, Language } from '@credo/kits/types';
import {
  ActionIcon,
  Button,
  Checkbox,
  ColorPicker,
  ColorSwatch,
  Group,
  Popover,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

export function TransportOrderStatusOptionEditor({
  options,
  onChange,
  languages,
}: {
  options: CMngtTransportOrderStatusOption[];
  onChange: (opts: CMngtTransportOrderStatusOption[]) => void;
  languages: Language[];
}) {
  const langCodes = languages.map((l) => l.code).filter(Boolean);

  const addOption = () => {
    const emptyLabel: Record<string, string> = {};
    for (const code of langCodes) emptyLabel[code] = '';
    onChange([...options, { value: '', label: emptyLabel, color: '#228be6' }]);
  };

  const patch = (idx: number, next: Partial<CMngtTransportOrderStatusOption>) =>
    onChange(options.map((opt, i) => (i === idx ? { ...opt, ...next } : opt)));

  const setLabel = (idx: number, code: string, val: string, field: 'label' | 'actionLabel') =>
    onChange(
      options.map((opt, i) =>
        i === idx ? { ...opt, [field]: { ...(opt[field] ?? {}), [code]: val } } : opt,
      ),
    );

  
  const setInitial = (idx: number) =>
    onChange(options.map((opt, i) => ({ ...opt, isInitial: i === idx ? true : undefined })));

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Status Options
      </Text>
      <Text fz="xs" c="dimmed">
        Order matters — this list IS the flow order shown on the order timeline. “Action” is the
        button verb for moving INTO the status. “Initial” = where a new order starts. “Locked” =
        freezes the order (no edit, delete, or further transition). Changing a Value orphans orders
        already saved with the old one.
      </Text>
      <Table withRowBorders={false} verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={140}>Value</Table.Th>
            {langCodes.map((code) => (
              <Table.Th key={code}>{code.toUpperCase()}</Table.Th>
            ))}
            {langCodes.map((code) => (
              <Table.Th key={`action-${code}`}>Action ({code.toUpperCase()})</Table.Th>
            ))}
            <Table.Th w={60} ta="center">
              Color
            </Table.Th>
            <Table.Th w={70} ta="center">
              Initial
            </Table.Th>
            <Table.Th w={70} ta="center">
              Terminal
            </Table.Th>
            <Table.Th w={70} ta="center">
              Locked
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
                  onChange={(e) => patch(idx, { value: e.currentTarget.value })}
                  size="sm"
                />
              </Table.Td>
              {langCodes.map((code) => (
                <Table.Td key={code}>
                  <TextInput
                    placeholder={code}
                    value={opt.label[code] ?? ''}
                    onChange={(e) => setLabel(idx, code, e.currentTarget.value, 'label')}
                    size="sm"
                  />
                </Table.Td>
              ))}
              {langCodes.map((code) => (
                <Table.Td key={`action-${code}`}>
                  <TextInput
                    placeholder="verb"
                    value={opt.actionLabel?.[code] ?? ''}
                    onChange={(e) => setLabel(idx, code, e.currentTarget.value, 'actionLabel')}
                    size="sm"
                  />
                </Table.Td>
              ))}
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
                        onChange={(v) => patch(idx, { color: v })}
                        size="sm"
                        format="hex"
                      />
                    </Popover.Dropdown>
                  </Popover>
                </Group>
              </Table.Td>
              <Table.Td ta="center">
                <Checkbox
                  size="xs"
                  checked={!!opt.isInitial}
                  onChange={() => setInitial(idx)}
                  styles={{ input: { cursor: 'pointer' } }}
                />
              </Table.Td>
              <Table.Td ta="center">
                <Checkbox
                  size="xs"
                  checked={!!opt.terminal}
                  onChange={(e) => patch(idx, { terminal: e.currentTarget.checked || undefined })}
                  styles={{ input: { cursor: 'pointer' } }}
                />
              </Table.Td>
              <Table.Td ta="center">
                <Checkbox
                  size="xs"
                  checked={!!opt.locked}
                  onChange={(e) => patch(idx, { locked: e.currentTarget.checked || undefined })}
                  styles={{ input: { cursor: 'pointer' } }}
                />
              </Table.Td>
              <Table.Td>
                <Group justify="center">
                  <ActionIcon
                    variant="light"
                    color="red"
                    size="lg"
                    onClick={() => onChange(options.filter((_, i) => i !== idx))}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Button
        variant="light"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={addOption}
        w="fit-content"
      >
        Add Option
      </Button>
    </Stack>
  );
}
