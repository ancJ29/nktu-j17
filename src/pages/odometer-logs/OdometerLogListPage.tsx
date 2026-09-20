import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Image,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCalendarStats, IconGauge, IconList, IconPencil } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { ImageZoomModal } from '@/components/ImageZoomModal';
import { ListPageHeader } from '@/components/ListPageHeader';
import { StickyListChrome } from '@/components/StickyListChrome';
import { Select } from '@mantine/core';
import { DateField } from '@/components/DateField';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { Employee, OdometerLog } from '@/types';
import type { DateRangeValue } from '@/types/date-range';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { isDriverDepartment, perms } from '@/utils/permission';
import { OdometerLogModal } from './OdometerLogModal';
import {
  buildComplianceGrid,
  canWriteDate,
  distanceSincePrevious,
  liveLogs,
  visibleLogPhotos,
} from './odometerLogModel';

const isMobile = device.isMobile;
const RANGE_DAYS = 30;

export function OdometerLogListPage() {
  const { t } = useTranslation();
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
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomOpened, { open: openZoom, close: closeZoom }] = useDisclosure(false);
  const [editing, setEditing] = useState<OdometerLog | undefined>();
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
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
      const effective = next.from && next.to ? next : defaultLastNDaysRange(RANGE_DAYS);
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

  const scoped = useMemo(() => {
    const live = liveLogs(items as OdometerLog[]);
    if (canViewAll) {
      return driverFilter ? live.filter((l) => l.extra.employeeId === driverFilter) : live;
    }

    return me && perms.odometerLog.canViewSelf()
      ? live.filter((l) => l.extra.employeeId === me.id)
      : [];
  }, [items, canViewAll, driverFilter, me]);

  const rows = useMemo(
    () => [...scoped].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [scoped],
  );

  const grid = useMemo(
    () =>
      buildComplianceGrid({
        roster: driverFilter ? roster.filter((e) => e.id === driverFilter) : roster,
        logs: scoped,
        from: dateRange.from ? toDateString(dateRange.from) : today,
        to: dateRange.to ? toDateString(dateRange.to) : today,
      }),
    [roster, scoped, dateRange, driverFilter, today],
  );

  const driverData = useMemo(() => roster.map((e) => ({ value: e.id, label: e.name })), [roster]);

  const showPhoto = (log: OdometerLog) => {
    const photo = visibleLogPhotos(log.extra.photos)[0];
    if (!photo) return null;
    return (
      <Image
        src={photo.url}
        w={40}
        h={40}
        fit="cover"
        radius="sm"
        style={{ cursor: 'pointer' }}
        fallbackSrc="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
        onClick={() => {
          setZoomUrl(photo.url);
          openZoom();
        }}
      />
    );
  };

  const canEditLog = (log: OdometerLog) =>
    (canEditAny || (!!me && log.extra.employeeId === me.id)) &&
    canWriteDate(log.recordDate, today, { canEditAny });

  const startEdit = (log: OdometerLog) => {
    setEditing(log);
    openEdit();
  };

  const filterRow = (
    <Group gap="sm" wrap="wrap">
      <DateField
        label={t('odometerLog.columns.date')}
        value={dateRange.from}
        clearable={false}
        maxDate={new Date()}
        w={isMobile ? '45%' : 170}
        onChange={(value) => applyDateRange({ ...dateRange, from: toDate(value) })}
      />
      <DateField
        label=" "
        value={dateRange.to}
        clearable={false}
        maxDate={new Date()}
        w={isMobile ? '45%' : 170}
        onChange={(value) => applyDateRange({ ...dateRange, to: toDate(value) })}
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
                  <Text size="sm" fw={600}>
                    {log.extra.km.toLocaleString()} km
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDate(log.recordDate)}
                    {canViewAll ? ` · ${log.extra.employeeName}` : ''}
                  </Text>
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
            <Table.Tr>
              <Table.Th>{t('odometerLog.columns.date')}</Table.Th>
              {canViewAll && <Table.Th>{t('odometerLog.columns.driver')}</Table.Th>}
              <Table.Th ta="right">{t('odometerLog.columns.km')}</Table.Th>
              <Table.Th ta="right">{t('odometerLog.columns.distance')}</Table.Th>
              <Table.Th>{t('odometerLog.columns.photo')}</Table.Th>
              <Table.Th>{t('odometerLog.columns.note')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((log) => {
              const delta = distanceSincePrevious(scoped, log);
              return (
                <Table.Tr key={log.id}>
                  <Table.Td>{formatDate(log.recordDate)}</Table.Td>
                  {canViewAll && <Table.Td>{log.extra.employeeName}</Table.Td>}
                  <Table.Td ta="right" ff="monospace">
                    {log.extra.km.toLocaleString()}
                  </Table.Td>
                  <Table.Td
                    ta="right"
                    ff="monospace"
                    c={delta != null && delta < 0 ? 'red' : undefined}
                  >
                    {delta == null ? '—' : delta.toLocaleString()}
                  </Table.Td>
                  <Table.Td>{showPhoto(log)}</Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {log.extra.note}
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
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {grid.map((row) => (
                <Table.Tr key={row.employeeId}>
                  <Table.Td style={{ position: 'sticky', left: 0, background: 'inherit' }}>
                    {row.employeeName}
                  </Table.Td>
                  {row.cells.map((cell) => (
                    <Table.Td key={cell.date} ta="center">
                      {cell.log ? (
                        <Tooltip label={`${cell.log.extra.km.toLocaleString()} km`} withArrow>
                          <Text
                            size="xs"
                            c="teal"
                            fw={600}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const photo = visibleLogPhotos(cell.log?.extra.photos)[0];
                              if (!photo) return;
                              setZoomUrl(photo.url);
                              openZoom();
                            }}
                          >
                            ✓
                          </Text>
                        </Tooltip>
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
        <Tabs defaultValue="compliance" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="compliance" leftSection={<IconCalendarStats size={14} />}>
              {t('odometerLog.tabs.compliance')}
            </Tabs.Tab>
            <Tabs.Tab value="entries" leftSection={<IconList size={14} />}>
              {t('odometerLog.tabs.entries')}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="compliance" pt="md">
            {complianceTab}
          </Tabs.Panel>
          <Tabs.Panel value="entries" pt="md">
            {entriesTab}
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

      <ImageZoomModal opened={zoomOpened} onClose={closeZoom} imageUrl={zoomUrl ?? ''} />

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

function toDate(value: string | Date | null): Date | null {
  if (!value) return null;
  return typeof value === 'string' ? new Date(value) : value;
}

function toDateString(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
