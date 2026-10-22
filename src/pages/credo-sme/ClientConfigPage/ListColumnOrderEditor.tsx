import { ActionIcon, Badge, Button, Card, Group, Input, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconPlus, IconX } from '@tabler/icons-react';

export function ListColumnOrderEditor({
  label,
  description,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly description: string;
  readonly options: ReadonlyArray<{ value: string; label: string }>;
  readonly value: string[];
  readonly onChange: (next: string[]) => void;
}) {
  const labelOf = (key: string) => options.find((option) => option.value === key)?.label;
  const remaining = options.filter((option) => !value.includes(option.value));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onChange(next);
  };

  return (
    <Input.Wrapper label={label} description={description}>
      <Stack gap={6} mt={6}>
        {value.length > 0 && (
          <Card withBorder padding={6}>
            <Stack gap={4}>
              {value.map((key, index) => {
                const known = labelOf(key);
                return (
                  <Group key={key} gap="xs" wrap="nowrap">
                    <Badge size="sm" variant="light" circle>
                      {index + 1}
                    </Badge>
                    {/* A key nothing offers still shows, so the operator can
                        remove it — the same reason a stale status stays
                        visible rather than vanishing from its picker. */}
                    <Text size="sm" flex={1} truncate c={known ? undefined : 'dimmed'}>
                      {known ?? `${key} (not on this list)`}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <IconChevronUp size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      aria-label="Move down"
                      disabled={index === value.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <IconChevronDown size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Unpin column"
                      onClick={() => onChange(value.filter((kept) => kept !== key))}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          </Card>
        )}

        {remaining.length > 0 && (
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {value.length === 0
                ? 'Nothing pinned — the list draws its own order. Add a column to start pinning.'
                : 'Drawn after the pinned ones, in the order above:'}
            </Text>
            <Group gap={6}>
              {remaining.map((option) => (
                <Button
                  key={option.value}
                  size="compact-xs"
                  variant="default"
                  leftSection={<IconPlus size={12} />}
                  onClick={() => onChange([...value, option.value])}
                >
                  {option.label}
                </Button>
              ))}
            </Group>
          </Stack>
        )}
      </Stack>
    </Input.Wrapper>
  );
}
