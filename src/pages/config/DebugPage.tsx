import { appConfig } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useProductStore } from '@/stores/useProductStore';
import { useLookupV2Labels } from '@/hooks';
import { findProductUnitIssues, type UnitIntegrityReport } from '@/utils/unitIntegrity';
import { getEffectivePermissions } from '@/utils/permission';
import { cacheGet } from '@/utils/appCache';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import type { CMngtAppConfig } from '@credo/kits/types';
import type { EmployeeExtra } from '@/types';
import { FieldLabel } from '@credo/base-ui/components';
import {
  ActionIcon,
  Button,
  Card,
  Code,
  Collapse,
  CopyButton,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconActivity,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';
import { useMyEmployee } from '@/hooks/useMyEmployee';

export function DebugPage() {
  const { user } = useAuthStore();
  const { items: employees, initialized: employeesLoaded } = useEmployeeStore();

  const effectivePerms = getEffectivePermissions();
  const config = appConfig as CMngtAppConfig & {
    build?: {
      version: string;
      buildHash: string;
      buildTimestamp: string;
      buildTimestampReadable: string;
    };
  };

  const resolvedEmail = user?.email;

  const matchedEmployee = useMyEmployee() ?? null;

  const emailMatch = useMemo(() => {
    if (!resolvedEmail || !employeesLoaded) return null;
    return findEmployeeByLoginEmail(employees, resolvedEmail) ?? null;
  }, [resolvedEmail, employeesLoaded, employees]);
  const identityDisagreement =
    emailMatch?.id !== matchedEmployee?.id
      ? `server=${matchedEmployee?.id ?? '(none)'} email-match=${emailMatch?.id ?? '(none)'}`
      : null;

  const department = sharedUserStorage.get<string>(SharedStorageKey.DEPARTMENT);
  const employeeExtra = matchedEmployee?.extra as EmployeeExtra | undefined;

  return (
    <Stack gap="lg" fw={600}>
      <Group gap="xs">
        <IconActivity size={22} style={{ opacity: 0.6 }} />
        <Title order={3}>Debug</Title>
      </Group>

      {/* Identity */}
      <DebugSection title="Identity">
        <DebugRow label="Profile email" value={user?.email || '(empty)'} />
        <DebugRow label="Resolved email" value={resolvedEmail ?? '(none)'} />
        <DebugRow label="Profile name" value={user?.name || '(empty)'} />
      </DebugSection>

      {/* Full appConfig */}
      <CollapsibleDebugSection title="appConfig (full)">
        <DebugJson data={appConfig} />
      </CollapsibleDebugSection>

      {/* Employee Match */}
      <CollapsibleDebugSection title="Employee Match">
        <DebugRow
          label="Employees loaded"
          value={employeesLoaded ? `Yes (${employees.length})` : 'No'}
        />
        <DebugRow
          label="Matched employee"
          value={
            matchedEmployee
              ? `${matchedEmployee.name} (${matchedEmployee.id})`
              : '(no match — root user)'
          }
        />
        {identityDisagreement && (
          <DebugRow label="⚠ Identity mismatch" value={identityDisagreement} />
        )}
        <DebugRow label="Department (employee)" value={matchedEmployee?.department || '(none)'} />
        <DebugRow label="Department (storage)" value={department || '(not set)'} />
        <DebugRow
          label="Employee active"
          value={matchedEmployee ? String(matchedEmployee.isActive) : '-'}
        />
        {employeeExtra?.permissions && (
          <DebugJson label="Employee perm overrides" data={employeeExtra.permissions} />
        )}
      </CollapsibleDebugSection>

      {/* Effective Permissions */}
      <CollapsibleDebugSection title="Effective Permissions (cached)">
        <DebugRow
          label="Config version (cfg)"
          value={(cacheGet('prv') as Record<string, string> | undefined)?.cfg ?? '(none)'}
        />
        <DebugRow
          label="Employee perm version (emp)"
          value={(cacheGet('prv') as Record<string, string> | undefined)?.emp ?? '(none)'}
        />
        <DebugRow
          label="Employee current version"
          value={employeeExtra?.permissionsVersion ?? '(none)'}
        />
        <DebugJson data={effectivePerms} />
      </CollapsibleDebugSection>

      {/* Feature Flags */}
      <CollapsibleDebugSection title="Feature Flags">
        <DebugJson data={config.features} />
      </CollapsibleDebugSection>

      {/* Client Permissions (config) */}
      <CollapsibleDebugSection title="Client Permissions (appConfig.permissions)">
        <DebugJson data={config.permissions ?? {}} />
      </CollapsibleDebugSection>

      {/* User Storage */}
      <CollapsibleDebugSection title="User Storage (shared)">
        <DebugJson data={sharedUserStorage.exportSettings()} />
      </CollapsibleDebugSection>

      {/* Product unit integrity */}
      <UnitIntegritySection />

      {/* App Info */}
      <DebugSection title="App Info">
        <DebugRow label="Config version" value={config.version ?? '-'} />
        <DebugRow label="Build version" value={config.build?.version ?? '-'} />
        <DebugRow label="Build hash" value={config.build?.buildHash ?? '-'} />
        <DebugRow label="Build timestamp" value={config.build?.buildTimestampReadable ?? '-'} />
      </DebugSection>
    </Stack>
  );
}

function UnitIntegritySection() {
  const unitLabels = useLookupV2Labels('product-unit');
  const [report, setReport] = useState<UnitIntegrityReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setIsRunning(true);
    setError(null);
    try {
      await useProductStore.getState().forceRefresh();
      setReport(findProductUnitIssues(useProductStore.getState().items, unitLabels));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" wrap="nowrap" mb="xs">
        <FieldLabel size="sm" lts={0.5}>
          Product Unit Integrity
        </FieldLabel>
        <Button size="compact-xs" variant="light" loading={isRunning} onClick={run}>
          Run check
        </Button>
      </Group>
      <Divider mb="sm" />
      <Stack gap={6}>
        <Text size="xs" c="dimmed">
          Finds products whose unit isn&apos;t a known <Code>unit</Code> lookup value — typically a
          label written into the value slot by a pre-2026-07-17 Excel import. Read-only; nothing is
          modified. {unitLabels.size} unit lookup(s) known.
        </Text>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        {report && (
          <>
            <DebugRow
              label="Result"
              value={
                report.products.length === 0
                  ? `Clean — ${report.scanned} product(s) scanned`
                  : `${report.products.length} of ${report.scanned} product(s) affected`
              }
            />
            {report.distinctValues.length > 0 && (
              <>
                <Text size="xs" c="dimmed" mt={4}>
                  Offending values (fix the unit, not the rows)
                </Text>
                {report.distinctValues.map((v) => (
                  <Group key={v.value} gap="sm" wrap="nowrap">
                    <Code style={{ fontSize: 13 }}>{v.value}</Code>
                    <Text size="xs" c="dimmed">
                      ×{v.productCount}
                    </Text>
                    <Text size="xs" c={v.suggestedValue ? 'teal' : 'orange'}>
                      {v.suggestedValue
                        ? `→ ${v.suggestedValue}`
                        : 'no matching lookup — add it under Lookups or retype'}
                    </Text>
                  </Group>
                ))}
                <DebugJson label="Affected products" data={report.products} />
              </>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

function DebugSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card withBorder padding="md">
      <FieldLabel size="sm" lts={0.5} mb="xs">
        {title}
      </FieldLabel>
      <Divider mb="sm" />
      <Stack gap={6}>{children}</Stack>
    </Card>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Text size="sm" c="dimmed" w={180} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Code style={{ fontSize: 15 }}>{value}</Code>
    </Group>
  );
}

function CollapsibleDebugSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [opened, { toggle }] = useDisclosure(false);
  const ChevronIcon = opened ? IconChevronDown : IconChevronRight;

  return (
    <Card withBorder padding="md">
      <UnstyledButton onClick={toggle} w="100%">
        <Group gap="xs">
          <ChevronIcon size={16} style={{ opacity: 0.5 }} />
          <FieldLabel size="sm" lts={0.5}>
            {title}
          </FieldLabel>
        </Group>
      </UnstyledButton>
      <Collapse in={opened}>
        <Divider my="sm" />
        <Stack gap={6}>{children}</Stack>
      </Collapse>
    </Card>
  );
}

function DebugJson({ data, label }: { data: unknown; label?: string }) {
  const json = JSON.stringify(data, null, 2);

  return (
    <>
      {label && (
        <Text size="xs" c="dimmed" mb={2}>
          {label}
        </Text>
      )}
      <div style={{ position: 'relative' }}>
        <CopyButton value={json}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy JSON'} position="left">
              <ActionIcon
                variant="subtle"
                color={copied ? 'teal' : 'gray'}
                size="sm"
                onClick={copy}
                style={{ position: 'absolute', top: 6, right: 6, zIndex: 1 }}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
        <ScrollArea>
          <Code block style={{ fontSize: 11, maxHeight: 300 }}>
            {json}
          </Code>
        </ScrollArea>
      </div>
    </>
  );
}
