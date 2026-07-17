import { ActionIcon, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { ConfigOption as CMngtConfigOption, Language } from '@credo/kits/types';

export function ConfigOptionEditor({
  options,
  onChange,
  languages,
  label,
}: {
  options: CMngtConfigOption[];
  onChange: (opts: CMngtConfigOption[]) => void;
  languages: Language[];
  label: string;
}) {
  const langCodes = languages.map((l) => l.code).filter(Boolean);

  const addOption = () => {
    const emptyLabel: Record<string, string> = {};
    for (const code of langCodes) emptyLabel[code] = '';
    onChange([...options, { value: '', label: emptyLabel }]);
  };

  const updateOption = (idx: number, field: 'value' | string, val: string) => {
    const updated = options.map((opt, i) => {
      if (i !== idx) return opt;
      if (field === 'value') return { ...opt, value: val };
      return { ...opt, label: { ...opt.label, [field]: val } };
    });
    onChange(updated);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        {label}
      </Text>
      {options.map((opt, idx) => (
        <Group key={idx} align="flex-end" gap="xs">
          <TextInput
            label={idx === 0 ? 'Value' : undefined}
            placeholder="value"
            value={opt.value}
            onChange={(e) => updateOption(idx, 'value', e.currentTarget.value)}
            size="sm"
            w={120}
          />
          {langCodes.map((code) => (
            <TextInput
              key={code}
              label={idx === 0 ? code.toUpperCase() : undefined}
              placeholder={code}
              value={opt.label[code] ?? ''}
              onChange={(e) => updateOption(idx, code, e.currentTarget.value)}
              size="sm"
              style={{ flex: 1 }}
            />
          ))}
          <ActionIcon variant="light" color="red" size="lg" onClick={() => removeOption(idx)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
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
