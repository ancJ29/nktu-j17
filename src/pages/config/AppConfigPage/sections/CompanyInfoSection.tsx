import { SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { memo } from 'react';
import type { CompanyInfoConfig } from '@/config/schema';

export const CompanyInfoSection = memo(function CompanyInfoSection({
  value,
  onChange,
}: {
  value: CompanyInfoConfig;
  onChange: (v: CompanyInfoConfig) => void;
}) {
  const set =
    (key: keyof CompanyInfoConfig) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [key]: e.currentTarget.value });
  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Printed in the header of generated documents (delivery note, quotation PDF). Fields left
        empty fall back to the app&apos;s built-in values for this client.
      </Text>
      <TextInput label="Company name" value={value.name} onChange={set('name')} size="sm" />
      <Textarea
        label="Address"
        value={value.address}
        onChange={set('address')}
        autosize
        minRows={2}
        size="sm"
      />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <TextInput label="Tax code" value={value.taxCode} onChange={set('taxCode')} size="sm" />
        <TextInput label="Tel" value={value.tel} onChange={set('tel')} size="sm" />
        <TextInput label="Email" value={value.email} onChange={set('email')} size="sm" />
      </SimpleGrid>
    </Stack>
  );
});
