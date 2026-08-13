import type { ReactNode } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconGasStation, IconPlus, IconRoad, IconTool, IconTrash } from '@tabler/icons-react';
import { DatePickerField } from '@/components/DatePickerField';
import { TransportOrderLink } from '@/components/TransportOrderLink';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { formatNumber, LITRE_DECIMAL_SCALE } from '@/utils/number';
import { computeRefuelTotals, formatConsumption, refuelConsumption } from '@/utils/refuelStats';
import type { MaintenanceItem, MaintenanceLogExtra, RefuelLogExtra, TripLogExtra } from '@/types';
import {
  datePart,
  todayString,
  type LogFormLine,
  type LogFormValue,
  type LogFormValues,
  type OperationLogConfig,
  type TFn,
} from '@/pages/operation-logs/operationLogConfig';
import {
  itemQuantity,
  maintenanceItemsTotal,
  maintenanceLineTotal,
  maintenanceOutstanding,
  maintenanceVat,
  maintenanceVatAmount,
  readMaintenanceItems,
  warrantyExpiry,
} from './maintenanceItems';
import { exportMaintenanceLogsToExcel, exportRefuelLogsToExcel } from '@/utils/excelParser';
import { syncTankIssue } from '@/pages/oil-tanks/tankIssueSync';
import { issueExceedsStock } from '@/pages/oil-tanks/oilTankBalance';
import { LogDriverField } from './LogDriverField';
import { ContainerSizeCell } from './ContainerSizeCell';
import { FuelSourceCell } from './FuelSourceCell';
import { WarrantySummaryCell } from './WarrantySummaryCell';

function textCell(value: string | undefined) {
  return value ? (
    <Text size="sm">{value}</Text>
  ) : (
    <Text size="sm" c="dimmed">
      —
    </Text>
  );
}

function noteCell(note: string | undefined) {
  return (
    <Text size="sm" c={note ? undefined : 'dimmed'} lineClamp={2}>
      {note || '—'}
    </Text>
  );
}

const ABNORMAL_FACTOR = 1.2;

function summaryStat(label: string, value: string) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Stack>
  );
}

function dateColumn(headerKey: string): OperationLogConfig['columns'][number] {
  return {
    header: headerKey,
    nowrap: true,
    render: (log) => formatDate(log.logDate),
  };
}

export const REFUEL_LOG_CONFIG: OperationLogConfig = {
  logType: 'refuel',
  icon: <IconGasStation size={14} />,
  titleKey: 'operationLogs.refuel.sectionTitle',
  addLabelKey: 'operationLogs.addItem',
  addTitleKey: 'operationLogs.refuel.addItem',
  editTitleKey: 'operationLogs.refuel.editItem',
  emptyKey: 'operationLogs.refuel.empty',
  emptyForm: {
    logDate: todayString(),
    litres: '',
    unitPrice: '',
    totalAmount: '',
    odometerBefore: '',
    odometer: '',
    distanceKm: '',
    driverName: '',
    driverId: '',

    fuelSource: '',
    oilTankId: '',
    oilTankCode: '',
    note: '',
  },
  columns: [
    dateColumn('operationLogs.refuel.columns.date'),
    {
      header: 'operationLogs.refuel.columns.litres',
      align: 'right',
      render: (log) => formatNumber(log.extra?.litres),
    },
    {
      header: 'operationLogs.refuel.columns.unitPrice',
      align: 'right',
      render: (log) => formatNumber(log.extra?.unitPrice),
    },
    {
      header: 'operationLogs.refuel.columns.total',
      align: 'right',
      emphasize: true,
      render: (log) => formatNumber(log.extra?.totalAmount),
    },
    {
      header: 'operationLogs.refuel.columns.source',
      render: (log) => <FuelSourceCell extra={log.extra as RefuelLogExtra | undefined} />,
    },
    {
      header: 'operationLogs.refuel.columns.odometerOld',
      align: 'right',
      render: (log) => formatNumber(log.extra?.odometerBefore),
    },
    {
      header: 'operationLogs.refuel.columns.odometerNew',
      align: 'right',
      render: (log) => formatNumber(log.extra?.odometer),
    },
    {
      header: 'operationLogs.refuel.columns.distance',
      align: 'right',
      render: (log) => formatNumber(log.extra?.distanceKm),
    },
    {
      header: 'operationLogs.refuel.columns.consumption',
      align: 'right',
      render: (log) => {
        const c = refuelConsumption(log);
        return c == null ? '—' : formatConsumption(c);
      },
    },
    {
      header: 'operationLogs.refuel.columns.driver',
      render: (log) => textCell(log.extra?.driverName),
    },
    { header: '__new__.01-common.labels.note', render: (log) => noteCell(log.extra?.note) },
  ],

  entityFilter: {
    labelKey: 'operationLogs.refuel.columns.driver',
    valueOf: (log) => log.extra?.driverName,
  },
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
    litres: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.litresInvalid'),
    unitPrice: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.unitPriceInvalid'),

    oilTankId: (v, values) =>
      values.fuelSource !== 'tank' || String(v ?? '').trim()
        ? null
        : t('operationLogs.refuel.validation.tankRequired'),
  }),

  validateOnSubmit: ({ values, previous, context, t }) => {
    if (values.fuelSource !== 'tank') return null;
    const tankId = String(values.oilTankId ?? '').trim();
    const tank = context?.oilTankOptions?.find((o) => o.value === tankId);

    if (!tank) return null;
    const prev = previous?.extra;
    const sameTank = prev?.fuelSource === 'tank' && prev?.oilTankId === tankId;
    const { refused, available } = issueExceedsStock({
      litres: values.litres,
      currentLevel: tank.currentLevel,
      previousLitres: sameTank ? Number(prev?.litres) || 0 : 0,
    });
    if (!refused) return null;
    return {
      litres: t('oilTanks.logs.validation.exceedsStock', {
        available: formatNumber(available ?? 0),
      }),
    };
  },
  buildExtra: (values): Partial<RefuelLogExtra> => ({
    ...(values.litres !== '' && { litres: Number(values.litres) }),
    ...(values.unitPrice !== '' && { unitPrice: Number(values.unitPrice) }),
    ...(values.totalAmount !== '' && { totalAmount: Number(values.totalAmount) }),
    ...(values.odometerBefore !== '' && { odometerBefore: Number(values.odometerBefore) }),
    ...(values.odometer !== '' && { odometer: Number(values.odometer) }),
    ...(values.distanceKm !== '' && { distanceKm: Number(values.distanceKm) }),
    ...(String(values.driverName).trim() && { driverName: String(values.driverName).trim() }),
    ...(String(values.driverId).trim() && { driverId: String(values.driverId).trim() }),

    ...(values.fuelSource === 'tank' && String(values.oilTankId).trim()
      ? {
          fuelSource: 'tank' as const,
          oilTankId: String(values.oilTankId).trim(),
          ...(String(values.oilTankCode).trim() && {
            oilTankCode: String(values.oilTankCode).trim(),
          }),
        }
      : {}),
    ...(String(values.note).trim() && { note: String(values.note).trim() }),
  }),
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    return {
      logDate: datePart(log.logDate),
      litres: e.litres ?? '',
      unitPrice: e.unitPrice ?? '',
      totalAmount: e.totalAmount ?? '',
      odometerBefore: e.odometerBefore ?? '',
      odometer: e.odometer ?? '',
      distanceKm: e.distanceKm ?? '',
      driverName: e.driverName ?? '',
      driverId: e.driverId ?? '',
      fuelSource: e.fuelSource === 'tank' ? 'tank' : '',
      oilTankId: e.oilTankId ?? '',
      oilTankCode: e.oilTankCode ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t, ctx) => {
    const tankOptions = ctx?.oilTankOptions ?? [];

    const syncTotal = (litres: LogFormValue, unitPrice: LogFormValue) => {
      const lit = Number(litres);
      const price = Number(unitPrice);
      if (litres !== '' && unitPrice !== '' && lit >= 0 && price >= 0) {
        form.setFieldValue('totalAmount', Math.round(lit * price));
      }
    };

    const syncDistance = (before: LogFormValue, after: LogFormValue) => {
      const b = Number(before);
      const a = Number(after);
      if (before !== '' && after !== '' && a >= b) {
        form.setFieldValue('distanceKm', a - b);
      } else {
        form.setFieldValue('distanceKm', '');
      }
    };
    return (
      <>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <DatePickerField
            label={t('operationLogs.refuel.columns.date')}
            withAsterisk
            clearable={false}
            {...form.getInputProps('logDate')}
            value={String(form.values.logDate)}
          />
          <LogDriverField
            form={form}
            t={t}
            label={t('operationLogs.refuel.columns.driver')}
            assignedDriver={ctx?.assignedDriver}
          />
        </SimpleGrid>
        {/* Self-gating: the picker renders when the host says tanks are usable
            OR when this entry is already bound to one. The second half is what
            keeps a tank-sourced entry editable (and visibly so) by someone whose
            permissions or feature flag would otherwise hide the control — the
            values round-trip either way, but silently is the wrong way. */}
        {(tankOptions.length > 0 || form.values.fuelSource === 'tank') && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label={t('operationLogs.refuel.columns.source')}
              data={[
                { value: 'external', label: t('operationLogs.refuel.source.external') },
                { value: 'tank', label: t('operationLogs.refuel.source.tank') },
              ]}
              allowDeselect={false}
              value={form.values.fuelSource === 'tank' ? 'tank' : 'external'}
              onChange={(v) => {
                form.setFieldValue('fuelSource', v === 'tank' ? 'tank' : '');

                if (v !== 'tank') {
                  form.setFieldValue('oilTankId', '');
                  form.setFieldValue('oilTankCode', '');
                }
              }}
            />
            {form.values.fuelSource === 'tank' && (
              <Select
                label={t('operationLogs.refuel.form.tankLabel')}
                placeholder={t('operationLogs.refuel.form.tankPlaceholder')}
                data={tankOptions}
                searchable
                allowDeselect={false}
                value={String(form.values.oilTankId) || null}
                onChange={(v) => {
                  form.setFieldValue('oilTankId', v ?? '');

                  form.setFieldValue(
                    'oilTankCode',
                    tankOptions.find((o) => o.value === v)?.code ?? '',
                  );
                }}
              />
            )}
          </SimpleGrid>
        )}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <NumberInput
            label={t('operationLogs.refuel.columns.litres')}
            min={0}
            decimalScale={LITRE_DECIMAL_SCALE}
            thousandSeparator=","
            suffix=" L"
            {...form.getInputProps('litres')}
            onChange={(v) => {
              form.setFieldValue('litres', v);
              syncTotal(v, form.values.unitPrice);
            }}
          />
          <NumberInput
            label={t('operationLogs.refuel.columns.unitPrice')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('unitPrice')}
            onChange={(v) => {
              form.setFieldValue('unitPrice', v);
              syncTotal(form.values.litres, v);
            }}
          />
          <NumberInput
            label={t('operationLogs.refuel.columns.total')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('totalAmount')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <NumberInput
            label={t('operationLogs.refuel.columns.odometerOld')}
            min={0}
            thousandSeparator=","
            suffix=" km"
            {...form.getInputProps('odometerBefore')}
            onChange={(v) => {
              form.setFieldValue('odometerBefore', v);
              syncDistance(v, form.values.odometer);
            }}
          />
          <NumberInput
            label={t('operationLogs.refuel.columns.odometerNew')}
            min={0}
            thousandSeparator=","
            suffix=" km"
            {...form.getInputProps('odometer')}
            onChange={(v) => {
              form.setFieldValue('odometer', v);
              syncDistance(form.values.odometerBefore, v);
            }}
          />
          <NumberInput
            label={t('operationLogs.refuel.columns.distance')}
            variant="filled"
            readOnly
            thousandSeparator=","
            suffix=" km"
            {...form.getInputProps('distanceKm')}
          />
        </SimpleGrid>
        <Textarea
          label={t('__new__.01-common.labels.note')}
          placeholder={t('operationLogs.refuel.form.notePlaceholder')}
          autosize
          minRows={2}
          maxRows={5}
          {...form.getInputProps('note')}
        />
      </>
    );
  },
  summary: (logs, t) => {
    const { litres, cost, distance, avgConsumption } = computeRefuelTotals(logs);
    return (
      <Card withBorder radius="md" padding="sm" mt="xs" bg="var(--mantine-color-default-hover)">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {summaryStat(t('operationLogs.refuel.summary.totalLitres'), `${formatNumber(litres)} L`)}
          {summaryStat(t('operationLogs.refuel.summary.totalCost'), `${formatNumber(cost)} ₫`)}
          {summaryStat(
            t('operationLogs.refuel.summary.totalDistance'),
            `${formatNumber(distance)} km`,
          )}
          {summaryStat(
            t('operationLogs.refuel.summary.avgConsumption'),
            avgConsumption == null ? '—' : `${formatConsumption(avgConsumption)} L/100km`,
          )}
        </SimpleGrid>
      </Card>
    );
  },

  rowTone: (log, visibleLogs) => {
    const c = refuelConsumption(log);
    if (c == null) return undefined;
    const { avgConsumption } = computeRefuelTotals(visibleLogs);
    if (avgConsumption == null || avgConsumption <= 0) return undefined;
    return c > avgConsumption * ABNORMAL_FACTOR
      ? { danger: true, tooltipKey: 'operationLogs.refuel.abnormalTooltip' }
      : undefined;
  },

  photos: { directoryType: 'truck-refuel-log', labelKey: 'operationLogs.refuel.columns.photos' },

  rowLocked: (log) => Boolean(log.extra?.sourceIssueLogId),

  afterWrite: syncTankIssue,
  afterWriteErrorKey: 'operationLogs.refuel.notifications.tankSyncError',
  export: (logs, meta) => {
    const periodLabel = meta.monthLabel ? `${meta.monthLabel} ${meta.year}` : String(meta.year);
    const fileTag =
      meta.month === 'all' ? String(meta.year) : `${meta.year}-${meta.month.padStart(2, '0')}`;
    exportRefuelLogsToExcel(logs, {
      language: meta.language,
      vehicleLabel: meta.targetCode,
      periodLabel,
      fileTag,
    });
  },
};

function monthsLabel(t: TFn, months: number): string {
  return t('operationLogs.maintenance.months', { count: months });
}

const MAINTENANCE_DEFAULT_VAT_PERCENT = 8;

function blankMaintenanceItem(): LogFormLine {
  return { name: '', unitPrice: '', quantity: 1, warrantyMonths: '' };
}

function itemRows(form: UseFormReturnType<LogFormValues>): LogFormLine[] {
  return (Array.isArray(form.values.items) ? form.values.items : []) as LogFormLine[];
}

function draftLineTotal(row: LogFormLine): number {
  const qty = Number(row.quantity);
  return (Number(row.unitPrice) || 0) * (Number.isFinite(qty) && qty > 0 ? qty : 1);
}

function draftItemsTotal(rows: LogFormLine[]): number {
  return rows.reduce((sum, r) => sum + draftLineTotal(r), 0);
}

function detailStat(label: string, value: ReactNode) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </Stack>
  );
}

export const MAINTENANCE_LOG_CONFIG: OperationLogConfig = {
  logType: 'maintenance',
  icon: <IconTool size={14} />,
  titleKey: 'operationLogs.maintenance.sectionTitle',
  addLabelKey: 'operationLogs.maintenance.addItem',
  addTitleKey: 'operationLogs.maintenance.addItem',
  editTitleKey: 'operationLogs.maintenance.editItem',
  emptyKey: 'operationLogs.maintenance.empty',

  modalSize: 'xl',
  emptyForm: {
    logDate: todayString(),
    maintenanceType: '',
    maintenanceTypeLabel: '',
    supplier: '',
    condition: '',
    odometer: '',
    laborCost: '',

    vatPercent: '',
    accountsReceived: '',
    note: '',

    items: [blankMaintenanceItem()],
  },

  columns: [
    dateColumn('operationLogs.maintenance.columns.date'),
    {
      header: 'operationLogs.maintenance.columns.type',

      render: (log) => textCell(log.extra?.maintenanceTypeLabel ?? log.extra?.maintenanceType),
    },
    {
      header: 'operationLogs.maintenance.columns.supplier',
      render: (log) => textCell(log.extra?.supplier),
    },
    {
      header: 'operationLogs.maintenance.columns.warranty',
      render: (log) => <WarrantySummaryCell extra={log.extra as MaintenanceLogExtra | undefined} />,
    },
    {
      header: 'operationLogs.maintenance.columns.total',
      align: 'right',
      emphasize: true,

      render: (log) => formatNumber(log.extra?.grandTotal ?? log.extra?.cost),

      sortField: 'total',
      sortValue: (log) => Number(log.extra?.grandTotal ?? log.extra?.cost) || 0,
    },
    {
      header: 'operationLogs.maintenance.columns.outstanding',
      align: 'right',
      emphasize: true,
      render: (log) => formatNumber(maintenanceOutstanding(log.extra)),
      sortField: 'outstanding',
      sortValue: (log) => maintenanceOutstanding(log.extra) ?? 0,
    },
  ],

  quickFilters: {
    options: [
      { value: 'all', labelKey: 'operationLogs.maintenance.filters.all' },
      {
        value: 'unpaid',
        labelKey: 'operationLogs.maintenance.filters.unpaid',
        match: (log) => (maintenanceOutstanding(log.extra) ?? 0) > 0,
      },
      {
        value: 'settled',
        labelKey: 'operationLogs.maintenance.filters.settled',
        match: (log) => {
          const outstanding = maintenanceOutstanding(log.extra);
          return outstanding != null && outstanding <= 0;
        },
      },
    ],
  },
  entityFilter: {
    labelKey: 'operationLogs.maintenance.columns.supplier',
    valueOf: (log) => log.extra?.supplier,
  },
  export: (logs, meta) => {
    const periodLabel = meta.monthLabel ? `${meta.monthLabel} ${meta.year}` : String(meta.year);
    exportMaintenanceLogsToExcel(logs, {
      language: meta.language,
      periodLabel,
      fileTag:
        meta.month === 'all' ? String(meta.year) : `${meta.year}-${meta.month.padStart(2, '0')}`,
      vehicleLabel: meta.targetCode,
    });
  },
  exportLabelKey: 'operationLogs.exportExcel',

  photos: {
    directoryType: 'truck-maintenance-log',
    labelKey: 'operationLogs.maintenance.columns.photos',
  },
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
  }),
  buildExtra: (values): Partial<MaintenanceLogExtra> => {
    const items: MaintenanceItem[] = (Array.isArray(values.items) ? values.items : [])
      .map((r) => r as LogFormLine)
      .filter((r) => String(r.name).trim() !== '' || r.unitPrice !== '')
      .map((r) => ({
        name: String(r.name).trim(),
        unitPrice: r.unitPrice === '' ? 0 : Number(r.unitPrice),

        ...(r.quantity !== '' && Number(r.quantity) > 1 && { quantity: Number(r.quantity) }),
        ...(r.warrantyMonths !== '' &&
          Number(r.warrantyMonths) > 0 && { warrantyMonths: Number(r.warrantyMonths) }),
      }));

    const totalAmount = maintenanceItemsTotal(items);
    const laborCost = values.laborCost === '' ? 0 : Number(values.laborCost);

    const vatRate = values.vatPercent === '' ? 0 : Number(values.vatPercent) / 100;
    const vatAmount = maintenanceVatAmount(totalAmount + laborCost, vatRate);
    return {
      ...(String(values.maintenanceType).trim() && {
        maintenanceType: String(values.maintenanceType).trim(),

        ...(String(values.maintenanceTypeLabel).trim() && {
          maintenanceTypeLabel: String(values.maintenanceTypeLabel).trim(),
        }),
      }),
      ...(String(values.supplier).trim() && { supplier: String(values.supplier).trim() }),
      ...(items.length > 0 && { items }),
      ...(String(values.condition).trim() && { condition: String(values.condition).trim() }),
      ...(values.odometer !== '' && { odometer: Number(values.odometer) }),
      totalAmount,
      ...(values.laborCost !== '' && { laborCost }),
      ...(vatRate > 0 && { vatRate }),
      grandTotal: totalAmount + laborCost + vatAmount,
      ...(values.accountsReceived !== '' && { accountsReceived: Number(values.accountsReceived) }),
      ...(String(values.note).trim() && { note: String(values.note).trim() }),
    };
  },
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    const items = readMaintenanceItems(e).map<LogFormLine>((it) => ({
      name: it.name,
      unitPrice: it.unitPrice,
      quantity: itemQuantity(it),
      warrantyMonths: it.warrantyMonths ?? '',
    }));
    return {
      logDate: datePart(log.logDate),
      maintenanceType: e.maintenanceType ?? '',
      maintenanceTypeLabel: e.maintenanceTypeLabel ?? '',
      supplier: e.supplier ?? '',
      condition: e.condition ?? '',
      odometer: e.odometer ?? '',
      laborCost: e.laborCost ?? '',

      vatPercent: e.vatRate ? e.vatRate * 100 : '',
      accountsReceived: e.accountsReceived ?? '',
      note: e.note ?? '',

      items: items.length > 0 ? items : [blankMaintenanceItem()],
    };
  },
  renderFields: (form, t, ctx) => {
    const rows = itemRows(form);
    const totalAmount = draftItemsTotal(rows);
    const laborCost = form.values.laborCost === '' ? 0 : Number(form.values.laborCost);

    const vatOn = form.values.vatPercent !== '';
    const vatAmount = maintenanceVatAmount(
      totalAmount + laborCost,
      vatOn ? Number(form.values.vatPercent) / 100 : 0,
    );
    const grandTotal = totalAmount + laborCost + vatAmount;
    const outstanding =
      grandTotal - (form.values.accountsReceived === '' ? 0 : Number(form.values.accountsReceived));

    const typeOptions = ctx?.maintenanceTypeOptions ?? [];
    const currentType = String(form.values.maintenanceType);
    const typeData =
      currentType && !typeOptions.some((o) => o.value === currentType)
        ? [
            ...typeOptions,
            { value: currentType, label: String(form.values.maintenanceTypeLabel) || currentType },
          ]
        : typeOptions;
    return (
      <>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <DatePickerField
            label={t('operationLogs.maintenance.columns.date')}
            withAsterisk
            clearable={false}
            {...form.getInputProps('logDate')}
            value={String(form.values.logDate)}
          />
          <Select
            label={t('operationLogs.maintenance.columns.type')}
            placeholder={t('operationLogs.maintenance.form.typePlaceholder')}
            data={typeData}
            value={currentType || null}
            onChange={(v) => {
              form.setFieldValue('maintenanceType', v ?? '');
              form.setFieldValue(
                'maintenanceTypeLabel',
                typeData.find((o) => o.value === v)?.label ?? '',
              );
            }}
            searchable
            clearable
          />
          <TextInput
            label={t('operationLogs.maintenance.columns.supplier')}
            placeholder={t('operationLogs.maintenance.form.supplierPlaceholder')}
            {...form.getInputProps('supplier')}
          />
        </SimpleGrid>
        {/* Hạng mục — the priced, individually-warrantied lines of this visit.
            Same add/remove idiom as the transport-order fee table. */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>
              {t('operationLogs.maintenance.columns.item')}
            </Text>
            <Button
              size="compact-sm"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => form.insertListItem('items', blankMaintenanceItem())}
            >
              {t('operationLogs.maintenance.form.addItemLine')}
            </Button>
          </Group>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('operationLogs.maintenance.form.itemName')}</Table.Th>
                <Table.Th w={150}>{t('operationLogs.maintenance.columns.unitPrice')}</Table.Th>
                <Table.Th w={90}>{t('operationLogs.maintenance.columns.quantity')}</Table.Th>
                {/* Derived, never typed — the same rule the invoice totals
                    follow. An editable line total could only ever mean
                    disagreeing with the đơn giá × số lượng above it. */}
                <Table.Th w={140} ta="right">
                  {t('operationLogs.maintenance.columns.lineTotal')}
                </Table.Th>
                <Table.Th w={140}>{t('operationLogs.maintenance.columns.warranty')}</Table.Th>
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed" ta="center">
                      {t('operationLogs.maintenance.form.noItemLines')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                rows.map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <TextInput
                        placeholder={t('operationLogs.maintenance.form.itemPlaceholder')}
                        {...form.getInputProps(`items.${i}.name`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        thousandSeparator=","
                        {...form.getInputProps(`items.${i}.unitPrice`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      {/* Blank is 1, not 0 — a line that exists was serviced. */}
                      <NumberInput min={1} {...form.getInputProps(`items.${i}.quantity`)} />
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={500}>
                        {formatNumber(draftLineTotal(row))}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        placeholder={t('operationLogs.maintenance.form.warrantyPlaceholder')}
                        suffix={` ${t('operationLogs.maintenance.form.monthsSuffix')}`}
                        {...form.getInputProps(`items.${i}.warrantyMonths`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => form.removeListItem('items', i)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label={t('operationLogs.maintenance.columns.condition')}
            placeholder={t('operationLogs.maintenance.form.conditionPlaceholder')}
            {...form.getInputProps('condition')}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.odometer')}
            min={0}
            thousandSeparator=","
            suffix=" km"
            {...form.getInputProps('odometer')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 6 }} spacing="md">
          <NumberInput
            label={t('operationLogs.maintenance.columns.totalAmount')}
            description={t('operationLogs.maintenance.form.totalAmountHint')}
            thousandSeparator=","
            variant="filled"
            readOnly
            value={totalAmount}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.laborCost')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('laborCost')}
          />
          {/* VAT — the rate is authored, and the đồng it adds shows underneath
              rather than in a cell of its own, because what an operator checks
              against the paper invoice is the money, not the percentage. The
              cell keeps its place in the arithmetic row (hạng mục + tiền công +
              VAT = tổng) whether or not VAT applies; one that appeared and
              disappeared would reflow the whole line.

              **The input is deliberately never disabled.** Emptiness is the off
              state, so disabling it while empty would trap the operator halfway
              through editing 8 → 10: backspacing the 8 empties the field, which
              would switch VAT off and grey out the box they are still typing in.
              Typing a rate IS turning VAT on; the checkbox is the shortcut. */}
          <Stack gap={4}>
            <NumberInput
              label={t('operationLogs.maintenance.columns.vat')}
              description={
                vatOn ? `+ ${formatNumber(vatAmount)}` : t('operationLogs.maintenance.form.vatHint')
              }
              min={0}
              max={100}
              suffix=" %"
              {...form.getInputProps('vatPercent')}
            />
            <Checkbox
              size="xs"
              label={t('operationLogs.maintenance.form.vatEnabled')}
              checked={vatOn}

              onChange={(ev) =>
                form.setFieldValue(
                  'vatPercent',
                  ev.currentTarget.checked ? MAINTENANCE_DEFAULT_VAT_PERCENT : '',
                )
              }
            />
          </Stack>
          <NumberInput
            label={t('operationLogs.maintenance.columns.total')}
            description={t('operationLogs.maintenance.form.grandTotalHint')}
            thousandSeparator=","
            variant="filled"
            readOnly
            value={grandTotal}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.accountsReceived')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('accountsReceived')}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.outstanding')}
            description={t('operationLogs.maintenance.form.outstandingHint')}
            thousandSeparator=","
            variant="filled"
            readOnly
            value={outstanding}
          />
        </SimpleGrid>
        <Textarea
          label={t('__new__.01-common.labels.note')}
          placeholder={t('operationLogs.maintenance.form.notePlaceholder')}
          autosize
          minRows={2}
          maxRows={5}
          {...form.getInputProps('note')}
        />
      </>
    );
  },

  renderExpanded: (log, t) => {
    const e = log.extra ?? {};
    const items = readMaintenanceItems(e);
    const date = datePart(log.logDate);
    return (
      <Stack gap="sm">
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('operationLogs.maintenance.form.itemName')}</Table.Th>
              <Table.Th w={140} ta="right">
                {t('operationLogs.maintenance.columns.unitPrice')}
              </Table.Th>
              <Table.Th w={80} ta="right">
                {t('operationLogs.maintenance.columns.quantity')}
              </Table.Th>
              <Table.Th w={140} ta="right">
                {t('operationLogs.maintenance.columns.lineTotal')}
              </Table.Th>
              <Table.Th w={240}>{t('operationLogs.maintenance.columns.warranty')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center">
                    {t('operationLogs.maintenance.form.noItemLines')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              items.map((it, i) => {
                const until = warrantyExpiry(date, it.warrantyMonths);
                return (
                  <Table.Tr key={i}>
                    <Table.Td>{textCell(it.name)}</Table.Td>
                    <Table.Td ta="right">{formatNumber(it.unitPrice)}</Table.Td>
                    {/* Always shown, including the 1 an absent quantity reads
                        as — a blank column would leave the reader unsure
                        whether one was fitted or the field was skipped. */}
                    <Table.Td ta="right">{formatNumber(itemQuantity(it))}</Table.Td>
                    <Table.Td ta="right">{formatNumber(maintenanceLineTotal(it))}</Table.Td>
                    <Table.Td>
                      {until
                        ? `${monthsLabel(t, it.warrantyMonths as number)} (${t(
                            'operationLogs.maintenance.warrantyUntil',
                            { date: formatDate(until) },
                          )})`
                        : textCell(undefined)}
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
          {detailStat(
            t('operationLogs.maintenance.columns.totalAmount'),
            formatNumber(e.totalAmount),
          )}
          {detailStat(t('operationLogs.maintenance.columns.laborCost'), formatNumber(e.laborCost))}
          {/* Printed on every visit, dash included: "this invoice carried no
              VAT" is the thing an operator reconciling a Tổng cộng against a
              paper invoice needs stated, not left to inference from a missing
              cell. The rate rides in the label so the đồng can be checked. */}
          {detailStat(
            e.vatRate
              ? `${t('operationLogs.maintenance.columns.vat')} ${e.vatRate * 100}%`
              : t('operationLogs.maintenance.columns.vat'),
            e.vatRate ? formatNumber(maintenanceVat(e)) : '—',
          )}
          {detailStat(
            t('operationLogs.maintenance.columns.accountsReceived'),
            formatNumber(e.accountsReceived),
          )}
          {detailStat(t('operationLogs.maintenance.columns.condition'), e.condition || '—')}
          {detailStat(t('operationLogs.maintenance.columns.odometer'), formatNumber(e.odometer))}
        </SimpleGrid>
        {detailStat(t('__new__.01-common.labels.note'), e.note || '—')}
      </Stack>
    );
  },
};

function scheduleCell(loadingAt: string | undefined, unloadingAt: string | undefined) {
  if (!loadingAt && !unloadingAt) return textCell(undefined);
  return (
    <Stack gap={0}>
      {loadingAt && (
        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
          {formatDateTime(loadingAt)}
        </Text>
      )}
      {unloadingAt && (
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {formatDateTime(unloadingAt)}
        </Text>
      )}
    </Stack>
  );
}

export const TRIP_LOG_CONFIG: OperationLogConfig = {
  logType: 'trip',
  icon: <IconRoad size={14} />,
  titleKey: 'operationLogs.trip.sectionTitle',
  addLabelKey: 'operationLogs.trip.addItem',
  addTitleKey: 'operationLogs.trip.addItem',
  editTitleKey: 'operationLogs.trip.editItem',
  emptyKey: 'operationLogs.trip.empty',
  emptyForm: {
    logDate: todayString(),
    destination: '',
    odometer: '',
    driverName: '',
    driverId: '',
    note: '',
  },
  columns: [
    dateColumn('operationLogs.trip.columns.date'),

    {
      header: 'operationLogs.trip.columns.schedule',
      render: (log) => scheduleCell(log.extra?.loadingAt, log.extra?.unloadingAt),
    },
    {
      header: 'operationLogs.trip.columns.destination',
      render: (log) => textCell(log.extra?.destination),
    },
    {
      header: 'operationLogs.trip.columns.customer',
      render: (log) => textCell(log.extra?.customerName),
    },
    {
      header: 'operationLogs.trip.columns.containerSize',
      nowrap: true,
      render: (log) => <ContainerSizeCell value={log.extra?.containerSize} />,
    },
    {
      header: 'operationLogs.trip.columns.odometer',
      align: 'right',
      render: (log) => formatNumber(log.extra?.odometer),
    },
    {
      header: 'operationLogs.trip.columns.driver',
      render: (log) => textCell(log.extra?.driverName),
    },
    {
      header: 'operationLogs.trip.columns.transportOrder',
      nowrap: true,
      render: (log) =>
        log.extra?.transportOrderId ? (
          <TransportOrderLink
            id={log.extra.transportOrderId}
            fallbackLabel={log.extra.transportOrderNumber}
          />
        ) : (
          textCell(log.extra?.transportOrderNumber)
        ),
    },
    { header: '__new__.01-common.labels.note', render: (log) => noteCell(log.extra?.note) },
  ],

  group: {
    keyOf: (log) => log.extra?.transportOrderId || undefined,
    compare: (a, b) => Number(a.extra?.tripIndex ?? 0) - Number(b.extra?.tripIndex ?? 0),
  },

  summary: (logs, t) => {
    const distance = logs.reduce((sum, log) => {
      const km = Number(log.extra?.odometer);
      return Number.isFinite(km) ? sum + km : sum;
    }, 0);
    return (
      <Card withBorder radius="md" padding="sm" mt="xs" bg="var(--mantine-color-default-hover)">
        <SimpleGrid cols={2} spacing="md">
          {summaryStat(t('operationLogs.trip.summary.totalTrips'), formatNumber(logs.length))}
          {summaryStat(
            t('operationLogs.trip.summary.totalDistance'),
            `${formatNumber(distance)} km`,
          )}
        </SimpleGrid>
      </Card>
    );
  },

  rowLocked: (log) => Boolean(log.extra?.transportOrderId),
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
  }),
  buildExtra: (values): Partial<TripLogExtra> => ({
    ...(String(values.destination).trim() && { destination: String(values.destination).trim() }),
    ...(values.odometer !== '' && { odometer: Number(values.odometer) }),
    ...(String(values.driverName).trim() && { driverName: String(values.driverName).trim() }),
    ...(String(values.driverId).trim() && { driverId: String(values.driverId).trim() }),
    ...(String(values.note).trim() && { note: String(values.note).trim() }),
  }),
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    return {
      logDate: datePart(log.logDate),
      destination: e.destination ?? '',
      odometer: e.odometer ?? '',
      driverName: e.driverName ?? '',
      driverId: e.driverId ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t, ctx) => (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DatePickerField
          label={t('operationLogs.trip.columns.date')}
          withAsterisk
          clearable={false}
          {...form.getInputProps('logDate')}
          value={String(form.values.logDate)}
        />
        <TextInput
          label={t('operationLogs.trip.columns.destination')}
          placeholder={t('operationLogs.trip.form.destinationPlaceholder')}
          {...form.getInputProps('destination')}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <NumberInput
          label={t('operationLogs.trip.columns.odometer')}
          min={0}
          thousandSeparator=","
          suffix=" km"
          {...form.getInputProps('odometer')}
        />
        <LogDriverField
          form={form}
          t={t}
          label={t('operationLogs.trip.columns.driver')}
          assignedDriver={ctx?.assignedDriver}
        />
      </SimpleGrid>
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('operationLogs.trip.form.notePlaceholder')}
        autosize
        minRows={2}
        maxRows={5}
        {...form.getInputProps('note')}
      />
    </>
  ),
};
