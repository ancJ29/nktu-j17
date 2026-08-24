import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { memo } from 'react';
import { DEFAULT_COMPANY_INFO } from '@/config/default-config';
import type { CompanyInfoConfig } from '@/config/schema';

export const CompanyInfoSection = memo(function CompanyInfoSection({
  value,
  onChange,
}: {
  value: CompanyInfoConfig[];
  onChange: (v: CompanyInfoConfig[]) => void;
}) {
  const setField =
    (index: number, key: keyof CompanyInfoConfig) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(value.map((c, i) => (i === index ? { ...c, [key]: e.currentTarget.value } : c)));

  const add = () => onChange([...value, { ...DEFAULT_COMPANY_INFO, id: newCompanyId() }]);
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const makeDefault = (index: number) =>
    onChange([value[index]!, ...value.filter((_, i) => i !== index)]);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Printed in the header of generated documents (delivery note, quotation PDF). Fields left
        empty fall back to the app&apos;s built-in values for this client. Add more than one company
        to let staff pick the issuer on a quotation — the first one is the default.
      </Text>
      {value.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic">
          No company configured — documents print without a seller header.
        </Text>
      )}
      {value.map((company, index) => (
        <Card key={company.id || index} withBorder radius="md" padding="sm">
          <Group justify="space-between" mb="xs">
            {index === 0 ? (
              <Badge size="sm" variant="light">
                Default
              </Badge>
            ) : (
              <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<IconArrowUp size={14} />}
                onClick={() => makeDefault(index)}
              >
                Set as default
              </Button>
            )}
            <Tooltip label="Remove company">
              <ActionIcon color="red" variant="subtle" onClick={() => remove(index)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Stack gap="sm">
            <TextInput
              label="Company name"
              value={company.name}
              onChange={setField(index, 'name')}
              size="sm"
            />
            <Textarea
              label="Address"
              value={company.address}
              onChange={setField(index, 'address')}
              autosize
              minRows={2}
              size="sm"
            />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <TextInput
                label="Tax code"
                value={company.taxCode}
                onChange={setField(index, 'taxCode')}
                size="sm"
              />
              <TextInput
                label="Tel"
                value={company.tel}
                onChange={setField(index, 'tel')}
                size="sm"
              />
              <TextInput
                label="Email"
                value={company.email}
                onChange={setField(index, 'email')}
                size="sm"
              />
            </SimpleGrid>
          </Stack>
        </Card>
      ))}
      <Group>
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={add}>
          Add company
        </Button>
      </Group>
    </Stack>
  );
});

function newCompanyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
