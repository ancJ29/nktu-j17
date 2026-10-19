import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  ColorSwatch,
  Group,
  Progress,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCash,
  IconChevronRight,
  IconEraser,
  IconTrash,
} from '@tabler/icons-react';
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
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import {
  buildFuelLedger,
  buildPaybackHistory,
  dayToDate,
  FUEL_LEDGER_FLOOR,
  owedThrough,
  readAmount,
  withPendingReset,
  type EarlierCount,
  type FuelLedgerRow,
  type PaybackHistory,
  type PaybackLine,
  type PaybackPeriod,
} from './fuelLedgerModel';
import { shiftDate } from './odometerLogModel';

const isMobile = device.isMobile;

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const DIVIDER = { borderTop: '1px solid var(--mantine-color-default-border)' } as const;

const PERIOD_COLUMNS = '16px 130px 170px minmax(0, 1fr) 110px 110px';

type LedgerData = { logs: OdometerLog[]; payments: OdometerFuelPayment[] };

const dayMonth = (day: string) => formatDate(day).slice(0, 5);

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

  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!resetsInitialized && !resetsError) loadResets();
  }, [resetsInitialized, resetsError, loadResets]);

  useEffect(() => {
    if (!resetsInitialized) return;
    let cancelled = false;

    const from = dayToDate(FUEL_LEDGER_FLOOR);
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
  }, [resetsInitialized, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const histories = useMemo(() => {
    if (!data) return [];
    const all = buildPaybackHistory({ roster, ...data, resets });
    const shown = driverFilter ? all.filter((h) => h.row.employeeId === driverFilter) : all;

    return [...shown].sort((a, b) => Number(b.row.remaining > 0) - Number(a.row.remaining > 0));
  }, [data, roster, resets, driverFilter]);

  const owed = histories.filter((h) => h.row.remaining > 0);
  const owedTotal = owed.reduce((sum, h) => sum + h.row.remaining, 0);

  const isOpen = (key: string, byDefault: boolean) => toggled[key] ?? byDefault;
  const toggle = (key: string, byDefault: boolean) =>
    setToggled((prev) => ({ ...prev, [key]: !(prev[key] ?? byDefault) }));

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

  const actions = canManage && (
    <Group gap="xs" grow={isMobile} w={isMobile ? '100%' : undefined}>
      <Button
        size={isMobile ? 'sm' : 'xs'}
        leftSection={<IconCash size={14} />}
        onClick={() => startPay('')}
        disabled={!data}
      >
        {t('odometerLog.fuel.pay')}
      </Button>
      <Button
        size={isMobile ? 'sm' : 'xs'}
        variant="default"
        leftSection={<IconEraser size={14} />}
        onClick={openReset}
        disabled={!data}
      >
        {t('odometerLog.fuel.reset')}
      </Button>
    </Group>
  );

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="xs">
        <Stack gap={2}>
          {data && histories.length > 0 && (
            <Text size="sm">
              {owed.length > 0 ? (
                <>
                  {t('odometerLog.fuel.owedSummary', { count: owed.length })}{' '}
                  <Text span fw={700} c="orange.9" style={TABULAR}>
                    {t('odometerLog.fuel.amountWithUnit', { amount: formatNumber(owedTotal) })}
                  </Text>
                </>
              ) : (
                t('odometerLog.fuel.allSettled')
              )}
            </Text>
          )}
          <Text size="xs" c="gray.7">
            {t('odometerLog.fuel.caption')}
          </Text>
        </Stack>
        {actions}
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
        (histories.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            {t('odometerLog.fuel.empty')}
          </Text>
        ) : (
          histories.map((history) => (
            <DriverStatement
              key={history.row.employeeId}
              history={history}
              canManage={canManage}
              isOpen={isOpen}
              onToggle={toggle}
              onPay={() => startPay(history.row.employeeId)}
              onStrike={setStriking}
            />
          ))
        ))}
      {!data && !loadFailed && !resetsError && (
        <Text size="sm" c="dimmed" ta="center">
          …
        </Text>
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

function startsOpen(period: PaybackPeriod): boolean {
  return period.through === undefined;
}

function balanceColor(value: number): string | undefined {
  if (value > 0) return 'orange.9';
  if (value < 0) return 'blue.8';
  return undefined;
}

type PeriodHandlers = {
  readonly isOpen: (key: string, byDefault: boolean) => boolean;
  readonly onToggle: (key: string, byDefault: boolean) => void;
};

const THIN_DIVIDER = { borderTop: '1px solid var(--mantine-color-gray-1)' } as const;

function DriverStatement({
  history,
  canManage,
  isOpen,
  onToggle,
  onPay,
  onStrike,
}: PeriodHandlers & {
  readonly history: PaybackHistory;
  readonly canManage: boolean;
  readonly onPay: () => void;
  readonly onStrike: (payment: OdometerFuelPayment) => void;
}) {
  const { t } = useTranslation();
  const { row, periods, earlier } = history;
  const paidNote = row.paidThrough
    ? t('odometerLog.fuel.paidThroughShort', { date: dayMonth(row.paidThrough) })
    : row.spent > 0
      ? t('odometerLog.fuel.noPaymentYet')
      : '';

  return (
    <Card withBorder radius="md" padding={0}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm" p="sm">
        <Stack gap={0}>
          <Text fw={600}>{row.employeeName}</Text>
          <Text size="xs" c="gray.7">
            {t('odometerLog.fuel.from')} {formatDate(row.from)}
          </Text>
        </Stack>
        <Group gap="md" wrap="nowrap">
          <Stack gap={0} align="flex-end">
            {!isMobile && (
              <Text size="xs" c="gray.7">
                {t('odometerLog.fuel.remaining')}
              </Text>
            )}
            <Text
              size={isMobile ? 'lg' : 'xl'}
              fw={700}
              lh={1.3}
              c={balanceColor(row.remaining)}
              style={TABULAR}
            >
              {t('odometerLog.fuel.amountWithUnit', { amount: formatNumber(row.remaining) })}
            </Text>
            {paidNote && (
              <Text size="xs" c="gray.7">
                {paidNote}
              </Text>
            )}
          </Stack>
          {canManage && !isMobile && (
            <Button size="xs" variant="light" leftSection={<IconCash size={14} />} onClick={onPay}>
              {t('odometerLog.fuel.pay')}
            </Button>
          )}
        </Group>
      </Group>

      {periods.length === 0 && (
        <Text size="sm" c="gray.7" px="sm" py="xs" style={DIVIDER}>
          {t('odometerLog.fuel.noSpending', { date: formatDate(row.from) })}
        </Text>
      )}
      {periods.length > 0 && !isMobile && (
        <Box
          px="sm"
          pt={8}
          pb={4}
          style={{ ...DIVIDER, display: 'grid', gridTemplateColumns: PERIOD_COLUMNS, gap: 12 }}
        >
          <span />
          <Text size="xs" c="gray.7">
            {t('odometerLog.fuel.colPeriod')}
          </Text>
          <Text size="xs" c="gray.7">
            {t('odometerLog.fuel.colStatus')}
          </Text>
          <Text size="xs" c="gray.7">
            {t('odometerLog.fuel.colBar')}
          </Text>
          <Text size="xs" c="gray.7" ta="right">
            {t('odometerLog.fuel.spent')}
          </Text>
          <Text size="xs" c="gray.7" ta="right">
            {t('odometerLog.fuel.paid')}
          </Text>
        </Box>
      )}
      {periods.map((period) => (
        <PeriodBlock
          key={period.from}
          employeeId={row.employeeId}
          period={period}
          canManage={canManage}
          isOpen={isOpen}
          onToggle={onToggle}
          onStrike={onStrike}
        />
      ))}
      {earlier.map((count) => {
        const key = `${row.employeeId}:clear:${count.clear.extra.fromDate}`;
        const open = isOpen(key, false);
        return (
          <Box key={key} style={DIVIDER}>
            <ClearRow count={count} open={open} onToggle={() => onToggle(key, false)} />
            {open &&
              count.periods.map((period) => (
                <PeriodBlock
                  key={period.from}
                  employeeId={row.employeeId}
                  period={period}
                  readOnly
                  canManage={false}
                  isOpen={isOpen}
                  onToggle={onToggle}
                  onStrike={onStrike}
                />
              ))}
          </Box>
        );
      })}

      {canManage && isMobile && (
        <Box p="sm" style={DIVIDER}>
          <Button fullWidth variant="light" leftSection={<IconCash size={16} />} onClick={onPay}>
            {t('odometerLog.fuel.pay')}
          </Button>
        </Box>
      )}
    </Card>
  );
}

function PeriodBlock({
  employeeId,
  period,
  readOnly = false,
  canManage,
  isOpen,
  onToggle,
  onStrike,
}: PeriodHandlers & {
  readonly employeeId: string;
  readonly period: PaybackPeriod;
  readonly readOnly?: boolean;
  readonly canManage: boolean;
  readonly onStrike: (payment: OdometerFuelPayment) => void;
}) {
  const key = `${employeeId}:${period.from}`;
  const byDefault = !readOnly && startsOpen(period);
  const open = isOpen(key, byDefault);
  return (
    <Box style={THIN_DIVIDER}>
      <PeriodRow period={period} open={open} onToggle={() => onToggle(key, byDefault)} />
      {open && <PeriodLines period={period} canManage={canManage} onStrike={onStrike} />}
    </Box>
  );
}

function ClearRow({
  count,
  open,
  onToggle,
}: {
  readonly count: EarlierCount;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { clear, dropped } = count;
  const at = formatDateTime(clear.createdAt);
  const recorded = clear.extra.recordedByName
    ? t('odometerLog.fuel.recordedByAt', { name: clear.extra.recordedByName, at })
    : t('odometerLog.fuel.recordedAt', { at });
  const amount = t('odometerLog.fuel.amountWithUnit', { amount: formatNumber(Math.abs(dropped)) });
  const droppedText =
    dropped > 0
      ? t('odometerLog.fuel.clearDropped', { amount })
      : dropped < 0
        ? t('odometerLog.fuel.clearDroppedOver', { amount })
        : t('odometerLog.fuel.clearNothingDropped');
  return (
    <UnstyledButton
      onClick={onToggle}
      aria-expanded={open}
      w="100%"
      px="sm"
      py={10}
      bg="var(--mantine-color-gray-0)"
    >
      <Group
        justify="space-between"
        wrap={isMobile ? 'wrap' : 'nowrap'}
        gap="xs"
        align="flex-start"
      >
        <Group gap={8} wrap="nowrap" align="flex-start">
          <IconChevronRight
            size={16}
            color="var(--mantine-color-gray-7)"
            style={{ transform: open ? 'rotate(90deg)' : undefined, flexShrink: 0, marginTop: 2 }}
          />
          <IconEraser
            size={16}
            color="var(--mantine-color-gray-7)"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <Stack gap={0}>
            <Text component="span" size="sm" fw={500}>
              {t('odometerLog.fuel.clearMarker', { date: formatDate(clear.extra.fromDate) })}
            </Text>
            <Text component="span" size="xs" c="gray.7">
              {clear.extra.employeeId
                ? recorded
                : `${recorded} · ${t('odometerLog.fuel.clearForAll')}`}
            </Text>
          </Stack>
        </Group>
        <Stack gap={0} align={isMobile ? 'flex-start' : 'flex-end'} pl={isMobile ? 48 : 0}>
          <Text component="span" size="sm" c={balanceColor(dropped)}>
            {droppedText}
          </Text>
          <Text component="span" size="xs" c="gray.7">
            {t('odometerLog.fuel.earlierPeriods', {
              count: count.periods.length,
              from: dayMonth(count.from),
              to: dayMonth(count.to),
            })}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

function PeriodRow({
  period,
  open,
  onToggle,
}: {
  readonly period: PaybackPeriod;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  const { t } = useTranslation();
  const range = period.to
    ? `${dayMonth(period.from)} → ${dayMonth(period.to)}`
    : t('odometerLog.fuel.periodOpen', { from: dayMonth(period.from) });
  const chevron = (
    <IconChevronRight
      size={16}
      color="var(--mantine-color-gray-7)"
      style={{ transform: open ? 'rotate(90deg)' : undefined, flexShrink: 0 }}
    />
  );
  const background = open ? 'var(--mantine-color-gray-0)' : undefined;

  if (isMobile) {
    return (
      <UnstyledButton onClick={onToggle} aria-expanded={open} w="100%" p="sm" bg={background}>
        <Stack gap={8}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap={6} wrap="nowrap">
              {chevron}
              <Text component="span" size="sm" fw={500}>
                {range}
              </Text>
            </Group>
            <PeriodStatus period={period} />
          </Group>
          <PaybackBar period={period} />
          <Group justify="space-between" wrap="nowrap">
            <Text component="span" size="xs" c="gray.7">
              {t('odometerLog.fuel.spent')}{' '}
              <Text
                component="span"
                size="sm"
                fw={600}
                c="var(--mantine-color-text)"
                style={TABULAR}
              >
                {formatNumber(period.spent)}
              </Text>
            </Text>
            <Text component="span" size="xs" c="gray.7">
              {t('odometerLog.fuel.paid')}{' '}
              <Text
                component="span"
                size="sm"
                fw={600}
                c="var(--mantine-color-text)"
                style={TABULAR}
              >
                {formatNumber(period.paid)}
              </Text>
            </Text>
          </Group>
        </Stack>
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton
      onClick={onToggle}
      aria-expanded={open}
      w="100%"
      px="sm"
      py={10}
      bg={background}
      style={{
        display: 'grid',
        gridTemplateColumns: PERIOD_COLUMNS,
        gap: 12,
        alignItems: 'center',
      }}
    >
      {chevron}
      <Text component="span" size="sm" fw={500}>
        {range}
      </Text>
      <PeriodStatus period={period} />
      <PaybackBar period={period} />
      <Text component="span" size="sm" fw={500} ta="right" style={TABULAR}>
        {formatNumber(period.spent)}
      </Text>
      <Text component="span" size="sm" fw={500} ta="right" style={TABULAR}>
        {formatNumber(period.paid)}
      </Text>
    </UnstyledButton>
  );
}

function PeriodStatus({ period }: { readonly period: PaybackPeriod }) {
  const { t } = useTranslation();
  const { balance } = period;
  const amount = formatNumber(Math.abs(balance));
  const [color, label] =
    balance > 0
      ? [
          'orange',
          period.through
            ? t('odometerLog.fuel.statusShort', { amount })
            : t('odometerLog.fuel.statusUnpaid'),
        ]
      : balance < 0
        ? ['blue', t('odometerLog.fuel.statusOver', { amount })]
        : ['teal', t('odometerLog.fuel.statusSettled')];
  return (
    <Group gap={6} wrap="nowrap">
      <ColorSwatch
        component="span"
        size={8}
        color={`var(--mantine-color-${color}-6)`}
        withShadow={false}
      />
      <Text component="span" size="sm" style={{ whiteSpace: 'nowrap' }}>
        {label}
      </Text>
    </Group>
  );
}

function PaybackBar({ period }: { readonly period: PaybackPeriod }) {
  const { t } = useTranslation();
  const due = Math.max(period.carryIn + period.spent, 0);
  const total = Math.max(due, period.paid);
  const unpaid = Math.max(period.balance, 0);
  const payments = period.lines.filter((line) => line.kind === 'payment');
  return (
    <Progress.Root size={isMobile ? 16 : 18} radius="sm">
      {total > 0 &&
        payments.map((line, i) => (
          <Progress.Section
            key={i}
            value={(line.amount / total) * 100}
            color={i % 2 ? 'primary.3' : 'primary.7'}
          >
            <Progress.Label c={i % 2 ? 'primary.9' : undefined} style={TABULAR}>
              {formatNumber(line.amount)}
            </Progress.Label>
          </Progress.Section>
        ))}
      {total > 0 && unpaid > 0 && (
        <Progress.Section value={(unpaid / total) * 100} color="orange.3">
          <Progress.Label c="dark.9" style={TABULAR}>
            {t('odometerLog.fuel.barUnpaid', { amount: formatNumber(unpaid) })}
          </Progress.Label>
        </Progress.Section>
      )}
    </Progress.Root>
  );
}

function LineWhat({ line }: { readonly line: PaybackLine }) {
  const { t } = useTranslation();
  let title: string;
  let sub: string | undefined;
  switch (line.kind) {
    case 'fuel':
      title = t('odometerLog.fuel.lineFuel');
      break;
    case 'other':
      title = line.content || t('odometerLog.home.otherCostUnnamed');
      sub = t('odometerLog.fuel.lineOther');
      break;
    case 'carry':
      title =
        line.amount > 0 ? t('odometerLog.fuel.lineCarry') : t('odometerLog.fuel.lineCarryOver');
      break;
    case 'payment': {
      const note = line.payment.extra?.note;
      const by = line.payment.extra?.recordedByName;
      const at = formatDateTime(line.payment.createdAt);
      title = note
        ? t('odometerLog.fuel.linePaymentNote', { note })
        : t('odometerLog.fuel.linePayment');
      sub = by
        ? t('odometerLog.fuel.recordedByAt', { name: by, at })
        : t('odometerLog.fuel.recordedAt', { at });
      break;
    }
  }
  return (
    <>
      <Text size="sm" fw={line.kind === 'payment' ? 600 : 400}>
        {title}
      </Text>
      {sub && (
        <Text size="xs" c="gray.7">
          {sub}
        </Text>
      )}
    </>
  );
}

function PeriodLines({
  period,
  canManage,
  onStrike,
}: {
  readonly period: PaybackPeriod;
  readonly canManage: boolean;
  readonly onStrike: (payment: OdometerFuelPayment) => void;
}) {
  const { t } = useTranslation();
  const endLabel = period.to ? t('odometerLog.fuel.balanceAfter') : t('odometerLog.fuel.remaining');
  const end = (
    <Group justify="space-between" wrap="nowrap" pt={8}>
      <Text size="sm" fw={600}>
        {endLabel}
      </Text>
      <Text size="sm" fw={700} c={balanceColor(period.balance)} style={TABULAR}>
        {t('odometerLog.fuel.amountWithUnit', { amount: formatNumber(period.balance) })}
      </Text>
    </Group>
  );
  const strike = (line: PaybackLine, size: 'sm' | 'lg') =>
    canManage &&
    line.kind === 'payment' && (
      <ActionIcon
        size={size}
        variant="subtle"
        color="red"
        aria-label={t('odometerLog.fuel.deletePaymentTitle')}
        onClick={() => onStrike(line.payment)}
      >
        <IconTrash size={14} />
      </ActionIcon>
    );
  const payBg = (line: PaybackLine) =>
    line.kind === 'payment' ? 'var(--mantine-color-primary-0)' : undefined;

  if (isMobile) {
    return (
      <Stack gap={2} px="sm" pb="sm" bg="var(--mantine-color-gray-0)">
        {period.lines.map((line, i) => {
          const isPay = line.kind === 'payment';
          return (
            <Group
              key={i}
              justify="space-between"
              wrap="nowrap"
              gap="xs"
              px="xs"
              py={6}
              bg={payBg(line) ?? 'var(--mantine-color-body)'}
              style={{ borderRadius: 'var(--mantine-radius-sm)' }}
            >
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="xs" c="gray.7">
                  {dayMonth(line.date)}
                </Text>
                <LineWhat line={line} />
              </Stack>
              <Group gap={4} wrap="nowrap">
                <Stack gap={0} align="flex-end">
                  <Text size="sm" fw={600} c={isPay ? 'primary.8' : undefined} style={TABULAR}>
                    {isPay ? `−${formatNumber(line.amount)}` : formatNumber(line.amount)}
                  </Text>
                  <Text size="xs" c="gray.7" style={TABULAR}>
                    {t('odometerLog.fuel.balanceShort', { amount: formatNumber(line.balance) })}
                  </Text>
                </Stack>
                {strike(line, 'lg')}
              </Group>
            </Group>
          );
        })}
        {end}
      </Stack>
    );
  }

  return (
    <Box pl={44} pr="sm" pb="sm" bg="var(--mantine-color-gray-0)">
      <Table verticalSpacing={6} fz="sm" highlightOnHover={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={70}>{t('odometerLog.columns.date')}</Table.Th>
            <Table.Th>{t('odometerLog.fuel.colContent')}</Table.Th>
            <Table.Th w={110} ta="right">
              {t('odometerLog.fuel.colSpend')}
            </Table.Th>
            <Table.Th w={110} ta="right">
              {t('odometerLog.fuel.colPay')}
            </Table.Th>
            <Table.Th w={110} ta="right">
              {t('odometerLog.fuel.remaining')}
            </Table.Th>
            {canManage && <Table.Th w={40} />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {period.lines.map((line, i) => {
            const isCost = line.kind === 'fuel' || line.kind === 'other';
            return (
              <Table.Tr key={i} bg={payBg(line)}>
                <Table.Td c="gray.7">{dayMonth(line.date)}</Table.Td>
                <Table.Td>
                  <LineWhat line={line} />
                </Table.Td>
                <Table.Td ta="right" style={TABULAR}>
                  {isCost ? formatNumber(line.amount) : ''}
                </Table.Td>
                <Table.Td ta="right" c="primary.8" fw={600} style={TABULAR}>
                  {line.kind === 'payment' ? `−${formatNumber(line.amount)}` : ''}
                </Table.Td>
                <Table.Td ta="right" c="gray.7" style={TABULAR}>
                  {formatNumber(line.balance)}
                </Table.Td>
                {canManage && <Table.Td>{strike(line, 'sm')}</Table.Td>}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      {end}
    </Box>
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
        {/* Always previewable: the tab reads from the floor, which is this
            picker's minDate. */}
        <Text size="sm">
          {t('odometerLog.fuel.resetPreview', {
            before: formatNumber(remainingOf(resets)),
            after: formatNumber(remainingOf(withPendingReset(resets, fromDate, employeeId))),
          })}
        </Text>
      </Stack>
    </ConfirmModal>
  );
}
