import { Alert, Button, Card, Group, Select, Stack, Table, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCash, IconEraser, IconTrash } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device, logger } from '@credo/base-ui/utils';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DateField } from '@/components/DateField';
import { Form } from '@/components/Form';
import { NumberField } from '@/components/NumberField';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import {
  odometerFuelPaymentBundle,
  useOdometerFuelResetStore,
} from '@/stores/useOdometerFuelStores';
import type { Employee, OdometerFuelPayment, OdometerFuelReset, OdometerLog } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import {
  buildFuelLedger,
  dayToDate,
  FUEL_LEDGER_FLOOR,
  ledgerStart,
  ledgerWindowStart,
  livePayments,
  owedThrough,
  readAmount,
  withPendingReset,
  type FuelLedgerRow,
} from './fuelLedgerModel';
import { shiftDate } from './odometerLogModel';

const isMobile = device.isMobile;

type LedgerData = { logs: OdometerLog[]; payments: OdometerFuelPayment[] };

export function OdometerFuelLedger({
  roster,
  driverFilter,
}: {
  readonly roster: Employee[];
  readonly driverFilter: string;
}) {
  const { t } = useTranslation();
  const canManage = perms.odometerLog.canManagePayment();

  const resets = useOdometerFuelResetStore((s) => s.items);
  const resetsInitialized = useOdometerFuelResetStore((s) => s.initialized);
  const resetsError = useOdometerFuelResetStore((s) => s.error);
  const loadResets = useOdometerFuelResetStore((s) => s.loadAll);

  const [data, setData] = useState<LedgerData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [payFor, setPayFor] = useState('');
  const [payOpened, { open: openPay, close: closePay }] = useDisclosure(false);
  const [resetOpened, { open: openReset, close: closeReset }] = useDisclosure(false);
  const [striking, setStriking] = useState<OdometerFuelPayment | null>(null);
  const [strikeBusy, setStrikeBusy] = useState(false);

  useEffect(() => {
    if (!resetsInitialized && !resetsError) loadResets();
  }, [resetsInitialized, resetsError, loadResets]);

  const windowStart = useMemo(() => ledgerWindowStart(roster, resets), [roster, resets]);

  useEffect(() => {
    if (!resetsInitialized) return;
    let cancelled = false;
    const from = dayToDate(windowStart);
    const to = new Date();
    Promise.all([
      odometerLogBundle.queryRange(from, to),
      odometerFuelPaymentBundle.queryRange(from, to),
    ])
      .then(([logs, payments]) => {
        if (cancelled) return;
        setData({ logs, payments });
        setLoadFailed(false);
      })
      .catch((err) => {
        logger.error('Fuel ledger read failed:', err);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resetsInitialized, windowStart, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const rows = useMemo(() => {
    if (!data) return [];
    const all = buildFuelLedger({ roster, ...data, resets });
    return driverFilter ? all.filter((r) => r.employeeId === driverFilter) : all;
  }, [data, roster, resets, driverFilter]);

  const counted = useMemo(() => {
    if (!data) return [];
    return livePayments(data.payments)
      .filter((p) => {
        const who = p.extra?.employeeId ?? '';
        return (
          readAmount(p) !== undefined &&
          (!driverFilter || who === driverFilter) &&
          p.recordDate >= ledgerStart(resets, who)
        );
      })
      .sort((a, b) => b.recordDate.localeCompare(a.recordDate) || b.createdAt - a.createdAt);
  }, [data, resets, driverFilter]);

  const startPay = (employeeId: string) => {
    setPayFor(employeeId);
    openPay();
  };

  const handleStrike = async () => {
    if (!striking) return;
    setStrikeBusy(true);
    try {
      await odometerFuelPaymentBundle.updateSafely({
        id: striking.id,
        version: striking.version,
        patch: { recordDate: striking.recordDate, extra: { ...striking.extra, isDeleted: true } },
        partitionKey: striking.recordDate,
      });
      notifications.show({ color: 'green', message: t('odometerLog.fuel.paymentDeleted') });
      setStriking(null);
      reload();
    } catch (err) {
      logger.error('Fuel payment strike failed:', err);
      notifications.show({ color: 'red', message: t('odometerLog.fuel.saveFailed') });
    } finally {
      setStrikeBusy(false);
    }
  };

  const ledgerBody = isMobile ? (
    rows.map((row) => (
      <Card key={row.employeeId} withBorder radius="md" padding="sm">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              {row.employeeName}
            </Text>
            <Text size="xs" c="dimmed">
              {t('odometerLog.fuel.from')} {formatDate(row.from)}
              {row.paidThrough &&
                ` · ${t('odometerLog.fuel.paidThrough')} ${formatDate(row.paidThrough)}`}
            </Text>
            <Text size="xs">
              {t('odometerLog.fuel.spent')} {formatNumber(row.spent)} · {t('odometerLog.fuel.paid')}{' '}
              {formatNumber(row.paid)}
            </Text>
          </Stack>
          <Stack gap={4} align="flex-end">
            <Remaining value={row.remaining} />
            {canManage && (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => startPay(row.employeeId)}
                aria-label={t('odometerLog.fuel.pay')}
              >
                <IconCash size={14} />
              </Button>
            )}
          </Stack>
        </Group>
      </Card>
    ))
  ) : (
    <Table striped withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t('odometerLog.columns.driver')}</Table.Th>
          <Table.Th>{t('odometerLog.fuel.from')}</Table.Th>
          <Table.Th ta="right">{t('odometerLog.fuel.spent')}</Table.Th>
          <Table.Th ta="right">{t('odometerLog.fuel.paid')}</Table.Th>
          <Table.Th ta="right">{t('odometerLog.fuel.remaining')}</Table.Th>
          <Table.Th>{t('odometerLog.fuel.paidThrough')}</Table.Th>
          {canManage && <Table.Th />}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.employeeId}>
            <Table.Td>{row.employeeName}</Table.Td>
            <Table.Td>{formatDate(row.from)}</Table.Td>
            <Table.Td ta="right" ff="monospace">
              {formatNumber(row.spent)}
            </Table.Td>
            <Table.Td ta="right" ff="monospace">
              {formatNumber(row.paid)}
            </Table.Td>
            <Table.Td ta="right">
              <Remaining value={row.remaining} />
            </Table.Td>
            <Table.Td>{row.paidThrough ? formatDate(row.paidThrough) : '—'}</Table.Td>
            {canManage && (
              <Table.Td>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => startPay(row.employeeId)}
                  aria-label={t('odometerLog.fuel.pay')}
                >
                  <IconCash size={14} />
                </Button>
              </Table.Td>
            )}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Text size="xs" c="dimmed">
          {t('odometerLog.fuel.caption')}
        </Text>
        {canManage && (
          <Group gap="xs">
            <Button
              size="xs"
              leftSection={<IconCash size={14} />}
              onClick={() => startPay('')}
              disabled={!data}
            >
              {t('odometerLog.fuel.pay')}
            </Button>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconEraser size={14} />}
              onClick={openReset}
              disabled={!data}
            >
              {t('odometerLog.fuel.reset')}
            </Button>
          </Group>
        )}
      </Group>

      {(loadFailed || resetsError) && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          <Group gap="xs" justify="space-between">
            <Text size="sm">{t('odometerLog.fuel.loadFailed')}</Text>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => (resetsError ? loadResets() : reload())}
            >
              {t('odometerLog.fuel.retry')}
            </Button>
          </Group>
        </Alert>
      )}

      {data &&
        (rows.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            {t('odometerLog.fuel.empty')}
          </Text>
        ) : (
          ledgerBody
        ))}
      {!data && !loadFailed && !resetsError && (
        <Text size="sm" c="dimmed" ta="center">
          …
        </Text>
      )}

      {data && (
        <Stack gap="xs" mt="md">
          <Text size="sm" fw={600}>
            {t('odometerLog.fuel.payments')}
          </Text>
          {counted.length === 0 ? (
            <Text c="dimmed" size="sm">
              {t('odometerLog.fuel.noPayments')}
            </Text>
          ) : (
            <PaymentList payments={counted} canManage={canManage} onStrike={setStriking} />
          )}
        </Stack>
      )}

      {data && (
        <FuelPaymentModal
          opened={payOpened}
          onClose={closePay}
          roster={roster}
          data={data}
          resets={resets}
          initialEmployeeId={payFor}
          onSaved={reload}
        />
      )}
      {data && resetOpened && (
        <FuelResetConfirm onClose={closeReset} roster={roster} data={data} resets={resets} />
      )}
      <ConfirmModal
        opened={striking !== null}
        onClose={() => setStriking(null)}
        onConfirm={() => void handleStrike()}
        title={t('odometerLog.fuel.deletePaymentTitle')}
        message={
          striking
            ? t('odometerLog.fuel.deletePaymentMessage', {
                amount: formatNumber(readAmount(striking)),
                name: striking.extra?.employeeName ?? '',
                date: formatDate(striking.recordDate),
              })
            : ''
        }
        loading={strikeBusy}
      />
    </Stack>
  );
}

function Remaining({ value }: { readonly value: number }) {
  const color = value > 0 ? 'orange' : 'dimmed';
  return (
    <Text size="sm" fw={600} ff="monospace" c={value < 0 ? 'blue' : color}>
      {formatNumber(value)}
    </Text>
  );
}

function PaymentList({
  payments,
  canManage,
  onStrike,
}: {
  readonly payments: OdometerFuelPayment[];
  readonly canManage: boolean;
  readonly onStrike: (payment: OdometerFuelPayment) => void;
}) {
  const { t } = useTranslation();
  if (isMobile) {
    return payments.map((p) => (
      <Card key={p.id} withBorder radius="md" padding="xs">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Text size="sm" fw={600} ff="monospace">
              {formatNumber(readAmount(p))}
            </Text>
            <Text size="xs" c="dimmed">
              {p.extra?.employeeName} · {t('odometerLog.fuel.paidThrough')}{' '}
              {formatDate(p.recordDate)}
            </Text>
            {p.extra?.note && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {p.extra.note}
              </Text>
            )}
          </Stack>
          {canManage && (
            <Button size="compact-xs" variant="subtle" color="red" onClick={() => onStrike(p)}>
              <IconTrash size={14} />
            </Button>
          )}
        </Group>
      </Card>
    ));
  }
  return (
    <Table striped>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t('odometerLog.fuel.paidThrough')}</Table.Th>
          <Table.Th>{t('odometerLog.columns.driver')}</Table.Th>
          <Table.Th ta="right">{t('odometerLog.fuel.amount')}</Table.Th>
          <Table.Th>{t('odometerLog.columns.note')}</Table.Th>
          <Table.Th>{t('odometerLog.fuel.recordedBy')}</Table.Th>
          {canManage && <Table.Th />}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {payments.map((p) => (
          <Table.Tr key={p.id}>
            <Table.Td>{formatDate(p.recordDate)}</Table.Td>
            <Table.Td>{p.extra?.employeeName}</Table.Td>
            <Table.Td ta="right" ff="monospace">
              {formatNumber(readAmount(p))}
            </Table.Td>
            <Table.Td>
              <Text size="xs" c="dimmed" lineClamp={2}>
                {p.extra?.note}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="xs" c="dimmed">
                {p.extra?.recordedByName}
              </Text>
            </Table.Td>
            {canManage && (
              <Table.Td>
                <Button size="compact-xs" variant="subtle" color="red" onClick={() => onStrike(p)}>
                  <IconTrash size={14} />
                </Button>
              </Table.Td>
            )}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

type FuelModalProps = {
  readonly roster: Employee[];
  readonly data: LedgerData;
  readonly resets: OdometerFuelReset[];
};

function FuelPaymentModal({
  opened,
  onClose,
  ...rest
}: FuelModalProps & {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly initialEmployeeId: string;
  readonly onSaved: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('odometerLog.fuel.payTitle')}>
      {/* Mounted only while open, so the form seeds from props at mount — the
          same reason as OdometerLogModal. */}
      {opened && <FuelPaymentForm onClose={onClose} {...rest} />}
    </ResponsiveModal>
  );
}

type PaymentValues = {
  employeeId: string;
  recordDate: string;
  amount: number | undefined;
  note: string;
};

function FuelPaymentForm({
  onClose,
  roster,
  data,
  resets,
  initialEmployeeId,
  onSaved,
}: FuelModalProps & {
  readonly onClose: () => void;
  readonly initialEmployeeId: string;
  readonly onSaved: () => void;
}) {
  const { t } = useTranslation();
  const me = useMyEmployee();
  const today = todayInVnDateString();
  const [saving, setSaving] = useState(false);

  const owed = (employeeId: string, date: string) =>
    employeeId ? owedThrough({ ...data, resets, employeeId, date }) : 0;
  const positive = (n: number) => (n > 0 ? n : undefined);

  const form = useForm<PaymentValues>({
    initialValues: {
      employeeId: initialEmployeeId,
      recordDate: today,
      amount: positive(owed(initialEmployeeId, today)),
      note: '',
    },
    validate: {
      employeeId: (v) => (v ? null : t('odometerLog.fuel.driverRequired')),
      recordDate: (v) => (v ? null : t('odometerLog.validation.dateRequired')),
      amount: (v) => (v !== undefined && v > 0 ? null : t('odometerLog.fuel.amountRequired')),
    },
  });
  const { employeeId, recordDate } = form.values;
  const refill = (nextEmployee: string, nextDate: string) =>
    form.setFieldValue('amount', positive(owed(nextEmployee, nextDate)));

  const handleSubmit = async (values: PaymentValues) => {
    if (!values.amount) return;
    setSaving(true);
    try {
      await odometerFuelPaymentBundle.createSafely({
        item: {
          recordDate: values.recordDate,
          extra: {
            employeeId: values.employeeId,
            employeeName: roster.find((e) => e.id === values.employeeId)?.name ?? '',
            amount: values.amount,
            note: values.note.trim() || undefined,
            recordedByName: me?.name,
          },
        },
        partitionKey: values.recordDate,
      });
      notifications.show({ color: 'green', message: t('odometerLog.fuel.paymentSaved') });
      onSaved();
      onClose();
    } catch (err) {
      logger.error('Fuel payment save failed:', err);
      notifications.show({ color: 'red', message: t('odometerLog.fuel.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Stack gap="md">
        <Select
          label={t('odometerLog.columns.driver')}
          withAsterisk
          searchable
          data={roster.map((e) => ({ value: e.id, label: e.name }))}
          value={employeeId || null}
          error={form.errors.employeeId}
          onChange={(v) => {
            form.setFieldValue('employeeId', v ?? '');
            refill(v ?? '', recordDate);
          }}
        />
        <DateField
          label={t('odometerLog.fuel.paidThrough')}
          withAsterisk
          clearable={false}
          maxDate={new Date()}
          value={recordDate}
          error={form.errors.recordDate}
          onChange={(v) => {
            if (!v) return;
            form.setFieldValue('recordDate', v);
            refill(employeeId, v);
          }}
        />
        {employeeId && (
          <Text size="xs" c="dimmed">
            {t('odometerLog.fuel.owedThrough', {
              date: formatDate(recordDate),
              amount: formatNumber(owed(employeeId, recordDate)),
            })}
          </Text>
        )}
        <NumberField
          label={t('odometerLog.fuel.amount')}
          withAsterisk
          min={0}
          allowDecimal={false}
          value={form.values.amount}
          error={form.errors.amount}
          onChange={(value) => form.setFieldValue('amount', value)}
        />
        <Textarea
          label={t('odometerLog.columns.note')}
          autosize
          minRows={2}
          {...form.getInputProps('note')}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={saving}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('common.actions.save')}
          </Button>
        </Group>
      </Stack>
    </Form>
  );
}

function FuelResetConfirm({
  onClose,
  roster,
  data,
  resets,
}: FuelModalProps & { readonly onClose: () => void }) {
  const { t } = useTranslation();
  const me = useMyEmployee();
  const today = todayInVnDateString();
  const [fromDate, setFromDate] = useState(today);
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  const remainingOf = (list: OdometerFuelReset[]) =>
    buildFuelLedger({ roster, ...data, resets: list })
      .filter((r: FuelLedgerRow) => !employeeId || r.employeeId === employeeId)
      .reduce((sum, r) => sum + r.remaining, 0);

  const previewable = fromDate >= ledgerWindowStart(roster, resets);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const driver = roster.find((e) => e.id === employeeId);
      await useOdometerFuelResetStore.getState().createSafely({
        patch: {
          extra: {
            fromDate,
            ...(driver && { employeeId: driver.id, employeeName: driver.name }),
            recordedByName: me?.name,
          },
        },
      });
      notifications.show({ color: 'green', message: t('odometerLog.fuel.resetSaved') });
      onClose();
    } catch (err) {
      logger.error('Fuel reset save failed:', err);
      notifications.show({ color: 'red', message: t('odometerLog.fuel.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfirmModal
      opened
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={t('odometerLog.fuel.resetTitle')}
      message={t('odometerLog.fuel.resetExplain')}
      confirmLabel={t('odometerLog.fuel.reset')}
      confirmColor="orange"
      loading={saving}
      confirmDisabled={!fromDate}
    >
      <Stack gap="sm">
        <DateField
          label={t('odometerLog.fuel.resetFrom')}
          clearable={false}
          minDate={dayToDate(FUEL_LEDGER_FLOOR)}
          maxDate={dayToDate(shiftDate(today, 1))}
          value={fromDate}
          onChange={(v) => v && setFromDate(v)}
        />
        <Select
          label={t('odometerLog.columns.driver')}
          placeholder={t('odometerLog.filters.driverAll')}
          data={roster.map((e) => ({ value: e.id, label: e.name }))}
          value={employeeId || null}
          onChange={(v) => setEmployeeId(v ?? '')}
          clearable
          searchable
        />
        {previewable && (
          <Text size="sm">
            {t('odometerLog.fuel.resetPreview', {
              before: formatNumber(remainingOf(resets)),
              after: formatNumber(remainingOf(withPendingReset(resets, fromDate, employeeId))),
            })}
          </Text>
        )}
      </Stack>
    </ConfirmModal>
  );
}
