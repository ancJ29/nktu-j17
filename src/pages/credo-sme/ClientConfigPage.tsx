import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  CopyButton,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCopy,
  IconKey,
  IconLogout,
  IconPlus,
  IconRefresh,
  IconShieldLock,
  IconTrash,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SectionCard } from '@/components/SectionCard';
import { appBrand, appConfig, themeConfig } from '@/config';
import { AppBrandName } from '@credo/base-ui/components';
import { credoSmeConnector } from '@credo/connectors/connector';
import type {
  CredoSmeClientConfig,
  CredoSmeProvisionClientResponse,
} from '@credo/connectors/types';

const ADMIN_KEY_STORAGE = '__credo_sme_admin_key__';
const SSO_ADMIN_KEY_STORAGE = '__credo_sme_sso_admin_key__';

function readSecret(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeSecret(key: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) sessionStorage.setItem(key, trimmed);
  else sessionStorage.removeItem(key);
}

export function ClientConfigPage() {
  const [authed, setAuthed] = useState<boolean>(() => readSecret(ADMIN_KEY_STORAGE).length > 0);

  useEffect(() => {
    if (authed) credoSmeConnector.setAccessKey(readSecret(ADMIN_KEY_STORAGE));
  }, [authed]);

  const handleAuthed = useCallback((accessKey: string) => {
    writeSecret(ADMIN_KEY_STORAGE, accessKey);
    credoSmeConnector.setAccessKey(accessKey.trim());
    setAuthed(true);
  }, []);

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    sessionStorage.removeItem(SSO_ADMIN_KEY_STORAGE);
    credoSmeConnector.setAccessKey('');
    setAuthed(false);
    notifications.show({ color: 'gray', message: 'Signed out — keys cleared.' });
  }, []);

  return (
    <BrandedShell authed={authed} onSignOut={handleSignOut}>
      {authed ? <ClientsPanel /> : <AuthGate onAuthed={handleAuthed} />}
    </BrandedShell>
  );
}

function BrandedShell({
  authed,
  onSignOut,
  children,
}: {
  authed: boolean;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const mainColor = themeConfig.mainColor;
  const headerBg = `var(--mantine-color-${mainColor}-9)`;
  const logoUrl = appConfig.app.logoDarkBgUrl || appConfig.app.logoUrl || '/logo-white.svg';

  return (
    <Box mih="100vh" bg="var(--mantine-color-gray-0)">
      <Box bg={headerBg} c="white" h={56}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Box
                component="img"
                src={logoUrl}
                alt=""
                h={28}
                w={28}
                style={{ objectFit: 'contain' }}
              />
              <AppBrandName {...appBrand} fw={700} size="lg" />
              {/* Names the BFF, not the page. Two operator screens now reach
                  the same register through two different services, and which
                  one you are on is the only thing that matters when they
                  disagree. */}
              <Badge size="sm" color="grape" variant="filled" tt="uppercase">
                credo-sme
              </Badge>
            </Group>
            {authed ? (
              <Button
                size="compact-sm"
                variant="white"
                color={mainColor}
                leftSection={<IconLogout size={14} />}
                onClick={onSignOut}
              >
                Sign out
              </Button>
            ) : (
              <Anchor href="/" c="white" size="sm" underline="hover">
                Exit
              </Anchor>
            )}
          </Group>
        </Container>
      </Box>

      <Container size="xl" py="xl">
        {children}
      </Container>
    </Box>
  );
}

function AuthGate({ onAuthed }: { onAuthed: (accessKey: string) => void }) {
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

function SsoAdminKeyField({
  value,
  onChange,
  action,
}: {
  value: string;
  onChange: (v: string) => void;
  action: string;
}) {
  return (
    <PasswordInput
      label="CREDO_SSO_ADMIN_ACCESS_KEY"
      description={`Sent to the BFF for this ${action} only. It is not stored on the server.`}
      value={value}
      onChange={(e) => {
        onChange(e.currentTarget.value);
        writeSecret(SSO_ADMIN_KEY_STORAGE, e.currentTarget.value);
      }}
      autoComplete="off"
      spellCheck={false}
      size="sm"
    />
  );
}

const ssoServiceCodeFor = (clientServiceCode: string) => `c-mngt-${clientServiceCode}`;

function ClientsPanel() {
  const [clients, setClients] = useState<CredoSmeClientConfig[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CredoSmeClientConfig | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ssoAdminKey, setSsoAdminKey] = useState<string>(() => readSecret(SSO_ADMIN_KEY_STORAGE));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await credoSmeConnector.listClients();
      if (!res.success) {
        throw new Error((res as { message?: string }).message ?? 'listClients failed');
      }
      setClients(res.clients);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { clientServiceCode, version } = pendingDelete;
    const issues: string[] = [];

    try {
      const res = await credoSmeConnector.removeClient({
        clientServiceCode,
        version,
        ssoAdminAccessKey: ssoAdminKey.trim(),
      });
      if (!res.success) {
        issues.push(`removeClient: ${(res as { message?: string }).message ?? 'failed'}`);
      }

      if (res.ssoIssues?.length) issues.push(...res.ssoIssues);
    } catch (err) {
      issues.push(`removeClient: ${err instanceof Error ? err.message : String(err)}`);
    }

    setDeleting(false);
    setPendingDelete(null);

    notifications.show(
      issues.length === 0
        ? {
            color: 'green',
            title: 'Client deleted',
            message: `${clientServiceCode} removed from credo-sme and credo-sso.`,
          }
        : { color: 'yellow', title: 'Partial deletion', message: issues.join(' · ') },
    );
    void load();
  }, [pendingDelete, ssoAdminKey, load]);

  return (
    <Stack gap="lg">
      <Group gap="xs" wrap="nowrap">
        <IconUsers size={22} style={{ opacity: 0.6 }} />
        <div>
          <Title order={3} lh={1.2}>
            Clients
          </Title>
          <Text size="xs" c="dimmed">
            The client register, read through credo-sme. Deleting also removes the matching
            credo-sso service.
          </Text>
        </div>
      </Group>

      <SectionCard
        icon={<IconUsers size={14} />}
        title="Registered clients"
        padding="md"
        actions={
          <Group gap="xs" wrap="nowrap">
            <Button
              size="compact-sm"
              leftSection={<IconPlus size={14} />}
              onClick={() => setAddOpen(true)}
            >
              Add client
            </Button>
            <Tooltip label="Refresh" withArrow>
              <ActionIcon variant="subtle" onClick={() => void load()} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
      >
        {loading && !clients && (
          <Group justify="center" py="lg">
            <Loader size="sm" />
          </Group>
        )}

        {loadError && (
          <Alert color="red" variant="light">
            {loadError}
          </Alert>
        )}

        {clients && clients.length === 0 && !loadError && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No clients yet.
          </Text>
        )}

        {clients && clients.length > 0 && (
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Domains</Table.Th>
                  <Table.Th>Active</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {clients.map((c) => (
                  <Table.Tr key={c.clientServiceCode}>
                    <Table.Td>
                      <Code>{c.clientServiceCode}</Code>
                    </Table.Td>
                    <Table.Td>{c.clientName}</Table.Td>
                    <Table.Td>
                      {c.domains.length > 0 ? (
                        <Stack gap="xs">
                          {c.domains.map((d, idx) => (
                            <Anchor
                              href={`https://${d}`}
                              target="_blank"
                              key={idx}
                              size="xs"
                              c="dimmed"
                              style={{ wordBreak: 'break-all' }}
                            >
                              {`https://${d}`}
                            </Anchor>
                          ))}
                        </Stack>
                      ) : (
                        <Text size="xs" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        color={c.isActive ? 'green' : 'gray'}
                        variant={c.isActive ? 'light' : 'outline'}
                      >
                        {c.isActive ? 'active' : 'disabled'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          leftSection={<IconTrash size={12} />}
                          onClick={() => setPendingDelete(c)}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </SectionCard>

      <AddClientModal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        ssoAdminKey={ssoAdminKey}
        onSsoAdminKeyChange={setSsoAdminKey}
        onProvisioned={() => void load()}
      />

      <ConfirmModal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Delete client?"
        message={
          pendingDelete
            ? `This will remove client "${pendingDelete.clientServiceCode}" and all its per-client data, plus the matching credo-sso service "${ssoServiceCodeFor(pendingDelete.clientServiceCode)}". Cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
        confirmDisabled={!ssoAdminKey.trim()}
      >
        <SsoAdminKeyField value={ssoAdminKey} onChange={setSsoAdminKey} action="deletion" />
      </ConfirmModal>
    </Stack>
  );
}

function AddClientModal({
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

function ProvisionResult({
  result,
  onDone,
}: {
  result: CredoSmeProvisionClientResponse;
  onDone: () => void;
}) {
  const rows: [string, string][] = [
    ['Client code', result.clientConfig.clientServiceCode],
    ['SSO service code', result.ssoServiceCode],
    ['Operator access key', result.operatorAccessKey],
    ['Root email', result.rootEmail],
    ['Root password', result.rootPassword],
  ];

  return (
    <Stack gap="sm">
      <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
        Client provisioned. The root password is shown only here — copy it now.
      </Alert>
      <Table verticalSpacing="xs">
        <Table.Tbody>
          {rows.map(([label, value]) => (
            <Table.Tr key={label}>
              <Table.Td w={180}>
                <Text size="xs" c="dimmed">
                  {label}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Code style={{ wordBreak: 'break-all' }}>{value}</Code>
                  <CopyButton value={value}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                        <ActionIcon variant="subtle" size="sm" onClick={copy}>
                          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end" mt="md">
        <Button onClick={onDone} size="sm" leftSection={<IconX size={16} />}>
          Close
        </Button>
      </Group>
    </Stack>
  );
}
