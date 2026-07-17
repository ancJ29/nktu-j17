import type { CMngtSalesOrderTagOption, Language } from '@credo/kits/types';
import {
  ActionIcon,
  Button,
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

export function SalesOrderTagOptionEditor({
  options,
  onChange,
  languages,
}: {
  options: CMngtSalesOrderTagOption[];
  onChange: (opts: CMngtSalesOrderTagOption[]) => void;
  languages: Language[];
}) {
  const langCodes = languages.map((l) => l.code).filter(Boolean);

  const addOption = () => {
    const emptyLabel: Record<string, string> = {};
    for (const code of langCodes) emptyLabel[code] = '';
    onChange([...options, { value: '', label: emptyLabel, color: '#228be6' }]);
  };

  const updateOption = (idx: number, field: string, val: unknown) => {
    const updated = options.map((opt, i) => {
      if (i !== idx) return opt;
      if (field === 'value') return { ...opt, value: val as string };
      if (field === 'color') return { ...opt, color: val as string };
      return { ...opt, label: { ...opt.label, [field]: val as string } };
    });
    onChange(updated);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        Tag Options
      </Text>
      <Table withRowBorders={false} verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={150}>Value</Table.Th>
            {langCodes.map((code) => (
              <Table.Th key={code}>{code.toUpperCase()}</Table.Th>
            ))}
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
