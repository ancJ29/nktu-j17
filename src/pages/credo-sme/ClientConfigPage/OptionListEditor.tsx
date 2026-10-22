import { ActionIcon, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

type Option = { value: string; label: Record<string, string> };

export function OptionListEditor<T extends Option>({
  options,
  langCodes,
  addLabel,
  emptyHint,
  onChange,
  renderExtra,
}: {
  options: T[];
  langCodes: string[];
  addLabel: string;
  emptyHint: string;
  onChange: (next: T[]) => void;

  renderExtra?: (option: T, index: number) => React.ReactNode;
}) {
  const update = (index: number, patch: Partial<Option>) =>
    onChange(options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));

  return (
    <Stack gap="sm">
      {options.length === 0 && (
        <Text size="xs" c="dimmed">
          {emptyHint}
        </Text>
      )}

      {options.map((option, index) => (
        <Stack key={index} gap={4}>
          <Group align="flex-end" gap="xs" wrap="nowrap">
            <TextInput
              label={index === 0 ? 'Value' : undefined}
              placeholder="value"
              value={option.value}
              onChange={(e) => update(index, { value: e.currentTarget.value })}
              size="sm"
              w={140}
              autoComplete="off"
              spellCheck={false}
            />
            {langCodes.map((code) => (
              <TextInput
                key={code}
                label={index === 0 ? code.toUpperCase() : undefined}
                value={option.label[code] ?? ''}
                onChange={(e) =>
                  update(index, { label: { ...option.label, [code]: e.currentTarget.value } })
                }
                size="sm"
                style={{ flex: 1 }}
              />
            ))}
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onChange(options.filter((_, i) => i !== index))}
              aria-label="Remove"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
          {renderExtra?.(option, index)}
        </Stack>
      ))}

      <Group>
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            onChange([
              ...options,
              {
                value: '',
                label: Object.fromEntries(langCodes.map((c) => [c, ''])),
              } as unknown as T,
            ])
          }
        >
          {addLabel}
        </Button>
      </Group>
    </Stack>
  );
}
