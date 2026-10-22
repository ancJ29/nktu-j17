import { resolveClientCode } from '@/config/client-code';
import { cMngtConnector } from '@credo/connectors/connector';
import { Button, Group, PasswordInput, Paper, Stack, Text } from '@mantine/core';
import { IconKey } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { ACCESS_KEY_STORAGE } from './types';

export function AccessKeyGate({ children }: { children: (accessKey: string) => React.ReactNode }) {
  const [accessKey, setAccessKey] = useState(
    () => sessionStorage.getItem(ACCESS_KEY_STORAGE) ?? '',
  );
  const [inputValue, setInputValue] = useState('');
  const [authenticated, setAuthenticated] = useState(
    () => !!sessionStorage.getItem(ACCESS_KEY_STORAGE),
  );
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;
    setVerifying(true);
    setError('');

    try {
      const clientCode = resolveClientCode();
      if (!clientCode) {
        setError('No client code resolved');
        setVerifying(false);
        return;
      }
      cMngtConnector.setAccessKey(inputValue.trim());
      const res = await cMngtConnector.getAppConfigAdmin({ clientServiceCode: clientCode });
      if (res.success || res.config !== undefined) {
        sessionStorage.setItem(ACCESS_KEY_STORAGE, inputValue.trim());
        setAccessKey(inputValue.trim());
        setAuthenticated(true);
      } else {
        setError('Invalid access key. Please check and try again.');
      }
    } catch {
      setError('Invalid access key. Please check and try again.');
    } finally {
      setVerifying(false);
    }
  }, [inputValue]);

  if (authenticated && accessKey) {
    return <>{children(accessKey)}</>;
  }

  return (
    <Paper p="xl" withBorder maw={440} mx="auto" mt="xl">
      <Stack gap="md">
        <Group gap="xs">
          <IconKey size={20} />
          <Text fw={600}>Admin Access Key</Text>
        </Group>
        <Text c="dimmed" fz="sm">
          Enter the admin access key for the C-Mngt BFF to manage app configuration.
        </Text>
        <PasswordInput
          placeholder="Enter access key"
          value={inputValue}
          onChange={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          error={error}
        />
        <Button onClick={handleSubmit} loading={verifying} disabled={!inputValue.trim()}>
          Authenticate
        </Button>
      </Stack>
    </Paper>
  );
}
