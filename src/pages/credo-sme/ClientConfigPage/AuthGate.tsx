import { Alert, Button, Card, Group, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { IconKey, IconShieldLock } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { credoSmeConnector } from '@credo/connectors/connector';
import { ADMIN_KEY_STORAGE, readSecret } from './secrets';

export function AuthGate({ onAuthed }: { onAuthed: (accessKey: string) => void }) {
  const [value, setValue] = useState<string>(() => readSecret(ADMIN_KEY_STORAGE));
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !validating && value.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setValidating(true);
    setError(null);

    const trimmed = value.trim();

    credoSmeConnector.setAccessKey(trimmed);
    try {
      const res = await credoSmeConnector.listClients();
      if (!res.success) {
        throw new Error((res as { message?: string }).message ?? 'Invalid admin key');
      }
      onAuthed(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed. Check the key.');
      credoSmeConnector.setAccessKey('');
    } finally {
      setValidating(false);
    }
  }, [canSubmit, value, onAuthed]);

  return (
    <Stack gap="lg" align="center" mt="xl">
      <Group gap="xs" wrap="nowrap">
        <IconShieldLock size={22} style={{ opacity: 0.6 }} />
        <div>
          <Title order={3} lh={1.2}>
            Admin authentication
          </Title>
          <Text size="sm" c="dimmed">
            Enter the credo-sme admin access key to continue. Kept in sessionStorage and wiped on
            tab close. The SSO admin key is asked for when you add or delete a client.
          </Text>
        </div>
      </Group>

      <Card withBorder padding="lg" w="100%" maw={520}>
        <Stack gap="sm">
          <PasswordInput
            label="X-Access-Key"
            value={value}
            onChange={(e) => {
              setValue(e.currentTarget.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) void handleSubmit();
            }}
          />

          {error && (
            <Alert color="red" variant="light" mt="xs">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={validating}
              leftSection={<IconKey size={16} />}
            >
              Validate &amp; continue
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
