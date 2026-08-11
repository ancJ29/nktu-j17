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
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustments,
  IconBuildingSkyscraper,
  IconCategory2,
  IconCheck,
  IconClipboardList,
  IconDatabase,
  IconDownload,
  IconFileImport,
  IconKey,
  IconLogout,
  IconPackage,
  IconRefresh,
  IconRocket,
  IconShieldLock,
  IconShoppingCart,
  IconTrash,
  IconTruck,
  IconUpload,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SectionCard } from '@/components/SectionCard';
import { appConfig, themeConfig } from '@/config';
import { minimalAppConfig } from '@/config/minimal-config';
import { CMngtAppConfigSchema } from '@/config/schema';
import { ConfigEditor } from '@/pages/config/AppConfigPage';
import { FakeDataSecretsModal } from '@/pages/fake-data/FakeDataSecretsModal';
import { getFakeDataSecrets, hasAllFakeDataSecrets } from '@/pages/fake-data/fakeDataSecrets';
import {
  seedFakeEmployees,
  type ManualEmployeeInput,
  type SeedEmployeesResult,
} from '@/pages/fake-data/seedFakeEmployees';
import {
  ManualProductUnitError,
  seedFakeProducts,
  type ManualProductInput,
  type SeedProductsResult,
} from '@/pages/fake-data/seedFakeProducts';
import {
  seedFakeVendors,
  type ManualVendorInput,
  type SeedVendorsResult,
} from '@/pages/fake-data/seedFakeVendors';
import {
  seedFakeCustomers,
  type ManualCustomerInput,
  type SeedCustomersResult,
} from '@/pages/fake-data/seedFakeCustomers';
import {
  seedFakeLookups,
  type ManualLookupInput,
  type SeedLookupsResult,
} from '@/pages/fake-data/seedFakeLookups';
import {
  buildCustomerSamples,
  buildEmployeeSamples,
  buildLookupSamples,
  buildProductSamples,
  buildVendorSamples,
  downloadJson,
} from '@/pages/fake-data/seedSamples';
import { cMngtConnector, cSsoConnector } from '@credo/connectors/connector';
import type { CMngtProvisionClientResponse as ProvisionClientResponse } from '@credo/connectors/types';
import type { CMngtAppConfig } from '@credo/kits/types';
import { PRODUCT_SET_COLOR } from '@/config/misc';
import { isInternal } from '@/config/env';

type ClientConfig = Awaited<ReturnType<typeof cMngtConnector.listClients>>['clients'][number];

const STORAGE_KEYS = {
  cMngtAdminAccessKey: '__c_mngt_admin_key__',
  ssoAdminAccessKey: '__gen_client_sso_admin_key__',
} as const;

type SecretField = keyof typeof STORAGE_KEYS;

const SECRET_FIELDS: SecretField[] = ['cMngtAdminAccessKey', 'ssoAdminAccessKey'];

const SECRET_LABELS: Record<SecretField, string> = {
  cMngtAdminAccessKey: 'C_MNGT_ADMIN_ACCESS_KEY',
  ssoAdminAccessKey: 'CREDO_SSO_ADMIN_ACCESS_KEY',
};

type Secrets = Record<SecretField, string>;

function readSecret(field: SecretField): string {
  try {
    if (isInternal) {
      let value = localStorage.getItem(STORAGE_KEYS[field]) ?? '';
      if (value) return value;
    }
    return sessionStorage.getItem(STORAGE_KEYS[field]) ?? '';
  } catch {
    return '';
  }
}

function readAllSecrets(): Secrets {
  return {
    cMngtAdminAccessKey: readSecret('cMngtAdminAccessKey'),
    ssoAdminAccessKey: readSecret('ssoAdminAccessKey'),
  };
}

function writeSecrets(secrets: Secrets) {
  for (const field of SECRET_FIELDS) {
    const key = STORAGE_KEYS[field];
    const value = secrets[field].trim();
    if (value) {
      sessionStorage.setItem(key, value);
      if (isInternal) localStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  }
}

function clearSecrets() {
  for (const field of SECRET_FIELDS) {
    const key = STORAGE_KEYS[field];
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}

function hasAllSecrets(): boolean {
  return SECRET_FIELDS.every((f) => readSecret(f).trim().length > 0);
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
  const [authed, setAuthed] = useState<boolean>(hasAllSecrets);

  useEffect(() => {
    if (authed) {
      cMngtConnector.setAccessKey(readSecret('cMngtAdminAccessKey'));
      cSsoConnector.setAccessKey(readSecret('ssoAdminAccessKey'));
    }
  }, [authed]);

  const handleAuthed = useCallback((secrets: Secrets) => {
    writeSecrets(secrets);
    cMngtConnector.setAccessKey(secrets.cMngtAdminAccessKey.trim());
    cSsoConnector.setAccessKey(secrets.ssoAdminAccessKey.trim());
    setAuthed(true);
  }, []);

  const handleSignOut = useCallback(() => {
    clearSecrets();
    cMngtConnector.setAccessKey('');
    cSsoConnector.setAccessKey('');
    setAuthed(false);
    notifications.show({ color: 'gray', message: 'Signed out — keys cleared.' });
  }, []);

  return (
    <BrandedShell authed={authed} onSignOut={handleSignOut}>
      {authed ? <AdminTabs /> : <AuthGate onAuthed={handleAuthed} />}
    </BrandedShell>
  );
}

type TabValue = 'provision' | 'clients' | 'app-config' | 'seed-data' | 'validate';

const TAB_VALUES: readonly TabValue[] = [
  'provision',
  'clients',
  'app-config',
  'seed-data',
  'validate',
];

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
        <Tabs.Tab value="seed-data" leftSection={<IconDatabase size={14} />}>
          Seed data
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

      <Tabs.Panel value="seed-data" pt="lg">
        <SeedDataPanel
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
  const appName = appConfig.app.name;

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
              <Text fw={700} size="lg">
                {appName}
              </Text>
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

function AuthGate({ onAuthed }: { onAuthed: (secrets: Secrets) => void }) {
  const [secrets, setSecrets] = useState<Secrets>(readAllSecrets);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !validating && SECRET_FIELDS.every((f) => secrets[f].trim().length > 0);

  const handleChange = (field: SecretField, value: string) => {
    setSecrets((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setValidating(true);
    setError(null);

    const trimmed: Secrets = {
      cMngtAdminAccessKey: secrets.cMngtAdminAccessKey.trim(),
      ssoAdminAccessKey: secrets.ssoAdminAccessKey.trim(),
    };

    cMngtConnector.setAccessKey(trimmed.cMngtAdminAccessKey);
    try {
      const res = await cMngtConnector.listClients();
      if (!res.success) {
        const message = (res as { message?: string }).message ?? 'Invalid admin key';
        throw new Error(message);
      }
      onAuthed(trimmed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Validation failed. Check the keys and try again.';
      setError(message);
      cMngtConnector.setAccessKey('');
    } finally {
      setValidating(false);
    }
  }, [canSubmit, secrets, onAuthed]);

  return (
    <Stack gap="lg" align="center" mt="xl">
      <Group gap="xs" wrap="nowrap">
        <IconShieldLock size={22} style={{ opacity: 0.6 }} />
        <div>
          <Title order={3} lh={1.2}>
            Admin authentication
          </Title>
          <Text size="sm" c="dimmed">
            Enter the C-Mngt and SSO admin access keys to continue. Keys are kept in sessionStorage
            and wiped on tab close.
          </Text>
        </div>
      </Group>

      <Card withBorder padding="lg" w="100%" maw={520}>
        <Stack gap="sm">
          {SECRET_FIELDS.map((field, idx) => (
            <PasswordInput
              key={field}
              label={SECRET_LABELS[field]}
              value={secrets[field]}
              onChange={(e) => handleChange(field, e.currentTarget.value)}
              autoComplete="off"
              spellCheck={false}
              autoFocus={idx === 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) handleSubmit();
              }}
            />
          ))}

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

        ssoAdminAccessKey: readSecret('ssoAdminAccessKey'),
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
      />
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
    const ssoServiceCode = ssoServiceCodeFor(clientServiceCode);
    const issues: string[] = [];

    try {
      const res = await cMngtConnector.removeClient({ clientServiceCode, version });
      if (!res.success) {
        issues.push(`c-mngt removeClient: ${(res as { message?: string }).message ?? 'failed'}`);
      }
    } catch (err) {
      issues.push(`c-mngt removeClient: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const res = await cSsoConnector.disableService({ serviceCode: ssoServiceCode });
      if (!res.success) {
        const reason = (res as { error?: string }).error ?? 'failed';

        console.info(`[deleteClient] disableService(${ssoServiceCode}): ${reason}`);
      }
    } catch (err) {
      console.info(
        `[deleteClient] disableService(${ssoServiceCode}) threw:`,
        err instanceof Error ? err.message : err,
      );
    }

    try {
      const res = await cSsoConnector.deleteService({ serviceCode: ssoServiceCode });
      if (!res.success) {
        issues.push(`c-sso deleteService: ${(res as { error?: string }).error ?? 'failed'}`);
      }
    } catch (err) {
      issues.push(`c-sso deleteService: ${err instanceof Error ? err.message : String(err)}`);
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
  }, [pendingDelete, onMutate]);

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
      />
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

function SeedDataPanel({
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

  const [secretsOpen, { open: openSecrets, close: closeSecrets }] = useDisclosure(false);
  const [secretsReady, setSecretsReady] = useState<boolean>(hasAllFakeDataSecrets);

  const [clientConfig, setClientConfig] = useState<CMngtAppConfig | null>(null);

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

  useEffect(() => {
    if (!selectedClient) {
      setClientConfig(null);
      return;
    }
    let cancelled = false;
    cMngtConnector
      .getAppConfigAdmin({ clientServiceCode: selectedClient })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.config) {
          const parsed = CMngtAppConfigSchema.safeParse(res.config);
          setClientConfig((parsed.success ? parsed.data : res.config) as CMngtAppConfig);
        } else {
          setClientConfig(null);
        }
      })
      .catch(() => {
        if (!cancelled) setClientConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClient, refreshSignal]);

  const selectData = useMemo(
    () =>
      (clients ?? []).map((c) => ({
        value: c.clientServiceCode,
        label: `${c.clientServiceCode} — ${c.clientName}`,
      })),
    [clients],
  );

  return (
    <Stack gap="lg">
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Group gap="xs" wrap="nowrap">
          <IconDatabase size={22} style={{ opacity: 0.6 }} />
          <div>
            <Title order={3} lh={1.2}>
              Seed data
            </Title>
            <Text size="xs" c="dimmed">
              Write entity data (employees, products, …) directly to c-storage for the picked client
              (bypasses the BFF). Same pipeline as the in-app fake-data page.
            </Text>
          </div>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Badge color={secretsReady ? 'teal' : 'red'} variant="light">
            {secretsReady ? 'storage keys ready' : 'storage keys missing'}
          </Badge>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconKey size={14} />}
            onClick={openSecrets}
          >
            Configure storage keys
          </Button>
        </Group>
      </Group>

      {listError && (
        <Alert color="red" variant="light">
          {listError}
        </Alert>
      )}

      {!secretsReady && (
        <Alert color="yellow" variant="light" title="Storage credentials required">
          Direct c-storage writes need <Code>CREDO_TRUSTED_SERVICE_KEY</Code>,{' '}
          <Code>CREDO_STORAGE_ACCESS_KEY</Code>, and <Code>CREDO_STORAGE_INTERNAL_ACCESS_KEY</Code>.
          Click <strong>Configure storage keys</strong> to add them — they live in sessionStorage
          only.
        </Alert>
      )}

      <SectionCard icon={<IconUsers size={14} />} title="Pick client" padding="md">
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

      {(() => {
        const features = clientConfig?.features;

        const sections = [
          {
            label: 'Employees',
            enabled: features?.employees?.enabled !== false,
            node: (
              <EmployeesSection
                key="employees"
                clientCode={selectedClient}
                secretsReady={secretsReady}
                clientConfig={clientConfig}
              />
            ),
          },
          {
            label: 'Lookups',
            enabled: features?.lookups?.enabled !== false,
            node: (
              <LookupsSection
                key="lookups"
                clientCode={selectedClient}
                secretsReady={secretsReady}
                clientConfig={clientConfig}
              />
            ),
          },
          {
            label: 'Products',
            enabled: features?.products?.enabled !== false,
            node: (
              <ProductsSection
                key="products"
                clientCode={selectedClient}
                secretsReady={secretsReady}
                clientConfig={clientConfig}
              />
            ),
          },
          {
            label: 'Vendors',
            enabled: features?.vendors?.enabled !== false,
            node: (
              <VendorsSection
                key="vendors"
                clientCode={selectedClient}
                secretsReady={secretsReady}
                clientConfig={clientConfig}
              />
            ),
          },
          {
            label: 'Customers',
            enabled: features?.customers?.enabled !== false,
            node: (
              <CustomersSection
                key="customers"
                clientCode={selectedClient}
                secretsReady={secretsReady}
                clientConfig={clientConfig}
              />
            ),
          },
        ];
        const hidden = sections.filter((s) => !s.enabled).map((s) => s.label);
        return (
          <>
            {clientConfig && hidden.length > 0 && (
              <Text size="xs" c="dimmed">
                Hidden (module disabled for this client): {hidden.join(', ')}
              </Text>
            )}
            {sections.filter((s) => s.enabled).map((s) => s.node)}
          </>
        );
      })()}

      <FakeDataSecretsModal
        opened={secretsOpen}
        onClose={closeSecrets}
        onSaved={() => {
          setSecretsReady(hasAllFakeDataSecrets());
          closeSecrets();
        }}
      />
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

function EmployeesSection({
  clientCode,
  secretsReady,
  clientConfig,
}: {
  clientCode: string | null;
  secretsReady: boolean;
  clientConfig: CMngtAppConfig | null;
}) {
  const [items, setItems] = useState<ManualEmployeeInput[] | null>(null);
  const [importedFile, setImportedFile] = useState<{ name: string; count: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [skipSso, setSkipSso] = useState(false);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<SeedEmployeesResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of employee rows.');
      setItems(parsed as ManualEmployeeInput[]);
      setImportedFile({ name: file.name, count: parsed.length });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setItems(null);
      setImportedFile(null);
    }
  }, []);

  const clearImport = useCallback(() => {
    setItems(null);
    setImportedFile(null);
    setParseError(null);
  }, []);

  const canSeed = !running && !!clientCode && !!items && items.length > 0 && secretsReady;

  const handleSeed = useCallback(async () => {
    if (!canSeed || !clientCode || !items) return;
    closeConfirm();
    setRunning(true);
    setLogLines([]);
    setResult(null);
    setSeedError(null);
    try {
      const res = await seedFakeEmployees({
        clientCode,
        count: items.length,
        skipSso,
        secrets: getFakeDataSecrets(),
        items,
        onLog: (line) => setLogLines((prev) => [...prev, line]),
      });
      setResult(res);
      notifications.show({
        color: 'green',
        title: 'Employees seeded',
        message: `${res.generated} written · SSO created=${res.ssoCreated} failed=${res.ssoFailed}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedError(msg);
      notifications.show({ color: 'red', title: 'Seed failed', message: msg });
    } finally {
      setRunning(false);
    }
  }, [canSeed, clientCode, closeConfirm, items, skipSso]);

  return (
    <SectionCard
      icon={<IconUsers size={14} />}
      title="Employees"
      padding="md"
      actions={
        <Group gap={4} wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconDownload size={12} />}
            onClick={() => downloadJson('employee.sample.json', buildEmployeeSamples(clientConfig))}
          >
            Sample
          </Button>
          {importedFile && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<IconX size={12} />}
              onClick={clearImport}
            >
              Clear
            </Button>
          )}
        </Group>
      }
    >
      <Text size="xs" c="dimmed">
        Drop a JSON array of{' '}
        <Code>{`{ lastName, firstName, department, phone, personalPhone }`}</Code> (matches{' '}
        <Code>data/{'{client}'}/employee.json</Code>). Codes auto-generated from the client&apos;s
        app config.
      </Text>

      <SeedJsonDropzone onFiles={handleFiles} hint="employee.json" />

      {parseError && (
        <Alert color="red" variant="light">
          {parseError}
        </Alert>
      )}

      {importedFile && items && items.length > 0 && (
        <Stack gap={4}>
          <Group gap="xs">
            <Badge size="xs" color="blue" variant="light">
              {items.length} row(s)
            </Badge>
            <Text size="xs">{importedFile.name}</Text>
          </Group>
          <Table.ScrollContainer minWidth={400}>
            <Table verticalSpacing={4} fz="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Last name</Table.Th>
                  <Table.Th>First name</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Phone</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.slice(0, 8).map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{row.lastName ?? '—'}</Table.Td>
                    <Table.Td>{row.firstName ?? '—'}</Table.Td>
                    <Table.Td>{row.department ?? '—'}</Table.Td>
                    <Table.Td>{row.phone ?? '—'}</Table.Td>
                  </Table.Tr>
                ))}
                {items.length > 8 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="xs" c="dimmed">
                        … and {items.length - 8} more
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}

      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text fw={600} size="sm">
            Skip SSO user creation
          </Text>
          <Text size="xs" c="dimmed">
            Write only the employee records — don&apos;t create login users in c-sso.
          </Text>
        </div>
        <Button
          size="compact-sm"
          variant={skipSso ? 'filled' : 'default'}
          color={skipSso ? 'orange' : 'gray'}
          onClick={() => setSkipSso((v) => !v)}
        >
          {skipSso ? 'On' : 'Off'}
        </Button>
      </Group>

      <Group justify="flex-end">
        <Button
          leftSection={<IconRocket size={16} />}
          onClick={openConfirm}
          disabled={!canSeed}
          loading={running}
        >
          Seed {items ? items.length : 0} employee(s)
        </Button>
      </Group>

      <SeedProgress
        running={running}
        logLines={logLines}
        seedError={seedError}
        successAlert={
          result && (
            <>
              Done — wrote {result.generated} employee(s). SSO created={result.ssoCreated}, failed=
              {result.ssoFailed}.
              {result.ssoFailures.length > 0 && (
                <Stack gap={2} mt={4}>
                  {result.ssoFailures.slice(0, 5).map((f, i) => (
                    <Text key={i} size="xs" c="red">
                      {f.email}: {f.error}
                    </Text>
                  ))}
                </Stack>
              )}
            </>
          )
        }
      />

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleSeed}
        title="Seed employees?"
        message={
          clientCode && items
            ? `This will OVERWRITE the employees envelope for "${clientCode}" with ${items.length} record(s) and create matching SSO users (unless skipped). Existing employee SSO accounts under this client will be deleted first.`
            : ''
        }
        confirmLabel="Seed"
        confirmColor="teal"
        loading={running}
      />
    </SectionCard>
  );
}

function ProductsSection({
  clientCode,
  secretsReady,
  clientConfig,
}: {
  clientCode: string | null;
  secretsReady: boolean;
  clientConfig: CMngtAppConfig | null;
}) {
  const [items, setItems] = useState<ManualProductInput[] | null>(null);
  const [importedFile, setImportedFile] = useState<{ name: string; count: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<SeedProductsResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of product rows.');
      setItems(parsed as ManualProductInput[]);
      setImportedFile({ name: file.name, count: parsed.length });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setItems(null);
      setImportedFile(null);
    }
  }, []);

  const clearImport = useCallback(() => {
    setItems(null);
    setImportedFile(null);
    setParseError(null);
  }, []);

  const canSeed = !running && !!clientCode && !!items && items.length > 0 && secretsReady;

  const handleSeed = useCallback(async () => {
    if (!canSeed || !clientCode || !items) return;
    closeConfirm();
    setRunning(true);
    setLogLines([]);
    setResult(null);
    setSeedError(null);
    try {
      const res = await seedFakeProducts({
        clientCode,

        industry: 'food',
        count: items.length,
        secrets: getFakeDataSecrets(),
        items,
        onLog: (line) => setLogLines((prev) => [...prev, line]),
      });
      setResult(res);
      notifications.show({
        color: 'green',
        title: 'Products seeded',
        message: `${res.generated} written.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedError(msg);

      notifications.show({
        color: 'red',
        title: 'Seed failed',
        message:
          err instanceof ManualProductUnitError
            ? `${err.lines.length} row(s) carry an unrecognized unit — see the progress log. Nothing was written.`
            : msg,
      });
    } finally {
      setRunning(false);
    }
  }, [canSeed, clientCode, closeConfirm, items]);

  return (
    <SectionCard
      icon={<IconPackage size={14} />}
      title="Products"
      padding="md"
      actions={
        <Group gap={4} wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconDownload size={12} />}
            onClick={() => downloadJson('products.sample.json', buildProductSamples(clientConfig))}
          >
            Sample
          </Button>
          {importedFile && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<IconX size={12} />}
              onClick={clearImport}
            >
              Clear
            </Button>
          )}
        </Group>
      }
    >
      <Text size="xs" c="dimmed">
        Drop a JSON array of{' '}
        <Code>{`{ name, code, unit, extra: { units, sku, category, minimumInventory, setItems, ... } }`}</Code>{' '}
        (matches <Code>data/{'{client}'}/products.json</Code>; legacy flat fields like{' '}
        <Code>units</Code> / <Code>minStock</Code> are still accepted). Codes are taken from the
        input as-is.
      </Text>

      <SeedJsonDropzone onFiles={handleFiles} hint="products.json" />

      {parseError && (
        <Alert color="red" variant="light">
          {parseError}
        </Alert>
      )}

      {importedFile && items && items.length > 0 && (
        <Stack gap={4}>
          <Group gap="xs">
            <Badge size="xs" color="blue" variant="light">
              {items.length} row(s)
            </Badge>
            <Text size="xs">{importedFile.name}</Text>
          </Group>
          <Table.ScrollContainer minWidth={400}>
            <Table verticalSpacing={4} fz="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Units</Table.Th>
                  <Table.Th>Conversions</Table.Th>
                  <Table.Th>Min stock</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.slice(0, 8).map((row, i) => {
                  const units = row.extra?.units ?? row.units;
                  const conversions = row.extra?.unitConversions ?? row.unitConversions;
                  const minInv = row.extra?.minimumInventory?.value;
                  const minStock = typeof minInv === 'number' ? minInv : row.minStock;
                  const setItemCount = row.extra?.setItems?.length ?? 0;
                  return (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Code>{row.code ?? '—'}</Code>
                      </Table.Td>
                      <Table.Td>
                        {row.name ?? '—'}
                        {setItemCount > 0 && (
                          <Badge size="xs" color={PRODUCT_SET_COLOR} variant="light" ml={6}>
                            Set ({setItemCount})
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>{units?.join(', ') ?? '—'}</Table.Td>
                      <Table.Td>
                        {conversions
                          ?.map((c) => `1 ${c.unit} = ${c.quantity} ${c.baseUnit}`)
                          .join('; ') ?? '—'}
                      </Table.Td>
                      <Table.Td>{typeof minStock === 'number' ? minStock : '—'}</Table.Td>
                    </Table.Tr>
                  );
                })}
                {items.length > 8 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text size="xs" c="dimmed">
                        … and {items.length - 8} more
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}

      <Group justify="flex-end">
        <Button
          leftSection={<IconRocket size={16} />}
          onClick={openConfirm}
          disabled={!canSeed}
          loading={running}
        >
          Seed {items ? items.length : 0} product(s)
        </Button>
      </Group>

      <SeedProgress
        running={running}
        logLines={logLines}
        seedError={seedError}
        successAlert={result && <>Done — wrote {result.generated} product(s).</>}
      />

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleSeed}
        title="Seed products?"
        message={
          clientCode && items
            ? `This will OVERWRITE the products envelope for "${clientCode}" with ${items.length} record(s).`
            : ''
        }
        confirmLabel="Seed"
        confirmColor="teal"
        loading={running}
      />
    </SectionCard>
  );
}

function VendorsSection({
  clientCode,
  secretsReady,
  clientConfig,
}: {
  clientCode: string | null;
  secretsReady: boolean;
  clientConfig: CMngtAppConfig | null;
}) {
  const [items, setItems] = useState<ManualVendorInput[] | null>(null);
  const [importedFile, setImportedFile] = useState<{ name: string; count: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<SeedVendorsResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of vendor rows.');
      setItems(parsed as ManualVendorInput[]);
      setImportedFile({ name: file.name, count: parsed.length });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setItems(null);
      setImportedFile(null);
    }
  }, []);

  const clearImport = useCallback(() => {
    setItems(null);
    setImportedFile(null);
    setParseError(null);
  }, []);

  const canSeed = !running && !!clientCode && !!items && items.length > 0 && secretsReady;

  const handleSeed = useCallback(async () => {
    if (!canSeed || !clientCode || !items) return;
    closeConfirm();
    setRunning(true);
    setLogLines([]);
    setResult(null);
    setSeedError(null);
    try {
      const res = await seedFakeVendors({
        clientCode,
        industry: 'food',
        count: items.length,
        secrets: getFakeDataSecrets(),
        items,
        onLog: (line) => setLogLines((prev) => [...prev, line]),
      });
      setResult(res);
      notifications.show({
        color: 'green',
        title: 'Vendors seeded',
        message: `${res.generated} written.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedError(msg);
      notifications.show({ color: 'red', title: 'Seed failed', message: msg });
    } finally {
      setRunning(false);
    }
  }, [canSeed, clientCode, closeConfirm, items]);

  return (
    <SectionCard
      icon={<IconTruck size={14} />}
      title="Vendors"
      padding="md"
      actions={
        <Group gap={4} wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconDownload size={12} />}
            onClick={() => downloadJson('vendors.sample.json', buildVendorSamples(clientConfig))}
          >
            Sample
          </Button>
          {importedFile && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<IconX size={12} />}
              onClick={clearImport}
            >
              Clear
            </Button>
          )}
        </Group>
      }
    >
      <Text size="xs" c="dimmed">
        Drop a JSON array — only <Code>name</Code> is required (e.g.{' '}
        <Code>{`[{ "name": "ACME" }]`}</Code>, matches <Code>data/{'{client}'}/vendors.json</Code>).
        When <Code>code</Code> is omitted it's auto-generated from the client's vendor
        codePrefix/codePadLength config; other fields fall back to empty strings.
      </Text>

      <SeedJsonDropzone onFiles={handleFiles} hint="vendors.json" />

      {parseError && (
        <Alert color="red" variant="light">
          {parseError}
        </Alert>
      )}

      {importedFile && items && items.length > 0 && (
        <Stack gap={4}>
          <Group gap="xs">
            <Badge size="xs" color="blue" variant="light">
              {items.length} row(s)
            </Badge>
            <Text size="xs">{importedFile.name}</Text>
          </Group>
          <Table.ScrollContainer minWidth={400}>
            <Table verticalSpacing={4} fz="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Address</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.slice(0, 8).map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Code>{row.code?.trim() || 'auto'}</Code>
                    </Table.Td>
                    <Table.Td>{row.name ?? '—'}</Table.Td>
                    <Table.Td>{row.phone ?? '—'}</Table.Td>
                    <Table.Td>{row.address ?? '—'}</Table.Td>
                  </Table.Tr>
                ))}
                {items.length > 8 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="xs" c="dimmed">
                        … and {items.length - 8} more
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}

      <Group justify="flex-end">
        <Button
          leftSection={<IconRocket size={16} />}
          onClick={openConfirm}
          disabled={!canSeed}
          loading={running}
        >
          Seed {items ? items.length : 0} vendor(s)
        </Button>
      </Group>

      <SeedProgress
        running={running}
        logLines={logLines}
        seedError={seedError}
        successAlert={result && <>Done — wrote {result.generated} vendor(s).</>}
      />

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleSeed}
        title="Seed vendors?"
        message={
          clientCode && items
            ? `This will OVERWRITE the vendors envelope for "${clientCode}" with ${items.length} record(s).`
            : ''
        }
        confirmLabel="Seed"
        confirmColor="teal"
        loading={running}
      />
    </SectionCard>
  );
}

function CustomersSection({
  clientCode,
  secretsReady,
  clientConfig,
}: {
  clientCode: string | null;
  secretsReady: boolean;
  clientConfig: CMngtAppConfig | null;
}) {
  const [items, setItems] = useState<ManualCustomerInput[] | null>(null);
  const [importedFile, setImportedFile] = useState<{ name: string; count: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<SeedCustomersResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of customer rows.');
      setItems(parsed as ManualCustomerInput[]);
      setImportedFile({ name: file.name, count: parsed.length });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setItems(null);
      setImportedFile(null);
    }
  }, []);

  const clearImport = useCallback(() => {
    setItems(null);
    setImportedFile(null);
    setParseError(null);
  }, []);

  const canSeed = !running && !!clientCode && !!items && items.length > 0 && secretsReady;

  const handleSeed = useCallback(async () => {
    if (!canSeed || !clientCode || !items) return;
    closeConfirm();
    setRunning(true);
    setLogLines([]);
    setResult(null);
    setSeedError(null);
    try {
      const res = await seedFakeCustomers({
        clientCode,
        industry: 'food',
        count: items.length,
        secrets: getFakeDataSecrets(),
        items,
        onLog: (line) => setLogLines((prev) => [...prev, line]),
      });
      setResult(res);
      notifications.show({
        color: 'green',
        title: 'Customers seeded',
        message: `${res.generated} written.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedError(msg);
      notifications.show({ color: 'red', title: 'Seed failed', message: msg });
    } finally {
      setRunning(false);
    }
  }, [canSeed, clientCode, closeConfirm, items]);

  return (
    <SectionCard
      icon={<IconShoppingCart size={14} />}
      title="Customers"
      padding="md"
      actions={
        <Group gap={4} wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconDownload size={12} />}
            onClick={() =>
              downloadJson('customers.sample.json', buildCustomerSamples(clientConfig))
            }
          >
            Sample
          </Button>
          {importedFile && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<IconX size={12} />}
              onClick={clearImport}
            >
              Clear
            </Button>
          )}
        </Group>
      }
    >
      <Text size="xs" c="dimmed">
        Drop a JSON array — only <Code>name</Code> is required (e.g.{' '}
        <Code>{`[{ "name": "ACME" }]`}</Code>, matches <Code>data/{'{client}'}/customers.json</Code>
        ). When <Code>code</Code> is omitted it's auto-generated from the client's customer
        codePrefix/codePadLength config; other fields fall back to empty strings.
      </Text>

      <SeedJsonDropzone onFiles={handleFiles} hint="customers.json" />

      {parseError && (
        <Alert color="red" variant="light">
          {parseError}
        </Alert>
      )}

      {importedFile && items && items.length > 0 && (
        <Stack gap={4}>
          <Group gap="xs">
            <Badge size="xs" color="blue" variant="light">
              {items.length} row(s)
            </Badge>
            <Text size="xs">{importedFile.name}</Text>
          </Group>
          <Table.ScrollContainer minWidth={400}>
            <Table verticalSpacing={4} fz="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Address</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.slice(0, 8).map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Code>{row.code?.trim() || 'auto'}</Code>
                    </Table.Td>
                    <Table.Td>{row.name ?? '—'}</Table.Td>
                    <Table.Td>{row.phone ?? '—'}</Table.Td>
                    <Table.Td>{row.address ?? '—'}</Table.Td>
                  </Table.Tr>
                ))}
                {items.length > 8 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="xs" c="dimmed">
                        … and {items.length - 8} more
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}

      <Group justify="flex-end">
        <Button
          leftSection={<IconRocket size={16} />}
          onClick={openConfirm}
          disabled={!canSeed}
          loading={running}
        >
          Seed {items ? items.length : 0} customer(s)
        </Button>
      </Group>

      <SeedProgress
        running={running}
        logLines={logLines}
        seedError={seedError}
        successAlert={result && <>Done — wrote {result.generated} customer(s).</>}
      />

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleSeed}
        title="Seed customers?"
        message={
          clientCode && items
            ? `This will OVERWRITE the customers envelope for "${clientCode}" with ${items.length} record(s).`
            : ''
        }
        confirmLabel="Seed"
        confirmColor="teal"
        loading={running}
      />
    </SectionCard>
  );
}

function LookupsSection({
  clientCode,
  secretsReady,
  clientConfig,
}: {
  clientCode: string | null;
  secretsReady: boolean;
  clientConfig: CMngtAppConfig | null;
}) {
  const [items, setItems] = useState<ManualLookupInput[] | null>(null);
  const [importedFile, setImportedFile] = useState<{ name: string; count: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<SeedLookupsResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of lookup rows.');
      setItems(parsed as ManualLookupInput[]);
      setImportedFile({ name: file.name, count: parsed.length });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setItems(null);
      setImportedFile(null);
    }
  }, []);

  const clearImport = useCallback(() => {
    setItems(null);
    setImportedFile(null);
    setParseError(null);
  }, []);

  const canSeed = !running && !!clientCode && !!items && items.length > 0 && secretsReady;

  const handleSeed = useCallback(async () => {
    if (!canSeed || !clientCode || !items) return;
    closeConfirm();
    setRunning(true);
    setLogLines([]);
    setResult(null);
    setSeedError(null);
    try {
      const res = await seedFakeLookups({
        clientCode,
        industry: 'food',
        secrets: getFakeDataSecrets(),
        items,
        onLog: (line) => setLogLines((prev) => [...prev, line]),
      });
      setResult(res);
      const tally = Object.entries(res.byCategory)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      notifications.show({
        color: 'green',
        title: 'Lookups seeded',
        message: `${res.generated} written · ${tally}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedError(msg);
      notifications.show({ color: 'red', title: 'Seed failed', message: msg });
    } finally {
      setRunning(false);
    }
  }, [canSeed, clientCode, closeConfirm, items]);

  const byCategory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const it of items ?? []) out[it.category] = (out[it.category] ?? 0) + 1;
    return out;
  }, [items]);

  return (
    <SectionCard
      icon={<IconCategory2 size={14} />}
      title="Lookups (meta-data)"
      padding="md"
      actions={
        <Group gap={4} wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconDownload size={12} />}
            onClick={() => downloadJson('lookups.sample.json', buildLookupSamples(clientConfig))}
          >
            Sample
          </Button>
          {importedFile && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              leftSection={<IconX size={12} />}
              onClick={clearImport}
            >
              Clear
            </Button>
          )}
        </Group>
      }
    >
      <Text size="xs" c="dimmed">
        Drop a JSON array of <Code>{`{ category, value, label }`}</Code> (matches{' '}
        <Code>data/{'{client}'}/lookups.json</Code>). Common categories:{' '}
        <Code>product-category</Code>, <Code>material-category</Code>, <Code>unit</Code>,{' '}
        <Code>product-tag</Code>. Values are uppercased on write.
      </Text>

      <SeedJsonDropzone onFiles={handleFiles} hint="lookups.json" />

      {parseError && (
        <Alert color="red" variant="light">
          {parseError}
        </Alert>
      )}

      {importedFile && items && items.length > 0 && (
        <Stack gap={4}>
          <Group gap="xs" wrap="wrap">
            <Badge size="xs" color="blue" variant="light">
              {items.length} row(s)
            </Badge>
            <Text size="xs">{importedFile.name}</Text>
            {Object.entries(byCategory).map(([cat, n]) => (
              <Badge key={cat} size="xs" color="gray" variant="light">
                {cat}: {n}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}

      <Group justify="flex-end">
        <Button
          leftSection={<IconRocket size={16} />}
          onClick={openConfirm}
          disabled={!canSeed}
          loading={running}
        >
          Seed {items ? items.length : 0} lookup(s)
        </Button>
      </Group>

      <SeedProgress
        running={running}
        logLines={logLines}
        seedError={seedError}
        successAlert={
          result && (
            <>
              Done — wrote {result.generated} lookup(s).{' '}
              {Object.entries(result.byCategory)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}
            </>
          )
        }
      />

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleSeed}
        title="Seed lookups?"
        message={
          clientCode && items
            ? `This will OVERWRITE the lookups envelope for "${clientCode}" with ${items.length} record(s).`
            : ''
        }
        confirmLabel="Seed"
        confirmColor="teal"
        loading={running}
      />
    </SectionCard>
  );
}

function SeedJsonDropzone({ onFiles, hint }: { onFiles: (files: File[]) => void; hint: string }) {
  const [dragOver, setDragOver] = useState(false);

  const filterJson = (list: FileList | File[] | null): File[] => {
    if (!list) return [];
    return Array.from(list).filter(
      (f) => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json',
    );
  };

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = filterJson(e.dataTransfer.files);
        if (files.length === 0) {
          notifications.show({ color: 'yellow', message: 'Only .json files are accepted.' });
          return;
        }
        onFiles(files);
      }}
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
          Drag &amp; drop <Code>{hint}</Code> here
        </Text>
        <FileButton
          onChange={(picked) => {
            const accepted = filterJson(picked ? (Array.isArray(picked) ? picked : [picked]) : []);
            if (accepted.length > 0) onFiles(accepted);
          }}
          accept="application/json,.json"
        >
          {(props) => (
            <Button {...props} size="compact-sm" variant="default">
              or pick a file
            </Button>
          )}
        </FileButton>
      </Stack>
    </Box>
  );
}

function SeedProgress({
  running,
  logLines,
  seedError,
  successAlert,
}: {
  running: boolean;
  logLines: string[];
  seedError: string | null;
  successAlert: React.ReactNode;
}) {
  if (!running && logLines.length === 0 && !seedError && !successAlert) return null;
  return (
    <Stack gap="sm" mt="md">
      <Group gap="xs">
        <Text fw={600} size="sm">
          Progress log
        </Text>
        {running && <Loader size="xs" />}
      </Group>
      <Box
        p="sm"
        style={{
          background: 'var(--mantine-color-dark-9)',
          color: 'var(--mantine-color-gray-0)',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 12,
          maxHeight: 280,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {logLines.length === 0 && !seedError ? (
          <span style={{ opacity: 0.6 }}>(waiting…)</span>
        ) : (
          logLines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </Box>
      {seedError && (
        <Alert color="red" variant="light">
          {seedError}
        </Alert>
      )}
      {successAlert && (
        <Alert color="green" variant="light">
          {successAlert}
        </Alert>
      )}
    </Stack>
  );
}
