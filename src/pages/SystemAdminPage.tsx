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
  Divider,
  FileButton,
  Group,
  Loader,
  PasswordInput,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { AppBrandName } from '@credo/base-ui/components';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustments,
  IconBuildingSkyscraper,
  IconCheck,
  IconClipboardList,
  IconFileImport,
  IconKey,
  IconLogout,
  IconRefresh,
  IconRocket,
  IconShieldLock,
  IconTrash,
  IconUpload,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SectionCard } from '@/components/SectionCard';
import { appBrand, appConfig, themeConfig } from '@/config';
import { minimalAppConfig } from '@/config/minimal-config';
import { CMngtAppConfigSchema } from '@/config/schema';
import { ConfigEditor } from '@/pages/config/AppConfigPage';
import { cMngtConnector } from '@credo/connectors/connector';
import type { CMngtProvisionClientResponse as ProvisionClientResponse } from '@credo/connectors/types';
import { isInternal } from '@/config/env';

type ClientConfig = Awaited<ReturnType<typeof cMngtConnector.listClients>>['clients'][number];

const STORAGE_KEYS = {
  cMngtAdminAccessKey: '__c_mngt_admin_key__',
  ssoAdminAccessKey: '__gen_client_sso_admin_key__',
} as const;

type SecretField = keyof typeof STORAGE_KEYS;

const SECRET_FIELDS: SecretField[] = ['cMngtAdminAccessKey', 'ssoAdminAccessKey'];

const GATE_FIELD: SecretField = 'cMngtAdminAccessKey';

const SECRET_LABELS: Record<SecretField, string> = {
  cMngtAdminAccessKey: 'C_MNGT_ADMIN_ACCESS_KEY',
  ssoAdminAccessKey: 'CREDO_SSO_ADMIN_ACCESS_KEY',
};

function readSecret(field: SecretField): string {
  try {
    if (isInternal) {
      const value = localStorage.getItem(STORAGE_KEYS[field]) ?? '';
      if (value) return value;
    }
    return sessionStorage.getItem(STORAGE_KEYS[field]) ?? '';
  } catch {
    return '';
  }
}

function clearSecrets() {
  for (const field of SECRET_FIELDS) {
    const key = STORAGE_KEYS[field];
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}

function writeSecret(field: SecretField, value: string) {
  const key = STORAGE_KEYS[field];
  const trimmed = value.trim();
  if (trimmed) {
    sessionStorage.setItem(key, trimmed);
    if (isInternal) localStorage.setItem(key, trimmed);
  } else {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}

function hasGateSecret(): boolean {
  return readSecret(GATE_FIELD).trim().length > 0;
}

type ImportedFileKind = 'base-data' | 'app-config' | 'department' | 'unknown';

type DepartmentOption = { value: string; label: Record<string, string> };

function detectFileKind(data: unknown): ImportedFileKind {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown> | null;
    if (first && typeof first === 'object' && 'value' in first && 'label' in first) {
      return 'department';
    }
    return 'unknown';
  }
  if (!data || typeof data !== 'object') return 'unknown';
  const obj = data as Record<string, unknown>;
  if ('rootEmail' in obj && 'domains' in obj) return 'base-data';
  if ('app' in obj && 'features' in obj) return 'app-config';
  return 'unknown';
}

export function SystemAdminPage() {
  const [authed, setAuthed] = useState<boolean>(hasGateSecret);

  useEffect(() => {
    if (authed) {
      cMngtConnector.setAccessKey(readSecret(GATE_FIELD));
    }
  }, [authed]);

  const handleAuthed = useCallback((cMngtAdminAccessKey: string) => {
    writeSecret(GATE_FIELD, cMngtAdminAccessKey);
    cMngtConnector.setAccessKey(cMngtAdminAccessKey.trim());
    setAuthed(true);
  }, []);

  const handleSignOut = useCallback(() => {
    clearSecrets();
    cMngtConnector.setAccessKey('');
    setAuthed(false);
    notifications.show({ color: 'gray', message: 'Signed out — keys cleared.' });
  }, []);

  return (
    <BrandedShell authed={authed} onSignOut={handleSignOut}>
      {authed ? <AdminTabs /> : <AuthGate onAuthed={handleAuthed} />}
    </BrandedShell>
  );
}

type TabValue = 'provision' | 'clients' | 'app-config' | 'validate';

const TAB_VALUES: readonly TabValue[] = ['provision', 'clients', 'app-config', 'validate'];

function isTabValue(v: string | null): v is TabValue {
  return v !== null && (TAB_VALUES as readonly string[]).includes(v);
}

function AdminTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabValue>(() => {
    const fromUrl = searchParams.get('tab');
    return isTabValue(fromUrl) ? fromUrl : 'provision';
  });

  const [selectedClient, setSelectedClient] = useState<string | null>(
    () => searchParams.get('client-code') || null,
  );

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'provision') next.delete('tab');
        else next.set('tab', tab);
        if (selectedClient) next.set('client-code', selectedClient);
        else next.delete('client-code');
        return next;
      },
      { replace: true },
    );
  }, [tab, selectedClient, setSearchParams]);

  const [refreshSignal, setRefreshSignal] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshSignal((n) => n + 1), []);

  const handleConfigureClient = useCallback((clientServiceCode: string) => {
    setSelectedClient(clientServiceCode);
    setTab('app-config');
  }, []);

  return (
    <Tabs value={tab} onChange={(v) => v && setTab(v as TabValue)} keepMounted={false} mt="md">
      <Tabs.List>
        <Tabs.Tab value="provision" leftSection={<IconRocket size={14} />}>
          Provision
        </Tabs.Tab>
        <Tabs.Tab value="clients" leftSection={<IconUsers size={14} />}>
          Clients
        </Tabs.Tab>
        <Tabs.Tab value="app-config" leftSection={<IconAdjustments size={14} />}>
          Configure
        </Tabs.Tab>
        <Tabs.Tab value="validate" leftSection={<IconClipboardList size={14} />}>
          Validate
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="provision" pt="lg">
        <ProvisionPanel onProvisioned={bumpRefresh} />
      </Tabs.Panel>

      <Tabs.Panel value="clients" pt="lg">
        <ClientsPanel
          refreshSignal={refreshSignal}
          onMutate={bumpRefresh}
          onConfigureClient={handleConfigureClient}
        />
      </Tabs.Panel>

      <Tabs.Panel value="app-config" pt="lg">
        <ConfigPanel
          refreshSignal={refreshSignal}
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
        />
      </Tabs.Panel>

      <Tabs.Panel value="validate" pt="lg">
        <ValidatePanel refreshSignal={refreshSignal} />
      </Tabs.Panel>
    </Tabs>
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
        {/* `xl`, not the app's usual `md`: this page is dense operator tooling —
            config toggle rows, client tables, seed-data grids — not reading
            copy, so the wider measure earns its keep. Header and body must
            carry the SAME size or the brand bar stops aligning with content. */}
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
              <Badge size="sm" color="orange" variant="filled" tt="uppercase">
                System Admin
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

function AuthGate({ onAuthed }: { onAuthed: (cMngtAdminAccessKey: string) => void }) {
  const [value, setValue] = useState<string>(() => readSecret(GATE_FIELD));
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !validating && value.trim().length > 0;

  const handleChange = (next: string) => {
    setValue(next);
    if (error) setError(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setValidating(true);
    setError(null);

    const trimmed = value.trim();

    cMngtConnector.setAccessKey(trimmed);
    try {
      const res = await cMngtConnector.listClients();
      if (!res.success) {
        const message = (res as { message?: string }).message ?? 'Invalid admin key';
        throw new Error(message);
      }
      onAuthed(trimmed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Validation failed. Check the key and try again.';
      setError(message);
      cMngtConnector.setAccessKey('');
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
            Enter the C-Mngt admin access key to continue. Kept in sessionStorage and wiped on tab
            close. The SSO admin key is asked for when you provision or delete a client.
          </Text>
        </div>
      </Group>

      <Card withBorder padding="lg" w="100%" maw={520}>
        <Stack gap="sm">
          <PasswordInput
            label={SECRET_LABELS[GATE_FIELD]}
            value={value}
            onChange={(e) => handleChange(e.currentTarget.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) handleSubmit();
            }}
          />

          {error && (
            <Alert color="red" variant="light" mt="xs">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              onClick={handleSubmit}
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
      label={SECRET_LABELS.ssoAdminAccessKey}
      description={`Sent to the BFF for this ${action} only. It is not stored on the server.`}
      value={value}
      onChange={(e) => {
        onChange(e.currentTarget.value);
        writeSecret('ssoAdminAccessKey', e.currentTarget.value);
      }}
      autoComplete="off"
      spellCheck={false}
      size="sm"
    />
  );
}

function ProvisionPanel({ onProvisioned }: { onProvisioned: () => void }) {
  const [clientServiceCode, setClientServiceCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [rootEmail, setRootEmail] = useState('');
  const [rootPassword, setRootPassword] = useState('');
  const [domainsText, setDomainsText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');

  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionClientResponse | null>(null);

  const [configWarning, setConfigWarning] = useState<string | null>(null);

  const [importedAppConfig, setImportedAppConfig] = useState<Record<string, unknown> | null>(null);

  const [importedDepartments, setImportedDepartments] = useState<DepartmentOption[] | null>(null);
  const [importedFiles, setImportedFiles] = useState<
    { name: string; kind: ImportedFileKind; error?: string }[]
  >([]);

  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const [ssoAdminKey, setSsoAdminKey] = useState<string>(() => readSecret('ssoAdminAccessKey'));

  const applyBaseData = useCallback((data: Record<string, unknown>) => {
    if (typeof data.code === 'string') setClientServiceCode(data.code);
    if (typeof data.name === 'string') setClientName(data.name);
    if (typeof data.rootEmail === 'string') setRootEmail(data.rootEmail);
    if (typeof data.rootPassword === 'string') setRootPassword(data.rootPassword);
    if (Array.isArray(data.domains)) {
      setDomainsText(data.domains.filter((d) => typeof d === 'string').join(', '));
    }
    if (typeof data.contactEmail === 'string') setContactEmail(data.contactEmail);
    if (typeof data.description === 'string') setDescription(data.description);
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const accepted: typeof importedFiles = [];
      for (const file of files) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const kind = detectFileKind(data);
          if (kind === 'base-data') {
            applyBaseData(data as Record<string, unknown>);
          } else if (kind === 'app-config') {
            setImportedAppConfig(data as Record<string, unknown>);
          } else if (kind === 'department') {
            setImportedDepartments(data as DepartmentOption[]);
          }
          accepted.push({ name: file.name, kind });
        } catch (err) {
          accepted.push({
            name: file.name,
            kind: 'unknown',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      setImportedFiles((prev) => [...prev, ...accepted]);

      const recognized = accepted.filter((a) => a.kind !== 'unknown' && !a.error);
      if (recognized.length > 0) {
        notifications.show({
          color: 'teal',
          message: `Imported ${recognized.length} file(s): ${recognized.map((a) => `${a.name} (${a.kind})`).join(', ')}`,
        });
      }
      const failed = accepted.filter((a) => a.kind === 'unknown' || a.error);
      for (const f of failed) {
        notifications.show({
          color: 'yellow',
          title: f.name,
          message: f.error ?? 'Unrecognized JSON shape — skipped.',
        });
      }
    },
    [applyBaseData],
  );

  const clearImports = useCallback(() => {
    setImportedAppConfig(null);
    setImportedDepartments(null);
    setImportedFiles([]);
  }, []);

  const canSubmit =
    !running &&
    clientServiceCode.trim().length > 0 &&
    clientName.trim().length > 0 &&
    rootEmail.trim().length > 0 &&
    domainsText.trim().length > 0;

  const handleProvision = useCallback(async () => {
    closeConfirm();
    setRunning(true);
    setLastError(null);
    setResult(null);
    setConfigWarning(null);

    const trimmedCode = clientServiceCode.trim();
    const trimmedName = clientName.trim();
    const trimmedDescription = description.trim();

    try {
      const domains = domainsText
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await cMngtConnector.provisionClient({
        clientServiceCode: trimmedCode,
        clientName: trimmedName,
        description: trimmedDescription || undefined,
        contactEmail: contactEmail.trim() || undefined,
        domains,
        rootEmail: rootEmail.trim(),
        rootPassword: rootPassword.trim() || undefined,

        ssoAdminAccessKey: ssoAdminKey.trim(),
      });

      if (!res.success) {
        const message =
          (res as { message?: string }).message ?? 'Provision failed (unknown reason)';
        setLastError(message);
        notifications.show({ color: 'red', title: 'Provision failed', message });
        return;
      }

      setResult(res);
      notifications.show({
        color: 'green',
        title: 'Client provisioned',
        message: `${res.clientConfig.clientServiceCode} is ready.`,
      });
      onProvisioned();

      try {
        const baseConfig = (importedAppConfig ?? minimalAppConfig) as Record<string, unknown>;
        const baseApp = (baseConfig.app ?? {}) as Record<string, unknown>;
        const baseFeatures = (baseConfig.features ?? {}) as Record<string, unknown>;
        const baseEmployees = (baseFeatures.employees ?? {}) as Record<string, unknown>;
        const features = importedDepartments
          ? {
              ...baseFeatures,
              employees: { ...baseEmployees, departmentOptions: importedDepartments },
            }
          : baseFeatures;
        const configPayload = {
          ...baseConfig,
          version: `1.0.${Date.now().toString(36)}`,
          app: {
            ...baseApp,
            name: trimmedName,
            ...(trimmedDescription ? { description: trimmedDescription } : {}),
          },
          features,
        };
        const cfgRes = await cMngtConnector.setAppConfig({
          clientServiceCode: trimmedCode,

          config: configPayload as unknown as Parameters<
            typeof cMngtConnector.setAppConfig
          >[0]['config'],
        });
        if (cfgRes.success) {
          notifications.show({
            color: 'green',
            message: 'Default config seeded for the new client.',
          });
        } else {
          const message =
            (cfgRes as { message?: string }).message ?? 'setAppConfig returned success: false';
          setConfigWarning(message);
          notifications.show({
            color: 'yellow',
            title: 'Default config not set',
            message: `${message} — set it manually from AppConfigPage.`,
          });
        }
      } catch (cfgErr) {
        const message = cfgErr instanceof Error ? cfgErr.message : String(cfgErr);
        setConfigWarning(message);
        notifications.show({
          color: 'yellow',
          title: 'Default config not set',
          message: `${message} — set it manually from AppConfigPage.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);
      notifications.show({ color: 'red', title: 'Provision error', message });
    } finally {
      setRunning(false);
    }
  }, [
    clientName,
    clientServiceCode,
    closeConfirm,
    contactEmail,
    description,
    domainsText,
    importedAppConfig,
    importedDepartments,
    onProvisioned,
    rootEmail,
    rootPassword,
    ssoAdminKey,
  ]);

  return (
    <Stack gap="lg">
      <Group gap="xs" wrap="nowrap">
        <IconBuildingSkyscraper size={22} style={{ opacity: 0.6 }} />
        <div>
          <Title order={3} lh={1.2}>
            Provision new client
          </Title>
          <Text size="sm" c="dimmed">
            Create a fresh c-mngt client end-to-end via the BFF.
          </Text>
        </div>
      </Group>

      <ImportDropzone
        files={importedFiles}
        onFiles={handleFiles}
        onClear={clearImports}
        hasAppConfig={!!importedAppConfig}
        hasDepartments={!!importedDepartments}
      />

      <SectionCard icon={<IconRocket size={14} />} title="New client" padding="md">
        <Text size="xs" c="dimmed">
          One BFF call to <Code>POST /admin/clients/provision</Code> — creates the SSO service,
          disables public registration, creates the root user, and registers the client.
        </Text>
        <Divider />

        <Stack gap="sm">
          <Group grow align="flex-start">
            <TextInput
              label="Client service code"
              description="Lowercase ID, used as the c-mngt + SSO scope (e.g. acme)"
              placeholder="acme"
              value={clientServiceCode}
              onChange={(e) => setClientServiceCode(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Client name"
              placeholder="ACME Corp"
              value={clientName}
              onChange={(e) => setClientName(e.currentTarget.value)}
              required
            />
          </Group>

          <Group grow align="flex-start">
            <TextInput
              label="Root email"
              description="Email of the first admin user — they own the client"
              placeholder="admin@acme.com"
              value={rootEmail}
              onChange={(e) => setRootEmail(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Root password (optional)"
              description="Auto-generated if blank — saved on the response only"
              placeholder="leave blank to auto-generate"
              value={rootPassword}
              onChange={(e) => setRootPassword(e.currentTarget.value)}
            />
          </Group>

          <TextInput
            label="Domains"
            description="Comma-separated. Used to map domains to this client at runtime."
            placeholder="acme.com, acme.vn"
            value={domainsText}
            onChange={(e) => setDomainsText(e.currentTarget.value)}
            required
          />

          <Group grow align="flex-start">
            <TextInput
              label="Contact email (optional)"
              placeholder="contact@acme.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.currentTarget.value)}
            />
            <TextInput
              label="Description (optional)"
              placeholder="Operations management for ACME"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </Group>

          {clientServiceCode.trim() && (
            <Badge color="gray" variant="light" w="fit-content">
              SSO service: c-mngt-{clientServiceCode.trim()}
            </Badge>
          )}

          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={!canSubmit}
              loading={running}
              leftSection={<IconRocket size={16} />}
            >
              Provision client
            </Button>
          </Group>
        </Stack>

        {lastError && (
          <Alert color="red" variant="light" mt="md">
            {lastError}
          </Alert>
        )}

        {result && <ResultPanel result={result} configWarning={configWarning} />}
      </SectionCard>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleProvision}
        title="Provision client?"
        message={`Create client "${clientServiceCode.trim()}" with root user "${rootEmail.trim()}". This call creates real SSO + c-mngt records — make sure the inputs are correct.`}
        confirmLabel="Provision"
        confirmColor="teal"
        loading={running}
        confirmDisabled={!ssoAdminKey.trim()}
      >
        <SsoAdminKeyField value={ssoAdminKey} onChange={setSsoAdminKey} action="provision" />
      </ConfirmModal>
    </Stack>
  );
}

const KIND_BADGE_COLOR: Record<ImportedFileKind, string> = {
  'base-data': 'blue',
  'app-config': 'teal',
  department: 'cyan',
  unknown: 'gray',
};

function ImportDropzone({
  files,
  onFiles,
  onClear,
  hasAppConfig,
  hasDepartments,
}: {
  files: { name: string; kind: ImportedFileKind; error?: string }[];
  onFiles: (files: File[]) => void;
  onClear: () => void;
  hasAppConfig: boolean;
  hasDepartments: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  const filterJson = (list: FileList | File[] | null): File[] => {
    if (!list) return [];
    return Array.from(list).filter(
      (f) => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json',
    );
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const accepted = filterJson(e.dataTransfer.files);
      if (accepted.length === 0) {
        notifications.show({ color: 'yellow', message: 'Only .json files are accepted.' });
        return;
      }
      onFiles(accepted);
    },
    [onFiles],
  );

  return (
    <SectionCard
      icon={<IconFileImport size={14} />}
      title="Import data"
      padding="md"
      actions={
        files.length > 0 ? (
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            leftSection={<IconX size={12} />}
            onClick={onClear}
          >
            Clear
          </Button>
        ) : undefined
      }
    >
      <Text size="xs" c="dimmed">
        Drop a <Code>base-data.json</Code> to fill the form, an <Code>app-config.json</Code> to seed
        the new client&apos;s initial config (replaces the built-in default), and/or a{' '}
        <Code>department.json</Code> to populate <Code>features.employees.departmentOptions</Code>.
        Multiple files at once are fine.
      </Text>

      <Box
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        p="lg"
        style={{
          border: `2px dashed var(--mantine-color-${dragOver ? 'teal' : 'gray'}-4)`,
          borderRadius: 8,
          background: dragOver ? 'var(--mantine-color-teal-0)' : 'transparent',
          transition: 'background 100ms, border-color 100ms',
          textAlign: 'center',
        }}
      >
        <Stack gap="xs" align="center">
          <IconUpload size={28} style={{ opacity: 0.5 }} />
          <Text size="sm" c="dimmed">
            Drag &amp; drop <Code>.json</Code> file(s) here
          </Text>
          <FileButton
            onChange={(picked) => {
              const accepted = filterJson(
                picked ? (Array.isArray(picked) ? picked : [picked]) : [],
              );
              if (accepted.length > 0) onFiles(accepted);
            }}
            accept="application/json,.json"
            multiple
          >
            {(props) => (
              <Button {...props} size="compact-sm" variant="default">
                or pick file(s)
              </Button>
            )}
          </FileButton>
        </Stack>
      </Box>

      {files.length > 0 && (
        <Stack gap={4} mt="sm">
          {files.map((f, i) => (
            <Group key={`${f.name}-${i}`} gap="xs" wrap="nowrap">
              <Badge size="xs" color={KIND_BADGE_COLOR[f.kind]} variant="light">
                {f.kind}
              </Badge>
              <Text size="xs" style={{ flex: 1, wordBreak: 'break-all' }}>
                {f.name}
              </Text>
              {f.error && (
                <Text size="xs" c="red">
                  {f.error}
                </Text>
              )}
            </Group>
          ))}
          {hasAppConfig && (
            <Text size="xs" c="dimmed" mt={4}>
              <strong>Note:</strong> the imported app-config will replace the built-in default when
              the client is provisioned.
            </Text>
          )}
          {hasDepartments && (
            <Text size="xs" c="dimmed">
              <strong>Note:</strong> imported departments will be merged into{' '}
              <Code>features.employees.departmentOptions</Code> on provision.
            </Text>
          )}
        </Stack>
      )}
    </SectionCard>
  );
}

function ResultPanel({
  result,
  configWarning,
}: {
  result: ProvisionClientResponse;
  configWarning: string | null;
}) {
  const rows: { label: string; value: string; sensitive?: boolean }[] = [
    { label: 'Client service code', value: result.clientConfig.clientServiceCode },
    { label: 'SSO service code', value: result.ssoServiceCode },
    { label: 'Operator access key', value: result.operatorAccessKey, sensitive: true },
    { label: 'Root email', value: result.rootEmail },
    { label: 'Root password', value: result.rootPassword, sensitive: true },
  ];

  return (
    <Card withBorder padding="sm" mt="md" bg="var(--mantine-color-green-0)">
      <Group gap="xs" mb="xs" wrap="nowrap">
        <IconCheck size={18} color="var(--mantine-color-green-7)" />
        <Text size="sm" fw={600}>
          Client provisioned
          {configWarning ? null : ' · default config seeded'}
        </Text>
      </Group>
      <Alert color="orange" variant="light" mb="sm">
        Save the operator access key and root password now — they are NOT retrievable later.
      </Alert>
      {configWarning && (
        <Alert color="yellow" variant="light" mb="sm" title="Default config not set">
          {configWarning} — open AppConfigPage as the new client&apos;s admin and save a config
          there.
        </Alert>
      )}
      <Stack gap={4}>
        {rows.map((row) => (
          <Group key={row.label} gap="xs" wrap="nowrap">
            <Text size="xs" fw={500} w={170} style={{ flexShrink: 0 }}>
              {row.label}:
            </Text>
            <Code style={{ fontSize: 12, wordBreak: 'break-all', flex: 1 }}>{row.value}</Code>
            <CopyButton value={row.value}>
              {({ copied, copy }) => (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color={copied ? 'teal' : 'gray'}
                  onClick={copy}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CopyButton>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

const ssoServiceCodeFor = (clientServiceCode: string) => `c-mngt-${clientServiceCode}`;

function ClientsPanel({
  refreshSignal,
  onMutate,
  onConfigureClient,
}: {
  refreshSignal: number;
  onMutate: () => void;
  onConfigureClient: (clientServiceCode: string) => void;
}) {
  const [clients, setClients] = useState<ClientConfig[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClientConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [ssoAdminKey, setSsoAdminKey] = useState<string>(() => readSecret('ssoAdminAccessKey'));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await cMngtConnector.listClients();
      if (!res.success) {
        const message = (res as { message?: string }).message ?? 'listClients failed';
        throw new Error(message);
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
  }, [load, refreshSignal]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { clientServiceCode, version } = pendingDelete;
    const issues: string[] = [];

    try {
      const res = await cMngtConnector.removeClient({
        clientServiceCode,
        version,
        ssoAdminAccessKey: ssoAdminKey.trim(),
      });
      if (!res.success) {
        issues.push(`c-mngt removeClient: ${(res as { message?: string }).message ?? 'failed'}`);
      }

      if (res.ssoIssues?.length) issues.push(...res.ssoIssues);
    } catch (err) {
      issues.push(`c-mngt removeClient: ${err instanceof Error ? err.message : String(err)}`);
    }

    setDeleting(false);
    setPendingDelete(null);

    if (issues.length === 0) {
      notifications.show({
        color: 'green',
        title: 'Client deleted',
        message: `${clientServiceCode} removed from c-mngt and c-sso.`,
      });
    } else {
      notifications.show({
        color: 'yellow',
        title: 'Partial deletion',
        message: issues.join(' · '),
      });
    }
    onMutate();
  }, [pendingDelete, onMutate, ssoAdminKey]);

  return (
    <Stack gap="lg">
      <Group gap="xs" wrap="nowrap">
        <IconUsers size={22} style={{ opacity: 0.6 }} />
        <div>
          <Title order={3} lh={1.2}>
            Clients
          </Title>
          <Text size="xs" c="dimmed">
            All registered c-mngt clients. Deleting also removes the matching c-sso service.
          </Text>
        </div>
      </Group>

      <SectionCard
        icon={<IconUsers size={14} />}
        title="Registered clients"
        padding="md"
        actions={
          <Tooltip label="Refresh" withArrow>
            <ActionIcon variant="subtle" onClick={() => void load()} loading={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
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
            No clients yet. Use the Provision tab to create one.
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
                          {c.domains.map((d, idx) => {
                            return (
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
                            );
                          })}
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
                          leftSection={<IconAdjustments size={12} />}
                          onClick={() => onConfigureClient(c.clientServiceCode)}
                        >
                          Configure
                        </Button>
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

      <ConfirmModal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete client?"
        message={
          pendingDelete
            ? `This will remove client "${pendingDelete.clientServiceCode}" and all its per-client data from c-mngt, plus the matching c-sso service "${ssoServiceCodeFor(pendingDelete.clientServiceCode)}". Cannot be undone.`
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

function ConfigPanel({
  refreshSignal,
  selectedClient,
  onSelectClient,
}: {
  refreshSignal: number;
  selectedClient: string | null;
  onSelectClient: (clientServiceCode: string | null) => void;
}) {
  const [clients, setClients] = useState<ClientConfig[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cMngtConnector
      .listClients()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setClients(res.clients);
          setListError(null);
        } else {
          setListError((res as { message?: string }).message ?? 'listClients failed');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const selectData = useMemo(
    () =>
      (clients ?? []).map((c) => ({
        value: c.clientServiceCode,
        label: `${c.clientServiceCode} — ${c.clientName}`,
      })),
    [clients],
  );

  const cMngtAdminAccessKey = readSecret('cMngtAdminAccessKey');

  return (
    <Stack gap="lg">
      <Group gap="xs" wrap="nowrap">
        <IconAdjustments size={22} style={{ opacity: 0.6 }} />
        <div>
          <Title order={3} lh={1.2}>
            Configure client
          </Title>
          <Text size="xs" c="dimmed">
            Reuses the structured editor from <Code>AppConfigPage</Code> against the picked client.
            Save here writes to that client&apos;s remote config; it does NOT touch the running
            app&apos;s local cache.
          </Text>
        </div>
      </Group>

      {listError && (
        <Alert color="red" variant="light">
          {listError}
        </Alert>
      )}

      <SectionCard icon={<IconAdjustments size={14} />} title="Pick client" padding="md">
        <Select
          label="Client"
          placeholder={clients ? 'Pick a client' : 'Loading…'}
          data={selectData}
          value={selectedClient}
          onChange={onSelectClient}
          searchable
          clearable
          disabled={!clients}
        />
      </SectionCard>

      {selectedClient && cMngtAdminAccessKey && (
        <ConfigEditor
          key={selectedClient}
          accessKey={cMngtAdminAccessKey}
          clientServiceCode={selectedClient}
        />
      )}
    </Stack>
  );
}

type ConfigIssue = { path: readonly PropertyKey[]; message: string };

type ValidationResult =
  | { status: 'pending' }
  | { status: 'valid' }
  | { status: 'invalid'; issues: readonly ConfigIssue[] }
  | { status: 'error'; message: string };

function ValidatePanel({ refreshSignal }: { refreshSignal: number }) {
  const [clients, setClients] = useState<ClientConfig[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, ValidationResult>>(new Map());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    cMngtConnector
      .listClients()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setClients(res.clients);
          setListError(null);
        } else {
          setListError((res as { message?: string }).message ?? 'listClients failed');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const handleRun = useCallback(async () => {
    if (!clients) return;
    setRunning(true);

    setResults(
      new Map(clients.map((c) => [c.clientServiceCode, { status: 'pending' } as ValidationResult])),
    );

    await Promise.all(
      clients.map(async (client) => {
        let next: ValidationResult;
        try {
          const res = await cMngtConnector.getAppConfigAdmin({
            clientServiceCode: client.clientServiceCode,
          });
          if (!res.success || !res.config) {
            next = {
              status: 'error',
              message: (res as { message?: string }).message ?? 'No config returned',
            };
          } else {
            const parsed = CMngtAppConfigSchema.safeParse(res.config);
            next = parsed.success
              ? { status: 'valid' }
              : { status: 'invalid', issues: parsed.error.issues as readonly ConfigIssue[] };
          }
        } catch (err) {
          next = { status: 'error', message: err instanceof Error ? err.message : String(err) };
        }
        setResults((prev) => {
          const map = new Map(prev);
          map.set(client.clientServiceCode, next);
          return map;
        });
      }),
    );

    setRunning(false);
  }, [clients]);

  const summary = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let errored = 0;
    for (const r of results.values()) {
      if (r.status === 'valid') valid++;
      else if (r.status === 'invalid') invalid++;
      else if (r.status === 'error') errored++;
    }
    return { valid, invalid, errored, total: results.size };
  }, [results]);

  return (
    <Stack gap="lg">
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Group gap="xs" wrap="nowrap">
          <IconClipboardList size={22} style={{ opacity: 0.6 }} />
          <div>
            <Title order={3} lh={1.2}>
              Validate configs
            </Title>
            <Text size="xs" c="dimmed">
              Parses each client&apos;s stored app-config with the current{' '}
              <Code>CMngtAppConfigSchema</Code>. Run this after a schema change to find configs that
              no longer match.
            </Text>
          </div>
        </Group>
        <Button
          leftSection={<IconRefresh size={14} />}
          onClick={handleRun}
          disabled={!clients || clients.length === 0 || running}
          loading={running}
        >
          {summary.total > 0 ? 'Re-run' : 'Validate all'}
        </Button>
      </Group>

      {listError && (
        <Alert color="red" variant="light">
          {listError}
        </Alert>
      )}

      {summary.total > 0 && (
        <Group gap="xs">
          <Badge color="teal" variant="light">
            {summary.valid} valid
          </Badge>
          <Badge color="red" variant="light">
            {summary.invalid} invalid
          </Badge>
          {summary.errored > 0 && (
            <Badge color="yellow" variant="light">
              {summary.errored} errored
            </Badge>
          )}
        </Group>
      )}

      {clients && clients.length === 0 && (
        <Text size="sm" c="dimmed">
          No clients yet — provision one first.
        </Text>
      )}

      {clients && clients.length > 0 && (
        <Table striped withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Client</Table.Th>
              <Table.Th w={120}>Status</Table.Th>
              <Table.Th>Issues</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {clients.map((c) => {
              const result = results.get(c.clientServiceCode);
              return (
                <Table.Tr key={c.clientServiceCode}>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {c.clientName}
                      </Text>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {c.clientServiceCode}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <ValidationStatusBadge result={result} />
                  </Table.Td>
                  <Table.Td>
                    <ValidationIssuesCell result={result} />
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

function ValidationStatusBadge({ result }: { result: ValidationResult | undefined }) {
  if (!result)
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  if (result.status === 'pending')
    return (
      <Badge color="gray" variant="light">
        Checking…
      </Badge>
    );
  if (result.status === 'valid')
    return (
      <Badge color="teal" variant="light">
        Valid
      </Badge>
    );
  if (result.status === 'invalid')
    return (
      <Badge color="red" variant="light">
        Invalid
      </Badge>
    );
  return (
    <Badge color="yellow" variant="light">
      Error
    </Badge>
  );
}

function ValidationIssuesCell({ result }: { result: ValidationResult | undefined }) {
  if (!result || result.status === 'pending' || result.status === 'valid') {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }
  if (result.status === 'error') {
    return (
      <Text size="xs" c="orange">
        {result.message}
      </Text>
    );
  }

  const shown = result.issues.slice(0, 20);
  const hidden = result.issues.length - shown.length;
  return (
    <Stack gap={2}>
      {shown.map((issue, idx) => (
        <Text key={idx} size="xs" ff="monospace">
          <Text component="span" c="dimmed">
            {issue.path.length === 0 ? '<root>' : issue.path.map(String).join('.')}:{' '}
          </Text>
          <Text component="span" c="red">
            {issue.message}
          </Text>
        </Text>
      ))}
      {hidden > 0 && (
        <Text size="xs" c="dimmed">
          …and {hidden} more
        </Text>
      )}
    </Stack>
  );
}
