import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarStats,
  IconCamera,
  IconCash,
  IconGauge,
  IconList,
  IconPencil,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { EmployeeLink } from '@/components/EmployeeLink';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { Select } from '@mantine/core';
import { DatePickerField } from '@/components/DatePickerField';
import { useDatePresetLabels } from '@/hooks/useDatePresetLabels';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { Employee, OdometerLog } from '@/types';
import { EMPTY_DATE_RANGE, type DateRangePreset, type DateRangeValue } from '@/types/date-range';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import {
  defaultLastNDaysRange,
  ensureValidDateRange,
  getPresetRange,
} from '@/utils/listFilterDateRange';
import { formatNumber } from '@/utils/number';
import { isDriverDepartment, perms } from '@/utils/permission';
import { LogPhotoCell, LogPhotoGalleryModal } from '../operation-logs/OperationLogPhotos';
import type { TFn } from '../operation-logs/operationLogConfig';
import { OdometerCostLines } from './OdometerCostLines';
import { balanceColor } from './balanceColor';
import { OdometerFuelLedger } from './OdometerFuelLedger';
import { OdometerLogModal } from './OdometerLogModal';
import {
  buildDayStatements,
  buildPaybackHistory,
  dayKey,
  dayToDate,
  type DayRange,
  type DayStatement,
} from './fuelLedgerModel';
import { useFuelLedgerData } from './useFuelLedgerData';
import {
  buildComplianceGrid,
  canWriteDate,
  dayGap,
  distanceSincePrevious,
  hasKm,
  isEdited,
  liveLogs,
  otherCostsTotal,
  previousReading,
  readEmployeeId,
  readFuelCost,
  readKm,
  readOtherCosts,
  shiftDate,
  visibleLogPhotos,
} from './odometerLogModel';

const isMobile = device.isMobile;
const RANGE_DAYS = 30;

export function OdometerLogListPage() {
  const { t } = useTranslation();

  const tr = useCallback<TFn>((key, options) => t(key as never, options), [t]);
  const me = useMyEmployee();
  const canViewAll = perms.odometerLog.canViewAll();
  const canEditAny = perms.odometerLog.canEdit();

  const { items, loading, initialized, error, cachedAt, loadAll, forceRefresh } =
    odometerLogBundle.useStore();

  const employees = useEmployeeStore((s) => s.items);
  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);

  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    defaultLastNDaysRange(RANGE_DAYS),
  );
  const [driverFilter, setDriverFilter] = useState('');
  const [galleryLog, setGalleryLog] = useState<OdometerLog | null>(null);
  const [editing, setEditing] = useState<OdometerLog | undefined>();
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [tab, setTab] = useState('compliance');
  const today = todayInVnDateString();

  useEffect(() => {
    if (!initialized && !error) loadAll();
  }, [initialized, error, loadAll]);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);
  useEffect(() => {
    if (error) notifications.show({ color: 'red', message: t('odometerLog.empty') });
  }, [error, t]);

  const applyDateRange = useCallback(
    (next: DateRangeValue) => {
      const effective = ensureValidDateRange(next, defaultLastNDaysRange(RANGE_DAYS));
      setDateRange(effective);

      odometerLogBundle.setRange(effective.from, effective.to);
      forceRefresh();
    },
    [forceRefresh],
  );

  const roster = useMemo<Employee[]>(
    () =>
      employees.filter(
        (e) => e.isActive && !e.extra?.isDeleted && isDriverDepartment(e.department),
      ),
    [employees],
  );

  const ledger = useFuelLedgerData(canViewAll && tab !== 'compliance');
  const dayStatements = useMemo(() => {
    if (!ledger.data) return undefined;
    const histories = buildPaybackHistory({ roster, ...ledger.data, resets: ledger.resets });
    return buildDayStatements(histories, ledger.data.logs);
  }, [roster, ledger.data, ledger.resets]);

  const scoped = useMemo(() => {
    const live = liveLogs(items as OdometerLog[]);
    if (canViewAll) {
      return driverFilter ? live.filter((l) => readEmployeeId(l) === driverFilter) : live;
    }

    return me && perms.odometerLog.canViewSelf()
      ? live.filter((l) => readEmployeeId(l) === me.id)
      : [];
  }, [items, canViewAll, driverFilter, me]);

  const rows = useMemo(
    () => [...scoped].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [scoped],
  );

  const days = useMemo<DayRange>(
    () => ({
      from: dateRange.from ? toDateString(dateRange.from) : today,

      to: dateRange.to && toDateString(dateRange.to) < today ? toDateString(dateRange.to) : today,
    }),
    [dateRange, today],
  );

  const grid = useMemo(
    () =>
      buildComplianceGrid({
        roster: driverFilter ? roster.filter((e) => e.id === driverFilter) : roster,
        logs: scoped,
        ...days,
      }),
    [roster, scoped, days, driverFilter],
  );

  const driverData = useMemo(() => roster.map((e) => ({ value: e.id, label: e.name })), [roster]);

  const showPhoto = (log: OdometerLog) => (
    <LogPhotoCell photos={log.extra?.photos} onOpen={() => setGalleryLog(log)} t={tr} />
  );

  const canEditLog = (log: OdometerLog) =>
    (canEditAny || (!!me && readEmployeeId(log) === me.id)) &&
    canWriteDate(log.recordDate, today, { canEditAny, hasEntry: true });

  const startEdit = (log: OdometerLog) => {
    setEditing(log);
    openEdit();
  };

  const filterRow = (
    <Group gap="sm" wrap="wrap" align="flex-end">
      <DateRangeFilterField
        label={t('odometerLog.columns.date')}
        shown={days}
        today={today}
        onChange={applyDateRange}
      />
      {canViewAll && (
        <Select
          label={t('odometerLog.filters.driver')}
          placeholder={t('odometerLog.filters.driverAll')}
          data={driverData}
          value={driverFilter || null}
          onChange={(v) => setDriverFilter(v ?? '')}
          clearable
          searchable
          w={isMobile ? '100%' : 220}
        />
      )}
    </Group>
  );

  const entriesTab = (
    <Stack gap="xs">
      {canViewAll && rows.length > 0 && (
        <Text size="xs" c="gray.7">
          {t('odometerLog.day.caption')}
        </Text>
      )}
      {rows.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          {t('odometerLog.empty')}
        </Text>
      ) : isMobile ? (
        rows.map((log) => (
          <Card key={log.id} withBorder radius="md" padding="sm">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap">
                {showPhoto(log)}
                <Stack gap={2}>
                  <Group gap={6} wrap="nowrap" align="baseline">
                    {hasKm(log) ? (
                      <Text size="sm" fw={600}>
                        {formatKm(readKm(log))} km
                      </Text>
                    ) : (
                      <KmPendingBadge />
                    )}
                    {/* The card carries the delta too: a driver reading their
                        own history wants the distance, and the desktop table is
                        the only place it existed. */}
                    <DeltaText log={log} logs={scoped} />
                  </Group>
                  <OdometerCostLines log={log} />
                  {canViewAll && (
                    <DayMoneyBlock
                      statement={dayStatements?.get(dayKey(readEmployeeId(log), log.recordDate))}
                    />
                  )}
                  <Group gap={6} wrap="nowrap" align="center">
                    <Text size="xs" c="dimmed">
                      {formatDate(log.recordDate)}
                    </Text>
                    <EditedMark log={log} />
                    {canViewAll && (
                      <DriverName
                        id={readEmployeeId(log)}
                        name={log.extra?.employeeName ?? ''}
                        size="xs"
                      />
                    )}
                  </Group>
                </Stack>
              </Group>
              {canEditLog(log) && (
                <Button size="compact-xs" variant="subtle" onClick={() => startEdit(log)}>
                  <IconPencil size={14} />
                </Button>
              )}
            </Group>
          </Card>
        ))
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            {canViewAll ? (
              <Table.Tr>
                <Table.Th>{t('odometerLog.columns.date')}</Table.Th>
                <Table.Th>{t('odometerLog.columns.driver')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.km')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.totalSpent')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.paid')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.remaining')}</Table.Th>
                <Table.Th>{t('odometerLog.columns.photo')}</Table.Th>
                <Table.Th>{t('odometerLog.columns.note')}</Table.Th>
              </Table.Tr>
            ) : (
              <Table.Tr>
                <Table.Th>{t('odometerLog.columns.date')}</Table.Th>
                {canViewAll && <Table.Th>{t('odometerLog.columns.driver')}</Table.Th>}
                <Table.Th ta="right">{t('odometerLog.columns.km')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.distance')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.fuelCost')}</Table.Th>
                <Table.Th ta="right">{t('odometerLog.columns.otherCosts')}</Table.Th>
                <Table.Th>{t('odometerLog.columns.photo')}</Table.Th>
                <Table.Th>{t('odometerLog.columns.note')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            )}
          </Table.Thead>
          <Table.Tbody>
            {rows.map((log) => {
              const delta = distanceSincePrevious(scoped, log);
              if (canViewAll) {
                return (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        {formatDate(log.recordDate)}
                        <EditedMark log={log} />
                        {canEditLog(log) && (
                          <Button size="compact-xs" variant="subtle" onClick={() => startEdit(log)}>
                            <IconPencil size={14} />
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <DriverName id={readEmployeeId(log)} name={log.extra?.employeeName ?? ''} />
                    </Table.Td>
                    <Table.Td ta="right">
                      <Stack gap={0} align="flex-end">
                        {hasKm(log) ? (
                          <Text size="sm" ff="monospace">
                            {formatKm(readKm(log))}
                          </Text>
                        ) : (
                          <KmPendingBadge />
                        )}
                        <DeltaText log={log} logs={scoped} />
                      </Stack>
                    </Table.Td>
                    <DayMoneyCells
                      statement={dayStatements?.get(dayKey(readEmployeeId(log), log.recordDate))}
                    />
                    <Table.Td>{showPhoto(log)}</Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {log.extra?.note}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              }
              return (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      {formatDate(log.recordDate)}
                      <EditedMark log={log} />
                    </Group>
                  </Table.Td>
                  {canViewAll && (
                    <Table.Td>
                      <DriverName id={readEmployeeId(log)} name={log.extra?.employeeName ?? ''} />
                    </Table.Td>
                  )}
                  <Table.Td ta="right" ff="monospace">
                    {hasKm(log) ? formatKm(readKm(log)) : <KmPendingBadge />}
                  </Table.Td>
                  <Table.Td
                    ta="right"
                    ff="monospace"
                    c={delta != null && delta < 0 ? 'red' : undefined}
                  >
                    {delta == null ? '—' : delta.toLocaleString()}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {formatNumber(readFuelCost(log))}
                  </Table.Td>
                  <Table.Td ta="right">
                    <OtherCostsCell log={log} />
                  </Table.Td>
                  <Table.Td>{showPhoto(log)}</Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {log.extra?.note}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {canEditLog(log) && (
                      <Button size="compact-xs" variant="subtle" onClick={() => startEdit(log)}>
                        <IconPencil size={14} />
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );

  const complianceTab = (
    <Stack gap="xs">
      {roster.length === 0 ? (
        <Alert color="yellow">{t('odometerLog.compliance.noRoster')}</Alert>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ position: 'sticky', left: 0, background: 'inherit' }}>
                  {t('odometerLog.columns.driver')}
                </Table.Th>
                {grid[0]?.cells.map((cell) => (
                  <Table.Th key={cell.date} ta="center" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(cell.date).slice(0, 5)}
                  </Table.Th>
                ))}
                <Table.Th ta="right">{t('odometerLog.compliance.missing')}</Table.Th>
                <Table.Th ta="right" style={{ whiteSpace: 'nowrap' }}>
                  {t('odometerLog.columns.spent')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {grid.map((row) => (
                <Table.Tr key={row.employeeId}>
                  <Table.Td style={{ position: 'sticky', left: 0, background: 'inherit' }}>
                    <DriverName id={row.employeeId} name={row.employeeName} size="xs" />
                  </Table.Td>
                  {row.cells.map((cell) => (
                    <Table.Td key={cell.date} ta="center" px={6}>
                      {cell.log ? (
                        <ReadingCell log={cell.log} logs={scoped} onOpenPhotos={setGalleryLog} />
                      ) : (
                        <Text size="xs" c="dimmed">
                          ·
                        </Text>
                      )}
                    </Table.Td>
                  ))}
                  <Table.Td ta="right">
                    {row.missingCount === 0 ? (
                      <Badge color="teal" variant="light" size="sm">
                        {t('odometerLog.compliance.complete')}
                      </Badge>
                    ) : (
                      <Badge color="orange" variant="light" size="sm">
                        {row.missingCount}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" style={{ whiteSpace: 'nowrap' }}>
                    {row.spentTotal > 0 ? formatNumber(row.spentTotal) : '—'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </Stack>
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      <StickyListChrome>
        <ListPageHeader
          title={canViewAll ? t('odometerLog.title') : t('odometerLog.viewSelf')}
          cachedAt={cachedAt}
          loading={loading}
          onRefresh={forceRefresh}
          icon={
            <ThemeIcon size={38} radius="md" variant="light" color="primary">
              <IconGauge size={20} stroke={1.75} />
            </ThemeIcon>
          }
        />
        {filterRow}
      </StickyListChrome>

      {canViewAll ? (
        <Tabs value={tab} onChange={(v) => setTab(v ?? 'compliance')} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="compliance" leftSection={<IconCalendarStats size={14} />}>
              {t('odometerLog.tabs.compliance')}
            </Tabs.Tab>
            <Tabs.Tab value="entries" leftSection={<IconList size={14} />}>
              {t('odometerLog.tabs.entries')}
            </Tabs.Tab>
            <Tabs.Tab value="fuel" leftSection={<IconCash size={14} />}>
              {t('odometerLog.tabs.fuel')}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="compliance" pt="md">
            {complianceTab}
          </Tabs.Panel>
          <Tabs.Panel value="entries" pt="md">
            {entriesTab}
          </Tabs.Panel>
          <Tabs.Panel value="fuel" pt="md">
            <OdometerFuelLedger
              roster={roster}
              driverFilter={driverFilter}
              range={days}
              ledger={ledger}
            />
          </Tabs.Panel>
        </Tabs>
      ) : (
        entriesTab
      )}

      {loading && !initialized && (
        <Text size="sm" c="dimmed" ta="center">
          …
        </Text>
      )}

      <LogPhotoGalleryModal
        opened={galleryLog !== null}
        onClose={() => setGalleryLog(null)}
        photos={galleryLog?.extra?.photos}
        title={
          galleryLog
            ? `${galleryLog.extra?.employeeName ?? ''} — ${formatDate(galleryLog.recordDate)}`
            : ''
        }
        t={tr}
      />

      {editing && me && (
        <OdometerLogModal
          opened={editOpened}
          onClose={() => {
            closeEdit();
            setEditing(undefined);
          }}
          employee={{
            id: editing.extra.employeeId,
            name: editing.extra.employeeName,
          }}
          existing={editing}
          canEditAny={canEditAny}
          onSaved={() => forceRefresh()}
        />
      )}
    </Stack>
  );
}

function DateRangeFilterField({
  label,
  shown,
  today,
  onChange,
}: {
  readonly label: string;
  readonly shown: DayRange;
  readonly today: string;
  readonly onChange: (range: DateRangeValue) => void;
}) {
  const presetLabels = useDatePresetLabels();
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const presets = useMemo(
    () =>
      Object.entries(presetLabels)
        .filter(([preset]) => preset !== 'custom')
        .map(([preset, presetLabel]) => {
          const range = getPresetRange(preset as DateRangePreset);
          const to = toDateString(range.to);
          return {
            value: [toDateString(range.from), to < today ? to : today] as [string, string],
            label: presetLabel,
          };
        }),
    [presetLabels, today],
  );
  return (
    <DatePickerField
      type="range"
      label={label}
      value={pendingStart ? [pendingStart, null] : [shown.from, shown.to]}
      maxDate={today}
      presets={presets}
      dropdownType={isMobile ? 'modal' : 'popover'}
      w={isMobile ? '100%' : 250}
      onDropdownClose={() => setPendingStart(null)}
      onChange={([from, to]) => {
        if (from && to) {
          setPendingStart(null);
          onChange({ from: dayToDate(from), to: dayToDate(to), preset: 'custom' });
        } else if (from) {
          setPendingStart(from);
        } else {
          setPendingStart(null);
          onChange(EMPTY_DATE_RANGE);
        }
      }}
    />
  );
}

function toDateString(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function ReadingCell({
  log,
  logs,
  onOpenPhotos,
}: {
  readonly log: OdometerLog;
  readonly logs: OdometerLog[];
  readonly onOpenPhotos: (log: OdometerLog) => void;
}) {
  const { t } = useTranslation();
  const km = readKm(log);
  const previous = previousReading(logs, log);
  const delta = distanceSincePrevious(logs, log);
  const span = previous ? dayGap(previous.recordDate, log.recordDate) : 0;
  const hasPhoto = visibleLogPhotos(log.extra?.photos).length > 0;
  const fuelCost = readFuelCost(log);

  const reading = !hasKm(log)
    ? t('odometerLog.compliance.kmPending')
    : previous && delta != null
      ? t('odometerLog.compliance.cellTooltip', {
          km: formatKm(km),
          delta: delta.toLocaleString(),
          date: formatDate(previous.recordDate),
        })
      : t('odometerLog.compliance.cellTooltipFirst', { km: formatKm(km) });
  const tooltip = [
    reading,
    fuelCost !== undefined && t('odometerLog.home.fuelCost', { amount: formatNumber(fuelCost) }),
    ...readOtherCosts(log).map((line) =>
      t('odometerLog.home.otherCost', {
        content: line.content || t('odometerLog.home.otherCostUnnamed'),
        amount: formatNumber(line.amount),
      }),
    ),
    isEdited(log) && t('odometerLog.detail.updatedAt', { at: formatDateTime(log.updatedAt) }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Stack
      title={tooltip}
      gap={0}
      align="center"
      style={{ cursor: hasPhoto ? 'pointer' : 'default' }}
      onClick={() => hasPhoto && onOpenPhotos(log)}
    >
      {/* Photos without their km: the day still counts missing, and the
          camera says what is there instead. */}
      {hasKm(log) ? (
        <Text size="xs" fw={600} ff="monospace" style={{ whiteSpace: 'nowrap' }}>
          {formatKm(km)}
          {isEdited(log) ? '*' : ''}
        </Text>
      ) : (
        <IconCamera size={14} color="var(--mantine-color-orange-6)" />
      )}
      {delta != null && (
        <Text
          size="10px"
          ff="monospace"
          c={delta < 0 ? 'red' : 'dimmed'}
          style={{ whiteSpace: 'nowrap' }}
        >
          {span > 1 ? '~' : ''}
          {delta > 0 ? '+' : ''}
          {delta.toLocaleString()}
        </Text>
      )}
    </Stack>
  );
}

const dayMonth = (day: string) => formatDate(day).slice(0, 5);

function ClosedMark({ statement }: { readonly statement: DayStatement }) {
  const { t } = useTranslation();
  if (!statement.closed) return null;
  return (
    <Badge size="xs" variant="light" color="gray" style={{ textTransform: 'none' }}>
      {t('odometerLog.fuel.clearMarker', {
        date: dayMonth(shiftDate(statement.closed.nextFrom, -1)),
      })}
    </Badge>
  );
}

function SpentParts({ statement }: { readonly statement: DayStatement }) {
  const { t } = useTranslation();
  const parts = [
    statement.fuel !== 0 && t('odometerLog.day.fuelPart', { amount: formatNumber(statement.fuel) }),
    statement.other !== 0 &&
      t('odometerLog.day.otherPart', { amount: formatNumber(statement.other) }),
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <Text size="xs" c="dimmed" ta="right">
      {parts.join(' · ')}
    </Text>
  );
}

function PaidText({ statement }: { readonly statement: DayStatement }) {
  const { t } = useTranslation();
  return (
    <>
      <Text size="sm" ff="monospace">
        {formatNumber(statement.paid)}
      </Text>
      {statement.paidThrough && (
        <Text size="xs" c="dimmed">
          {t('odometerLog.fuel.paidThroughShort', { date: dayMonth(statement.paidThrough) })}
        </Text>
      )}
    </>
  );
}

function DayMoneyCells({ statement }: { readonly statement?: DayStatement }) {
  if (!statement) {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <Table.Td key={i} ta="right" c="dimmed">
            —
          </Table.Td>
        ))}
      </>
    );
  }
  return (
    <>
      <Table.Td ta="right">
        {statement.spent !== 0 ? (
          <Stack gap={0} align="flex-end">
            <Text size="sm" ff="monospace">
              {formatNumber(statement.spent)}
            </Text>
            <SpentParts statement={statement} />
          </Stack>
        ) : (
          '—'
        )}
      </Table.Td>
      <Table.Td ta="right">
        {statement.paid !== 0 ? (
          <Stack gap={0} align="flex-end">
            <PaidText statement={statement} />
          </Stack>
        ) : (
          '—'
        )}
      </Table.Td>
      <Table.Td ta="right">
        <Stack gap={2} align="flex-end">
          <Text
            size="sm"
            fw={600}
            ff="monospace"
            c={balanceColor(statement.balance)}
            data-testid="odometer-day-balance"
          >
            {formatNumber(statement.balance)}
          </Text>
          <ClosedMark statement={statement} />
        </Stack>
      </Table.Td>
    </>
  );
}

function DayMoneyBlock({ statement }: { readonly statement?: DayStatement }) {
  const { t } = useTranslation();
  if (!statement) return null;
  return (
    <Stack gap={2} pt={4}>
      {statement.spent !== 0 && (
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed">
            {t('odometerLog.columns.totalSpent')}
          </Text>
          <Text size="xs" ff="monospace">
            {formatNumber(statement.spent)}
          </Text>
        </Group>
      )}
      {statement.paid !== 0 && (
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed">
            {t('odometerLog.columns.paid')}
          </Text>
          <PaidText statement={statement} />
        </Group>
      )}
      <Group gap={6} wrap="nowrap">
        <Text size="xs" c="dimmed">
          {t('odometerLog.columns.remaining')}
        </Text>
        <Text size="sm" fw={600} ff="monospace" c={balanceColor(statement.balance)}>
          {formatNumber(statement.balance)}
        </Text>
      </Group>
      <ClosedMark statement={statement} />
    </Stack>
  );
}

function KmPendingBadge() {
  const { t } = useTranslation();
  return (
    <Badge size="xs" variant="light" color="orange">
      {t('odometerLog.detail.kmPending')}
    </Badge>
  );
}

function OtherCostsCell({ log }: { readonly log: OdometerLog }) {
  const { t } = useTranslation();
  const lines = readOtherCosts(log);
  if (lines.length === 0) return null;
  return (
    <Stack gap={0} align="flex-end">
      <Text size="sm" ff="monospace">
        {formatNumber(otherCostsTotal(log))}
      </Text>
      <Text size="xs" c="dimmed" ta="right" lineClamp={2}>
        {lines.map((line) => line.content || t('odometerLog.home.otherCostUnnamed')).join(', ')}
      </Text>
    </Stack>
  );
}

function EditedMark({ log }: { readonly log: OdometerLog }) {
  const { t } = useTranslation();
  if (!isEdited(log)) return null;
  return (
    <Badge
      size="xs"
      variant="light"
      color="gray"
      title={t('odometerLog.detail.updatedAt', { at: formatDateTime(log.updatedAt) })}
    >
      {t('odometerLog.detail.edited')}
    </Badge>
  );
}

function DeltaText({ log, logs }: { readonly log: OdometerLog; readonly logs: OdometerLog[] }) {
  const previous = previousReading(logs, log);
  const delta = distanceSincePrevious(logs, log);
  if (!previous || delta == null) return null;
  const span = dayGap(previous.recordDate, log.recordDate);
  return (
    <Text size="xs" ff="monospace" c={delta < 0 ? 'red' : 'dimmed'}>
      {span > 1 ? '~' : ''}
      {delta > 0 ? '+' : ''}
      {delta.toLocaleString()} km
    </Text>
  );
}

function DriverName({
  id,
  name,
  size = 'sm',
}: {
  readonly id: string;
  readonly name: string;
  readonly size?: 'xs' | 'sm';
}) {
  if (!perms.employee.canView()) {
    return (
      <Text size={size} style={{ whiteSpace: 'nowrap' }}>
        {name}
      </Text>
    );
  }
  return <EmployeeLink id={id} fallbackLabel={name} size={size} />;
}

function formatKm(km: number | undefined): string {
  return km === undefined ? '—' : km.toLocaleString();
}
