import {
  Card,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconGasStation, IconRoad, IconTool } from '@tabler/icons-react';
import { DatePickerField } from '@/components/DatePickerField';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { computeRefuelTotals, formatConsumption, refuelConsumption } from '@/utils/refuelStats';
import type { MaintenanceLogExtra, RefuelLogExtra, TripLogExtra } from '@/types';
import {
  datePart,
  todayString,
  type LogFormValues,
  type OperationLogConfig,
} from '@/pages/operation-logs/operationLogConfig';
import { exportRefuelLogsToExcel } from '@/utils/excelParser';
import { LogDriverField } from './LogDriverField';

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
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
    litres: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.litresInvalid'),
    unitPrice: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.unitPriceInvalid'),
  }),
  buildExtra: (values): Partial<RefuelLogExtra> => ({
    ...(values.litres !== '' && { litres: Number(values.litres) }),
    ...(values.unitPrice !== '' && { unitPrice: Number(values.unitPrice) }),
    ...(values.totalAmount !== '' && { totalAmount: Number(values.totalAmount) }),
    ...(values.odometerBefore !== '' && { odometerBefore: Number(values.odometerBefore) }),
    ...(values.odometer !== '' && { odometer: Number(values.odometer) }),
    ...(values.distanceKm !== '' && { distanceKm: Number(values.distanceKm) }),
    ...(String(values.driverName).trim() && { driverName: String(values.driverName).trim() }),
    ...(String(values.driverId).trim() && { driverId: String(values.driverId).trim() }),
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
      note: e.note ?? '',
    };
  },
  renderFields: (form, t, ctx) => {
    
    
    const syncTotal = (litres: number | string, unitPrice: number | string) => {
      const lit = Number(litres);
      const price = Number(unitPrice);
      if (litres !== '' && unitPrice !== '' && lit >= 0 && price >= 0) {
        form.setFieldValue('totalAmount', Math.round(lit * price));
      }
    };
    
    
    const syncDistance = (before: number | string, after: number | string) => {
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
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <NumberInput
            label={t('operationLogs.refuel.columns.litres')}
            min={0}
            decimalScale={2}
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

function maintenanceOutstanding(e: MaintenanceLogExtra | undefined): number | undefined {
  const total = e?.grandTotal ?? e?.cost;
  if (total == null) return undefined;
  return total - (e?.accountsReceived ?? 0);
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
    item: '',
    condition: '',
    odometer: '',
    unitPrice: '',
    quantity: '',
    totalAmount: '',
    laborCost: '',
    grandTotal: '',
    accountsReceived: '',
    note: '',
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
      header: 'operationLogs.maintenance.columns.item',
      render: (log) => textCell(log.extra?.item),
    },
    {
      header: 'operationLogs.maintenance.columns.condition',
      render: (log) => textCell(log.extra?.condition),
    },
    {
      header: 'operationLogs.maintenance.columns.unitPrice',
      align: 'right',
      render: (log) => formatNumber(log.extra?.unitPrice),
    },
    {
      header: 'operationLogs.maintenance.columns.quantity',
      align: 'right',
      render: (log) => formatNumber(log.extra?.quantity),
    },
    {
      header: 'operationLogs.maintenance.columns.totalAmount',
      align: 'right',
      render: (log) => formatNumber(log.extra?.totalAmount),
    },
    {
      header: 'operationLogs.maintenance.columns.laborCost',
      align: 'right',
      render: (log) => formatNumber(log.extra?.laborCost),
    },
    {
      header: 'operationLogs.maintenance.columns.total',
      align: 'right',
      emphasize: true,
      
      render: (log) => formatNumber(log.extra?.grandTotal ?? log.extra?.cost),
    },
    {
      header: 'operationLogs.maintenance.columns.accountsReceived',
      align: 'right',
      render: (log) => formatNumber(log.extra?.accountsReceived),
    },
    {
      header: 'operationLogs.maintenance.columns.outstanding',
      align: 'right',
      emphasize: true,
      render: (log) => formatNumber(maintenanceOutstanding(log.extra)),
    },
    { header: '__new__.01-common.labels.note', render: (log) => noteCell(log.extra?.note) },
  ],
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
    unitPrice: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.unitPriceInvalid'),
    quantity: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.quantityInvalid'),
  }),
  buildExtra: (values): Partial<MaintenanceLogExtra> => ({
    ...(String(values.maintenanceType).trim() && {
      maintenanceType: String(values.maintenanceType).trim(),
      
      ...(String(values.maintenanceTypeLabel).trim() && {
        maintenanceTypeLabel: String(values.maintenanceTypeLabel).trim(),
      }),
    }),
    ...(String(values.supplier).trim() && { supplier: String(values.supplier).trim() }),
    ...(String(values.item).trim() && { item: String(values.item).trim() }),
    ...(String(values.condition).trim() && { condition: String(values.condition).trim() }),
    ...(values.odometer !== '' && { odometer: Number(values.odometer) }),
    ...(values.unitPrice !== '' && { unitPrice: Number(values.unitPrice) }),
    ...(values.quantity !== '' && { quantity: Number(values.quantity) }),
    ...(values.totalAmount !== '' && { totalAmount: Number(values.totalAmount) }),
    ...(values.laborCost !== '' && { laborCost: Number(values.laborCost) }),
    ...(values.grandTotal !== '' && { grandTotal: Number(values.grandTotal) }),
    ...(values.accountsReceived !== '' && { accountsReceived: Number(values.accountsReceived) }),
    ...(String(values.note).trim() && { note: String(values.note).trim() }),
  }),
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    return {
      logDate: datePart(log.logDate),
      maintenanceType: e.maintenanceType ?? '',
      maintenanceTypeLabel: e.maintenanceTypeLabel ?? '',
      supplier: e.supplier ?? '',
      item: e.item ?? '',
      condition: e.condition ?? '',
      odometer: e.odometer ?? '',
      unitPrice: e.unitPrice ?? '',
      quantity: e.quantity ?? '',
      totalAmount: e.totalAmount ?? '',
      laborCost: e.laborCost ?? '',
      
      grandTotal: e.grandTotal ?? e.cost ?? '',
      accountsReceived: e.accountsReceived ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t, ctx) => {
    
    
    const syncGrandTotal = (totalAmount: number | string, laborCost: number | string) => {
      if (totalAmount === '' && laborCost === '') {
        form.setFieldValue('grandTotal', '');
        return;
      }
      const parts = totalAmount === '' ? 0 : Number(totalAmount);
      const labor = laborCost === '' ? 0 : Number(laborCost);
      form.setFieldValue('grandTotal', parts + labor);
    };
    
    const syncTotalAmount = (unitPrice: number | string, quantity: number | string) => {
      if (unitPrice === '' || quantity === '') return;
      const up = Number(unitPrice);
      const qty = Number(quantity);
      if (up < 0 || qty < 0) return;
      const parts = Math.round(up * qty);
      form.setFieldValue('totalAmount', parts);
      syncGrandTotal(parts, form.values.laborCost);
    };
    
    
    const typeOptions = ctx?.maintenanceTypeOptions ?? [];
    const currentType = String(form.values.maintenanceType);
    const typeData =
      currentType && !typeOptions.some((o) => o.value === currentType)
        ? [
            ...typeOptions,
            { value: currentType, label: String(form.values.maintenanceTypeLabel) || currentType },
          ]
        : typeOptions;
    
    
    const outstanding =
      form.values.grandTotal === ''
        ? ''
        : Number(form.values.grandTotal) -
          (form.values.accountsReceived === '' ? 0 : Number(form.values.accountsReceived));
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
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <TextInput
            label={t('operationLogs.maintenance.columns.item')}
            placeholder={t('operationLogs.maintenance.form.itemPlaceholder')}
            {...form.getInputProps('item')}
          />
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
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <NumberInput
            label={t('operationLogs.maintenance.columns.unitPrice')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('unitPrice')}
            onChange={(v) => {
              form.setFieldValue('unitPrice', v);
              syncTotalAmount(v, form.values.quantity);
            }}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.quantity')}
            min={0}
            {...form.getInputProps('quantity')}
            onChange={(v) => {
              form.setFieldValue('quantity', v);
              syncTotalAmount(form.values.unitPrice, v);
            }}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.totalAmount')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('totalAmount')}
            onChange={(v) => {
              form.setFieldValue('totalAmount', v);
              syncGrandTotal(v, form.values.laborCost);
            }}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <NumberInput
            label={t('operationLogs.maintenance.columns.laborCost')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('laborCost')}
            onChange={(v) => {
              form.setFieldValue('laborCost', v);
              syncGrandTotal(form.values.totalAmount, v);
            }}
          />
          <NumberInput
            label={t('operationLogs.maintenance.columns.total')}
            min={0}
            thousandSeparator=","
            {...form.getInputProps('grandTotal')}
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
};

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
      header: 'operationLogs.trip.columns.destination',
      render: (log) => textCell(log.extra?.destination),
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
    { header: '__new__.01-common.labels.note', render: (log) => noteCell(log.extra?.note) },
  ],
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
