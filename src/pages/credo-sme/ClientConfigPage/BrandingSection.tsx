import { SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { LOGO_FIELDS, type LogoField } from './logoFields';

export function BrandingSection({
  logos,
  onChange,
}: {
  logos: Record<LogoField, string>;
  onChange: (next: Record<LogoField, string>) => void;
}) {
  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Absolute URLs. Leave a field empty to fall back to the built-in static asset — empty is a
        valid answer here, not a missing one.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {LOGO_FIELDS.map((field) => (
          <TextInput
            key={field.key}
            label={field.label}
            description={field.hint}
            value={logos[field.key]}
            onChange={(e) => onChange({ ...logos, [field.key]: e.currentTarget.value })}
            autoComplete="off"
            spellCheck={false}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
