import { Badge, Code, Group, Stack, Text } from '@mantine/core';
import { CredoAppConfigSchema, type CredoAppConfig } from '../schema';

const MODELLED_KEYS: string[] = Object.keys(CredoAppConfigSchema.shape);

export function CarriedThroughSection({ config }: { config: CredoAppConfig | null }) {
  const carried = config
    ? Object.keys(config)
        .filter((key) => !MODELLED_KEYS.includes(key))
        .sort()
    : [];

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        This editor is being ported section by section. The keys below sit outside{' '}
        <Code>schema.ts</Code>, as do the parts of the sections above that it does not render — and
        a save sends every one of them back exactly as it was read.
      </Text>
      {carried.length > 0 ? (
        <Group gap="xs">
          {carried.map((key) => (
            <Badge key={key} size="sm" variant="outline" color="gray">
              {key}
            </Badge>
          ))}
        </Group>
      ) : (
        <Text size="xs" c="dimmed">
          Nothing else stored yet.
        </Text>
      )}
    </Stack>
  );
}
