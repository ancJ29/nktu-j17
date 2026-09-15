import {
  Alert,
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { credoSmeConnector } from '@credo/connectors/connector';
import type { CredoSmeProvisionClientResponse } from '@credo/connectors/types';
import { ProvisionResult } from './ProvisionResult';
import { SsoAdminKeyField } from './SsoAdminKeyField';

export function AddClientModal({
  opened,
  onClose,
  ssoAdminKey,
  onSsoAdminKeyChange,
  onProvisioned,
}: {
  opened: boolean;
  onClose: () => void;
  ssoAdminKey: string;
  onSsoAdminKeyChange: (v: string) => void;
  onProvisioned: () => void;
}) {
  const [clientServiceCode, setClientServiceCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [rootEmail, setRootEmail] = useState('');
  const [rootPassword, setRootPassword] = useState('');
  const [domainsText, setDomainsText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CredoSmeProvisionClientResponse | null>(null);

  const canSubmit =
    !running &&
    clientServiceCode.trim().length > 0 &&
    clientName.trim().length > 0 &&
    rootEmail.trim().length > 0 &&
    domainsText.trim().length > 0 &&
    ssoAdminKey.trim().length > 0;

  const reset = useCallback(() => {
    setClientServiceCode('');
    setClientName('');
    setRootEmail('');
    setRootPassword('');
    setDomainsText('');
    setContactEmail('');
    setDescription('');
    setError(null);
    setResult(null);
  }, []);

  const handleProvision = useCallback(async () => {
    if (!canSubmit) return;
    setRunning(true);
    setError(null);

    try {
      const domains = domainsText
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await credoSmeConnector.provisionClient({
        clientServiceCode: clientServiceCode.trim(),
        clientName: clientName.trim(),
        description: description.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        domains,
        rootEmail: rootEmail.trim(),
        rootPassword: rootPassword.trim() || undefined,

        ssoAdminAccessKey: ssoAdminKey.trim(),
      });

      if (!res.success) {
        throw new Error((res as { message?: string }).message ?? 'Provision failed');
      }

      setResult(res);
      notifications.show({
        color: 'green',
        title: 'Client provisioned',
        message: `${res.clientConfig.clientServiceCode} is ready.`,
      });
      onProvisioned();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      notifications.show({ color: 'red', title: 'Provision failed', message });
    } finally {
      setRunning(false);
    }
  }, [
    canSubmit,
    clientServiceCode,
    clientName,
    description,
    contactEmail,
    domainsText,
    rootEmail,
    rootPassword,
    ssoAdminKey,
    onProvisioned,
  ]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal opened={opened} onClose={handleClose} title="Add client" centered size="lg">
      {result ? (
        <ProvisionResult result={result} onDone={handleClose} />
      ) : (
        <Stack gap="sm">
          <TextInput
            label="Client service code"
            description="Lowercase identifier. Becomes the credo-sso service code as c-mngt-<code>."
            value={clientServiceCode}
            onChange={(e) => setClientServiceCode(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <TextInput
            label="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Domains"
            description="Comma-separated, no scheme."
            value={domainsText}
            onChange={(e) => setDomainsText(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <TextInput
            label="Root email"
            description="The first SSO user for this client."
            value={rootEmail}
            onChange={(e) => setRootEmail(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <PasswordInput
            label="Root password"
            description="Optional — generated if left empty. Shown once, on success."
            value={rootPassword}
            onChange={(e) => setRootPassword(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <TextInput
            label="Contact email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />

          <SsoAdminKeyField value={ssoAdminKey} onChange={onSsoAdminKeyChange} action="provision" />

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleClose} size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => void handleProvision()}
              disabled={!canSubmit}
              loading={running}
              size="sm"
              leftSection={<IconPlus size={16} />}
            >
              Provision
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
