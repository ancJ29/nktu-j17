import { resolveClientCode } from '@/config/client-code';
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Collapse,
  Divider,
  Group,
  JsonInput,
  NumberInput,
  Radio,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingFactory2,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconCategory2,
  IconClipboardCheck,
  IconDatabase,
  IconKey,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useLookupStore } from '@/stores/useLookupStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { INDUSTRY_OPTIONS, loadIndustry, type IndustryName } from '../../../scripts/faker/industry';

import { FakeDataSecretsModal } from './FakeDataSecretsModal';
import { getFakeDataSecrets, hasAllFakeDataSecrets } from './fakeDataSecrets';
import { getManualEmployeesJson, setManualEmployeesJson } from './manualEmployeesStorage';
import { getManualLookupsJson, setManualLookupsJson } from './manualLookupsStorage';
import {
  seedFakeEmployees,
  type ManualEmployeeInput,
  type SeedEmployeesResult,
} from './seedFakeEmployees';
import { seedFakeLookups, type ManualLookupInput, type SeedLookupsResult } from './seedFakeLookups';
import { seedFakeCustomers, type SeedCustomersResult } from './seedFakeCustomers';
import { seedFakeGoodsReceipts, type SeedGoodsReceiptsResult } from './seedFakeGoodsReceipts';
import {
  seedFakeProductInventory,
  type SeedProductInventoryResult,
} from './seedFakeProductInventory';
import { seedFakeProducts, type SeedProductsResult } from './seedFakeProducts';
import { seedFakeSalesOrders, type SeedSalesOrdersResult } from './seedFakeSalesOrders';
import { seedFakeVendors, type SeedVendorsResult } from './seedFakeVendors';
import {
  purgeAllExceptEmployees,
  type PurgeAllExceptEmployeesResult,
} from './purgeAllExceptEmployees';
import {
  purgeTransactionalData,
  type PurgeTransactionalDataResult,
} from './purgeTransactionalData';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { NumberField } from '@/components/NumberField';

const DEFAULT_INDUSTRY: IndustryName = 'food';

const DEFAULT_EMPLOYEES_JSON = JSON.stringify(
  [
    { lastName: 'Lê', firstName: 'Duy Tân', department: 'Quản lý', phone: '0903720713' },
    { lastName: 'Nguyễn', firstName: 'Ngọc Tùng', department: 'Quản lý', phone: '0869922992' },
    {
      lastName: 'Nguyễn',
      firstName: 'Thị Mai Phương',
      department: 'Kế Toán',
      phone: '0347980160',
    },
    {
      lastName: 'Trần',
      firstName: 'Phương Duy',
      department: 'Kho',
      phone: '0908683530',
      personalPhone: '0898012078',
    },
  ],
  null,
  2,
);

const DEFAULT_LOOKUPS_JSON = JSON.stringify(
  [
    { category: 'product-category', value: 'NOODLE', label: 'Mì ăn liền' },
    { category: 'unit', value: 'KG', label: 'Kilôgam' },
    { category: 'product-tag', value: 'BEST_SELLER', label: 'Bán chạy nhất' },
    { category: 'material-category', value: 'GRAIN', label: 'Ngũ cốc & Bột' },
  ],
  null,
  2,
);

export function FakeDataPage() {
  const { t } = useTranslation();
  const clientCode = resolveClientCode() ?? '';

  const [industry, setIndustry] = useState<IndustryName>(DEFAULT_INDUSTRY);
  const industryData = useMemo(() => loadIndustry(industry), [industry]);

  const [hasSecrets, setHasSecrets] = useState<boolean>(() => hasAllFakeDataSecrets());
  const [secretsOpen, { open: openSecrets, close: closeSecrets }] = useDisclosure(false);
  const refreshSecretsFlag = useCallback(() => setHasSecrets(hasAllFakeDataSecrets()), []);

  const sectionsDisabled = !hasSecrets;

  useHotkeys([['mod+c', openSecrets]]);

  return (
    <Stack gap="lg">
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <IconDatabase size={22} style={{ opacity: 0.6 }} />
          <div>
            <Title order={3}>{t('fakeData.title')}</Title>
            <Text size="xs" c="dimmed">
              {t('fakeData.subtitle')}
            </Text>
          </div>
        </Group>
        <Group gap="xs">
          <Badge color="gray" variant="light" leftSection={<IconKey size={12} />}>
            {t('fakeData.clientCode')}: {clientCode || '—'}
          </Badge>
          <Button
            size="compact-sm"
            variant={hasSecrets ? 'light' : 'filled'}
            onClick={openSecrets}
            leftSection={<IconKey size={14} />}
          >
            {hasSecrets ? t('fakeData.changeSecrets') : t('fakeData.configureSecrets')}
          </Button>
        </Group>
      </Group>

      {!hasSecrets && (
        <Alert color="yellow" variant="light">
          {t('fakeData.missingSecrets')}
        </Alert>
      )}

      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconBuildingFactory2 size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.industry.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">
          {t('fakeData.industry.description')}
        </Text>
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label={t('fakeData.industry.label')}
            data={INDUSTRY_OPTIONS}
            value={industry}
            onChange={(v) => v && setIndustry(v as IndustryName)}
            allowDeselect={false}
            w={260}
          />
          <Group gap="lg">
            <StatText
              label={t('fakeData.industry.products')}
              value={industryData.products.length}
            />
            <StatText
              label={t('fakeData.industry.materials')}
              value={industryData.materials.length}
            />
            <StatText
              label={t('fakeData.industry.lookups')}
              value={
                industryData.lookups.productCategory.length +
                industryData.lookups.materialCategory.length +
                industryData.lookups.unit.length +
                industryData.lookups.productTag.length
              }
            />
          </Group>
        </Group>
        {industryData.description && (
          <Text size="xs" c="dimmed" mt="sm">
            {industryData.description}
          </Text>
        )}
      </Card>

      <LookupsSection clientCode={clientCode} industry={industry} disabled={sectionsDisabled} />
      <EmployeeSection clientCode={clientCode} disabled={sectionsDisabled} />
      <ProductSection
        clientCode={clientCode}
        industry={industry}
        disabled={sectionsDisabled}
        max={industryData.products.length}
      />
      <CustomerSection clientCode={clientCode} industry={industry} disabled={sectionsDisabled} />
      <VendorSection clientCode={clientCode} industry={industry} disabled={sectionsDisabled} />
      <GoodsReceiptSection
        clientCode={clientCode}
        industry={industry}
        disabled={sectionsDisabled}
      />
      <SalesOrderSection clientCode={clientCode} disabled={sectionsDisabled} />
      <ProductInventorySection clientCode={clientCode} disabled={sectionsDisabled} />
      <TransactionalPurgeSection clientCode={clientCode} disabled={sectionsDisabled} />
      <PurgeSection clientCode={clientCode} disabled={sectionsDisabled} />

      <FakeDataSecretsModal
        opened={secretsOpen}
        onClose={closeSecrets}
        onSaved={refreshSecretsFlag}
      />
    </Stack>
  );
}

function StatText({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600} ff="monospace">
        {value}
      </Text>
    </div>
  );
}

type ParsedResult<T> = { items: T[]; error: null } | { items: null; error: string };

function parseJsonArray<T>(text: string): ParsedResult<T> {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], error: null };
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch (err) {
    return { items: null, error: (err as Error).message };
  }
  if (!Array.isArray(raw)) return { items: null, error: 'not-array' };
  return { items: raw as T[], error: null };
}

function useRunState<TSummary>() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<TSummary | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} · ${line}`]);
  }, []);

  const reset = useCallback(() => {
    setLog([]);
    setSummary(null);
    setLastError(null);
  }, []);

  return {
    running,
    setRunning,
    log,
    summary,
    setSummary,
    lastError,
    setLastError,
    appendLog,
    reset,
  };
}

type BaseSectionProps = {
  clientCode: string;
  disabled: boolean;
};

type IndustrySectionProps = BaseSectionProps & {
  industry: IndustryName;
};

function EmployeeSection({ clientCode, disabled }: BaseSectionProps) {
  const { t } = useTranslation();
  const invalidateEmployees = useEmployeeStore((s) => s.invalidate);

  const [count] = useState<number>(0);
  const [skipSso, setSkipSso] = useState(false);
  const [source, setSource] = useState<'random' | 'json'>('random');
  const [jsonText, setJsonText] = useState<string>('');
  useEffect(() => {
    const stored = getManualEmployeesJson(clientCode);

    setJsonText(stored || DEFAULT_EMPLOYEES_JSON);
  }, [clientCode]);

  const parsed = useMemo(() => parseJsonArray<ManualEmployeeInput>(jsonText), [jsonText]);
  const isJson = source === 'json';
  const parsedCount = parsed.items?.length ?? 0;

  const effectiveCount = isJson ? parsedCount : count;
  const jsonError =
    parsed.error === 'not-array'
      ? t('fakeData.employees.jsonNotArray')
      : parsed.error
        ? t('fakeData.employees.jsonInvalid', { error: parsed.error })
        : null;
  const canGenerate = isJson ? parsedCount > 0 && !jsonError : true;

  const run = useRunState<SeedEmployeesResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode) return;
    if (isJson && (!parsed.items || parsed.items.length === 0)) {
      notifications.show({ color: 'red', message: t('fakeData.employees.jsonEmpty') });
      return;
    }
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeEmployees({
        clientCode,
        count: effectiveCount,
        skipSso,
        secrets: getFakeDataSecrets(),
        ...(isJson && parsed.items ? { items: parsed.items } : {}),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateEmployees();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [
    clientCode,
    closeConfirm,
    effectiveCount,
    invalidateEmployees,
    isJson,
    parsed.items,
    run,
    skipSso,
    t,
  ]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconUsers size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.employees.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.employees.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <SourceRadio
            value={source}
            onChange={setSource}
            labelKey="fakeData.employees.source"
            randomKey="fakeData.sourceRandom"
            jsonKey="fakeData.sourceJson"
          />
          {isJson ? (
            <NumberInput
              label={t('fakeData.employees.parsedRows')}
              value={parsedCount}
              readOnly
              disabled
              w={260}
            />
          ) : (
            <Alert color="blue" variant="light">
              {t('fakeData.employees.randomCoverage')}
            </Alert>
          )}

          {isJson && (
            <JsonInput
              label={t('fakeData.employees.jsonLabel')}
              description={t('fakeData.employees.jsonHelp')}
              value={jsonText}
              onChange={(v) => {
                setJsonText(v);
                setManualEmployeesJson(clientCode, v);
              }}
              error={jsonError}
              autosize
              minRows={8}
              maxRows={20}
              formatOnBlur
              spellCheck={false}
            />
          )}

          <Switch
            label={t('fakeData.employees.skipSso')}
            description={t('fakeData.employees.skipSsoHelp')}
            checked={skipSso}
            onChange={(e) => setSkipSso(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || !canGenerate}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && <EmployeeSummary summary={run.summary} />}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.employees.confirmTitle')}
        message={
          isJson
            ? t('fakeData.employees.confirmBody', { count: effectiveCount, clientCode })
            : t('fakeData.employees.confirmBodyRandom', { clientCode })
        }
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

function EmployeeSummary({ summary }: { summary: SeedEmployeesResult }) {
  const { t } = useTranslation();
  const [failuresOpen, { toggle }] = useDisclosure(false);
  return (
    <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
      <Text size="sm" fw={600} mb={4}>
        {t('fakeData.summary')}
      </Text>
      <Text size="sm">{t('fakeData.summaryRecords', { count: summary.generated })}</Text>
      <Text size="sm">
        {t('fakeData.summarySso', { created: summary.ssoCreated, failed: summary.ssoFailed })}
      </Text>
      {summary.ssoFailures.length > 0 && (
        <>
          <Button size="compact-xs" variant="subtle" mt={6} onClick={toggle}>
            {t('fakeData.failures')} ({summary.ssoFailures.length})
          </Button>
          <Collapse in={failuresOpen}>
            <ScrollArea mah={200} mt="xs">
              <Stack gap={4}>
                {summary.ssoFailures.map((f, i) => (
                  <Text key={i} size="xs" c="dimmed">
                    <Code>{f.email}</Code> — {f.error}
                  </Text>
                ))}
              </Stack>
            </ScrollArea>
          </Collapse>
        </>
      )}
    </Card>
  );
}

type ProductMaterialSectionProps = IndustrySectionProps & {
  max: number;
};

function ProductSection({ clientCode, industry, disabled, max }: ProductMaterialSectionProps) {
  const { t } = useTranslation();
  const invalidateProducts = useProductStore((s) => s.invalidate);

  const [count, setCount] = useState<number>(max);
  useEffect(() => {
    setCount(max);
  }, [max]);

  const run = useRunState<SeedProductsResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode || count < 1) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeProducts({
        clientCode,
        industry,
        count,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateProducts();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, count, industry, invalidateProducts, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconPackage size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.products.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.products.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <NumberField
            label={t('fakeData.products.count')}
            description={t('fakeData.products.countHelp', { max })}
            value={count}
            emptyValue={0}
            onChange={setCount}
            min={1}
            max={max}
            w={260}
          />
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || count < 1}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.products.confirmTitle')}
        message={t('fakeData.products.confirmBody', { count, clientCode })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

const CUSTOMER_DEFAULT_COUNT = 25;
const CUSTOMER_MAX_COUNT = 500;

function CustomerSection({ clientCode, industry, disabled }: IndustrySectionProps) {
  const { t } = useTranslation();
  const invalidateCustomers = useCustomerStore((s) => s.invalidate);

  const [count, setCount] = useState<number>(CUSTOMER_DEFAULT_COUNT);

  const run = useRunState<SeedCustomersResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode || count < 1) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeCustomers({
        clientCode,
        industry,
        count,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateCustomers();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, count, industry, invalidateCustomers, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconShoppingCart size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.customers.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.customers.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <NumberField
            label={t('fakeData.customers.count')}
            description={t('fakeData.customers.countHelp')}
            value={count}
            emptyValue={0}
            onChange={setCount}
            min={1}
            max={CUSTOMER_MAX_COUNT}
            w={260}
          />
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || count < 1}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.customers.confirmTitle')}
        message={t('fakeData.customers.confirmBody', { count, clientCode })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

const VENDOR_DEFAULT_COUNT = 25;
const VENDOR_MAX_COUNT = 500;

function VendorSection({ clientCode, industry, disabled }: IndustrySectionProps) {
  const { t } = useTranslation();
  const invalidateVendors = useVendorStore((s) => s.invalidate);

  const [count, setCount] = useState<number>(VENDOR_DEFAULT_COUNT);

  const run = useRunState<SeedVendorsResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode || count < 1) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeVendors({
        clientCode,
        industry,
        count,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateVendors();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, count, industry, invalidateVendors, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconBuildingStore size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.vendors.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.vendors.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <NumberField
            label={t('fakeData.vendors.count')}
            description={t('fakeData.vendors.countHelp')}
            value={count}
            emptyValue={0}
            onChange={setCount}
            min={1}
            max={VENDOR_MAX_COUNT}
            w={260}
          />
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || count < 1}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.vendors.confirmTitle')}
        message={t('fakeData.vendors.confirmBody', { count, clientCode })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

const GR_DEFAULT_COUNT = 30;
const GR_MAX_COUNT = 500;
const GR_DEFAULT_DAYS_BACK = 14;
const GR_MAX_DAYS_BACK = 60;

function GoodsReceiptSection({ clientCode, industry, disabled }: IndustrySectionProps) {
  const { t } = useTranslation();
  const invalidateGoodsReceipts = useGoodsReceiptStore((s) => s.invalidate);

  const [count, setCount] = useState<number>(GR_DEFAULT_COUNT);
  const [daysBack, setDaysBack] = useState<number>(GR_DEFAULT_DAYS_BACK);

  const run = useRunState<SeedGoodsReceiptsResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode || count < 1) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeGoodsReceipts({
        clientCode,
        industry,
        count,
        daysBack,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateGoodsReceipts();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, count, daysBack, industry, invalidateGoodsReceipts, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconClipboardCheck size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.goodsReceipts.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.goodsReceipts.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <Group gap="md" wrap="wrap">
            <NumberField
              label={t('fakeData.goodsReceipts.count')}
              description={t('fakeData.goodsReceipts.countHelp')}
              value={count}
              emptyValue={0}
              onChange={setCount}
              min={1}
              max={GR_MAX_COUNT}
              w={260}
            />
            <NumberField
              label={t('fakeData.goodsReceipts.daysBack')}
              description={t('fakeData.goodsReceipts.daysBackHelp')}
              value={daysBack}
              emptyValue={0}
              onChange={setDaysBack}
              min={1}
              max={GR_MAX_DAYS_BACK}
              w={260}
            />
          </Group>
          <Alert color="blue" variant="light">
            {t('fakeData.goodsReceipts.inventoryWarning')}
          </Alert>
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || count < 1}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
              <Text size="xs" c="dimmed" mt={4} ff="monospace">
                {`draft: ${run.summary.byStatus.draft} · received: ${run.summary.byStatus.received} · cancelled: ${run.summary.byStatus.cancelled} · partitions: ${run.summary.partitions}`}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.goodsReceipts.confirmTitle')}
        message={t('fakeData.goodsReceipts.confirmBody', { count, daysBack, clientCode })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

const SO_DEFAULT_COUNT = 30;
const SO_MAX_COUNT = 500;
const SO_DEFAULT_DAYS_BACK = 14;
const SO_MAX_DAYS_BACK = 60;

function SalesOrderSection({ clientCode, disabled }: BaseSectionProps) {
  const { t } = useTranslation();
  const invalidateSalesOrders = useSalesOrderStore((s) => s.invalidate);

  const [count, setCount] = useState<number>(SO_DEFAULT_COUNT);
  const [daysBack, setDaysBack] = useState<number>(SO_DEFAULT_DAYS_BACK);

  const run = useRunState<SeedSalesOrdersResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode || count < 1) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeSalesOrders({
        clientCode,
        count,
        daysBack,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateSalesOrders();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, count, daysBack, invalidateSalesOrders, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconReceipt size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.salesOrders.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.salesOrders.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <Group gap="md" wrap="wrap">
            <NumberField
              label={t('fakeData.salesOrders.count')}
              description={t('fakeData.salesOrders.countHelp')}
              value={count}
              emptyValue={0}
              onChange={setCount}
              min={1}
              max={SO_MAX_COUNT}
              w={260}
            />
            <NumberField
              label={t('fakeData.salesOrders.daysBack')}
              description={t('fakeData.salesOrders.daysBackHelp')}
              value={daysBack}
              emptyValue={0}
              onChange={setDaysBack}
              min={1}
              max={SO_MAX_DAYS_BACK}
              w={260}
            />
          </Group>
          <Alert color="blue" variant="light">
            {t('fakeData.salesOrders.inventoryWarning')}
          </Alert>
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || count < 1}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
              <Text size="xs" c="dimmed" mt={4} ff="monospace">
                {`NEW: ${run.summary.byStage.NEW} · IN_PROGRESS: ${run.summary.byStage.IN_PROGRESS} · COMPLETED: ${run.summary.byStage.COMPLETED} · EXCEPTIONAL: ${run.summary.byStage.EXCEPTIONAL} · cancelled: ${run.summary.cancelled} · partitions: ${run.summary.partitions}`}
              </Text>
              <Text size="xs" c="dimmed" mt={2} ff="monospace">
                {`customers: ${run.summary.customersCovered} · products: ${run.summary.productsCovered}`}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.salesOrders.confirmTitle')}
        message={t('fakeData.salesOrders.confirmBody', { count, daysBack, clientCode })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

const PINV_DEFAULT_COUNT = 30;
const PINV_MAX_COUNT = 1000;
const PINV_DEFAULT_MAX_QTY = 100;
const PINV_MAX_MAX_QTY = 10_000;

function ProductInventorySection({ clientCode, disabled }: BaseSectionProps) {
  const { t } = useTranslation();
  const invalidate = useProductInventoryStore((s) => s.invalidate);

  const [count, setCount] = useState<number>(PINV_DEFAULT_COUNT);
  const [maxQty, setMaxQty] = useState<number>(PINV_DEFAULT_MAX_QTY);
  const [multiUnitSplit, setMultiUnitSplit] = useState(true);

  const run = useRunState<SeedProductInventoryResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode || count < 1) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeProductInventory({
        clientCode,
        count,
        maxQty,
        multiUnitSplit,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidate();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, count, invalidate, maxQty, multiUnitSplit, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconBuildingWarehouse size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.productInventory.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.productInventory.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <Group gap="md" wrap="wrap">
            <NumberField
              label={t('fakeData.productInventory.count')}
              description={t('fakeData.productInventory.countHelp')}
              value={count}
              emptyValue={0}
              onChange={setCount}
              min={1}
              max={PINV_MAX_COUNT}
              w={260}
            />
            <NumberField
              label={t('fakeData.productInventory.maxQty')}
              description={t('fakeData.productInventory.maxQtyHelp')}
              value={maxQty}
              emptyValue={0}
              onChange={setMaxQty}
              min={0}
              max={PINV_MAX_MAX_QTY}
              w={260}
            />
          </Group>
          <Switch
            label={t('fakeData.productInventory.multiUnitSplit')}
            description={t('fakeData.productInventory.multiUnitSplitHelp')}
            checked={multiUnitSplit}
            onChange={(e) => setMultiUnitSplit(e.currentTarget.checked)}
          />
          <Alert color="blue" variant="light">
            {t('fakeData.productInventory.overwriteWarning')}
          </Alert>
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || count < 1}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
              <Text size="xs" c="dimmed" mt={4} ff="monospace">
                {`products: ${run.summary.productsCovered} · locations: ${run.summary.locationsCovered} · multi-unit: ${run.summary.withMultiUnitSplit}`}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.productInventory.confirmTitle')}
        message={t('fakeData.productInventory.confirmBody', { count, clientCode })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

function TransactionalPurgeSection({ clientCode, disabled }: BaseSectionProps) {
  const { t } = useTranslation();
  const invalidateGoodsReceipts = useGoodsReceiptStore((s) => s.invalidate);
  const invalidateSalesOrders = useSalesOrderStore((s) => s.invalidate);
  const invalidateDeliveryRequests = useDeliveryRequestStore((s) => s.invalidate);

  const run = useRunState<PurgeTransactionalDataResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handlePurge = useCallback(async () => {
    closeConfirm();
    if (!clientCode) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await purgeTransactionalData({
        clientCode,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateGoodsReceipts();
      invalidateSalesOrders();
      invalidateDeliveryRequests();
      notifications.show({ color: 'green', message: t('fakeData.transactionalPurge.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [
    clientCode,
    closeConfirm,
    invalidateDeliveryRequests,
    invalidateGoodsReceipts,
    invalidateSalesOrders,
    run,
    t,
  ]);

  return (
    <>
      <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-orange-3)' }}>
        <Group gap="xs" mb="xs">
          <IconTrash size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.transactionalPurge.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.transactionalPurge.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <Alert color="orange" variant="light">
            {t('fakeData.transactionalPurge.warning')}
          </Alert>
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running}
              loading={run.running}
              color="orange"
              leftSection={<IconTrash size={14} />}
            >
              {t('fakeData.transactionalPurge.button')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-orange-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.transactionalPurge.summaryRemoved', { count: run.summary.removed })}
              </Text>
              <Text size="xs" c="dimmed" mt={4} ff="monospace">
                {Object.entries(run.summary.byPrefix)
                  .map(([prefix, n]) => `${prefix}: ${n}`)
                  .join(' · ')}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handlePurge}
        title={t('fakeData.transactionalPurge.confirmTitle')}
        message={t('fakeData.transactionalPurge.confirmBody', { clientCode })}
        confirmLabel={t('fakeData.transactionalPurge.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

function PurgeSection({ clientCode, disabled }: BaseSectionProps) {
  const { t } = useTranslation();
  const invalidateLookups = useLookupStore((s) => s.invalidate);
  const invalidateProducts = useProductStore((s) => s.invalidate);
  const invalidateCustomers = useCustomerStore((s) => s.invalidate);
  const invalidateVendors = useVendorStore((s) => s.invalidate);
  const invalidateGoodsReceipts = useGoodsReceiptStore((s) => s.invalidate);
  const invalidateSalesOrders = useSalesOrderStore((s) => s.invalidate);
  const invalidateDeliveryRequests = useDeliveryRequestStore((s) => s.invalidate);
  const invalidateProductInventory = useProductInventoryStore((s) => s.invalidate);

  const run = useRunState<PurgeAllExceptEmployeesResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handlePurge = useCallback(async () => {
    closeConfirm();
    if (!clientCode) return;
    run.setRunning(true);
    run.reset();
    try {
      const result = await purgeAllExceptEmployees({
        clientCode,
        secrets: getFakeDataSecrets(),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateLookups();
      invalidateProducts();
      invalidateCustomers();
      invalidateVendors();
      invalidateGoodsReceipts();
      invalidateSalesOrders();
      invalidateDeliveryRequests();
      invalidateProductInventory();
      notifications.show({ color: 'green', message: t('fakeData.purge.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [
    clientCode,
    closeConfirm,
    invalidateCustomers,
    invalidateDeliveryRequests,
    invalidateGoodsReceipts,
    invalidateLookups,
    invalidateProductInventory,
    invalidateProducts,
    invalidateSalesOrders,
    invalidateVendors,
    run,
    t,
  ]);

  return (
    <>
      <Card withBorder padding="md" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
        <Group gap="xs" mb="xs">
          <IconTrash size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.purge.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.purge.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <Alert color="red" variant="light">
            {t('fakeData.purge.warning')}
          </Alert>
          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running}
              loading={run.running}
              color="red"
              leftSection={<IconTrash size={14} />}
            >
              {t('fakeData.purge.button')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-red-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.purge.summaryRemoved', { count: run.summary.removed })}
              </Text>
              <Text size="xs" c="dimmed" mt={4} ff="monospace">
                {Object.entries(run.summary.byPrefix)
                  .map(([prefix, n]) => `${prefix}: ${n}`)
                  .join(' · ')}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handlePurge}
        title={t('fakeData.purge.confirmTitle')}
        message={t('fakeData.purge.confirmBody', { clientCode })}
        confirmLabel={t('fakeData.purge.confirmOk')}
        confirmColor="red"
        loading={run.running}
      />
    </>
  );
}

function LookupsSection({ clientCode, industry, disabled }: IndustrySectionProps) {
  const { t } = useTranslation();
  const invalidateLookups = useLookupStore((s) => s.invalidate);

  const [source, setSource] = useState<'random' | 'json'>('random');
  const [jsonText, setJsonText] = useState<string>('');
  useEffect(() => {
    const stored = getManualLookupsJson(clientCode);

    setJsonText(stored || DEFAULT_LOOKUPS_JSON);
  }, [clientCode]);

  const parsed = useMemo(() => parseJsonArray<ManualLookupInput>(jsonText), [jsonText]);
  const isJson = source === 'json';
  const parsedCount = parsed.items?.length ?? 0;

  const missingFields =
    isJson &&
    parsed.items?.some(
      (row) => !row?.category?.trim?.() || (!row?.value?.trim?.() && !row?.label?.trim?.()),
    );
  const jsonError =
    parsed.error === 'not-array'
      ? t('fakeData.lookupsSeed.jsonNotArray')
      : parsed.error
        ? t('fakeData.lookupsSeed.jsonInvalid', { error: parsed.error })
        : missingFields
          ? t('fakeData.lookupsSeed.jsonMissingFields')
          : null;
  const canGenerate = isJson ? parsedCount > 0 && !jsonError : true;

  const run = useRunState<SeedLookupsResult>();
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const handleGenerate = useCallback(async () => {
    closeConfirm();
    if (!clientCode) return;
    if (isJson && (!parsed.items || parsed.items.length === 0)) {
      notifications.show({ color: 'red', message: t('fakeData.lookupsSeed.jsonEmpty') });
      return;
    }
    run.setRunning(true);
    run.reset();
    try {
      const result = await seedFakeLookups({
        clientCode,
        industry,
        secrets: getFakeDataSecrets(),
        ...(isJson && parsed.items ? { items: parsed.items } : {}),
        onLog: run.appendLog,
      });
      run.setSummary(result);
      invalidateLookups();
      notifications.show({ color: 'green', message: t('fakeData.runSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.setLastError(message);
      run.appendLog(`ERROR: ${message}`);
      notifications.show({
        color: 'red',
        message: t('fakeData.runError', { error: message }),
      });
    } finally {
      run.setRunning(false);
    }
  }, [clientCode, closeConfirm, industry, invalidateLookups, isJson, parsed.items, run, t]);

  return (
    <>
      <Card withBorder padding="md">
        <Group gap="xs" mb="xs">
          <IconCategory2 size={18} style={{ opacity: 0.6 }} />
          <Text fw={600}>{t('fakeData.lookupsSeed.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {t('fakeData.lookupsSeed.description')}
        </Text>
        <Divider mb="md" />
        <Stack gap="sm">
          <SourceRadio
            value={source}
            onChange={setSource}
            labelKey="fakeData.source"
            randomKey="fakeData.sourceRandom"
            jsonKey="fakeData.sourceJson"
          />
          {isJson && (
            <NumberInput
              label={t('fakeData.lookupsSeed.parsedRows')}
              value={parsedCount}
              readOnly
              disabled
              w={260}
            />
          )}

          {isJson && (
            <JsonInput
              label={t('fakeData.lookupsSeed.jsonLabel')}
              description={t('fakeData.lookupsSeed.jsonHelp')}
              value={jsonText}
              onChange={(v) => {
                setJsonText(v);
                setManualLookupsJson(clientCode, v);
              }}
              error={jsonError}
              autosize
              minRows={8}
              maxRows={20}
              formatOnBlur
              spellCheck={false}
            />
          )}

          <Group justify="flex-end">
            <Button
              onClick={openConfirm}
              disabled={disabled || run.running || !canGenerate}
              loading={run.running}
              color="orange"
            >
              {t('__new__.01-common.actions.generate')}
            </Button>
          </Group>
        </Stack>

        <RunOutput
          log={run.log}
          running={run.running}
          lastError={run.lastError}
          hasSummary={!!run.summary}
        >
          {run.summary && (
            <Card withBorder padding="sm" bg="var(--mantine-color-green-0)">
              <Text size="sm" fw={600} mb={4}>
                {t('fakeData.summary')}
              </Text>
              <Text size="sm">
                {t('fakeData.summaryRecords', { count: run.summary.generated })}
              </Text>
              <Text size="xs" c="dimmed" mt={4} ff="monospace">
                {Object.entries(run.summary.byCategory)
                  .map(([cat, n]) => `${cat}: ${n}`)
                  .join(' · ')}
              </Text>
            </Card>
          )}
        </RunOutput>
      </Card>

      <ConfirmModal
        opened={confirmOpen}
        onClose={closeConfirm}
        onConfirm={handleGenerate}
        title={t('fakeData.lookupsSeed.confirmTitle')}
        message={t('fakeData.lookupsSeed.confirmBody', {
          count: parsedCount || '~',
          clientCode,
        })}
        confirmLabel={t('common.labels.confirmOk')}
        confirmColor="orange"
        loading={run.running}
      />
    </>
  );
}

type SourceRadioProps = {
  value: 'random' | 'json';
  onChange: (v: 'random' | 'json') => void;
  labelKey: string;
  randomKey: string;
  jsonKey: string;
};

function SourceRadio({ value, onChange, labelKey, randomKey, jsonKey }: SourceRadioProps) {
  const { t } = useTranslation();
  return (
    <Radio.Group
      label={t(labelKey as never)}
      value={value}
      onChange={(v) => onChange(v === 'json' ? 'json' : 'random')}
    >
      <Group gap="md" mt={4}>
        <Radio value="random" label={t(randomKey as never)} />
        <Radio value="json" label={t(jsonKey as never)} />
      </Group>
    </Radio.Group>
  );
}

type RunOutputProps = {
  log: string[];
  running: boolean;
  lastError: string | null;
  hasSummary: boolean;
  children?: React.ReactNode;
};

function RunOutput({ log, running, lastError, hasSummary, children }: RunOutputProps) {
  const { t } = useTranslation();
  const hasContent = log.length > 0 || hasSummary || lastError || running;
  if (!hasContent) return null;
  return (
    <Stack gap="sm" mt="md">
      <Divider label={t('fakeData.log')} labelPosition="left" />
      {children}
      {lastError && (
        <Alert color="red" variant="light">
          {lastError}
        </Alert>
      )}
      <ScrollArea mah={280}>
        <Code block style={{ fontSize: 12 }}>
          {log.join('\n') || ' '}
        </Code>
      </ScrollArea>
    </Stack>
  );
}
