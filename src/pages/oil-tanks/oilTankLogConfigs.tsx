import { NumberInput, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconDroplet, IconTruckLoading } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { DatePickerField } from '@/components/DatePickerField';
import { EmployeeLink } from '@/components/EmployeeLink';
import { TruckLink } from '@/components/TruckLink';
import { formatDate } from '@/utils/dateFormat';
import { formatLitres, formatNumber, LITRE_INPUT_PROPS } from '@/utils/number';
import type { OilTankIssueLogExtra, OilTankRefillLogExtra } from '@/types';
import {
  datePart,
  todayString,
  type LogFormValue,
  type LogFormValues,
  type OperationLogConfig,
} from '@/pages/operation-logs/operationLogConfig';
import {
  OIL_TANK_ISSUE_LOG_TYPE,
  OIL_TANK_REFILL_LOG_TYPE,
  issueExceedsStock,
} from './oilTankBalance';
import { applyMovementToTankLevel } from './tankMovements';
import { syncTruckRefuelMirror } from './truckRefuelMirrorSync';
import { IssueTruckDriverFields } from './IssueTruckDriverFields';

function textCell(value: string | undefined): ReactNode {
  return value ? (
    <Text size="sm">{value}</Text>
  ) : (
    <Text size="sm" c="dimmed">
      —
    </Text>
  );
}

function noteCell(note: string | undefined): ReactNode {
  return (
    <Text size="sm" c={note ? undefined : 'dimmed'} lineClamp={2}>
      {note || '—'}
    </Text>
  );
}

function dateColumn(headerKey: string): OperationLogConfig['columns'][number] {
  return { header: headerKey, nowrap: true, render: (log) => formatDate(log.logDate) };
}

function moneyColumns(prefix: string): OperationLogConfig['columns'] {
  return [
    {
      header: `${prefix}.columns.litres`,
      align: 'right',
      emphasize: true,
      render: (log) => formatLitres(log.extra?.litres),
    },
    {
      header: `${prefix}.columns.unitPrice`,
      align: 'right',
      render: (log) => formatNumber(log.extra?.unitPrice),
    },
    {
      header: `${prefix}.columns.total`,
      align: 'right',
      render: (log) => formatNumber(log.extra?.totalAmount),
    },
  ];
}

function syncTotal(
  form: Parameters<OperationLogConfig['renderFields']>[0],
  litres: LogFormValue,
  unitPrice: LogFormValue,
) {
  const lit = Number(litres);
  const price = Number(unitPrice);
  if (litres !== '' && unitPrice !== '' && lit >= 0 && price >= 0) {
    form.setFieldValue('totalAmount', Math.round(lit * price));
  }
}

export const OIL_TANK_REFILL_LOG_CONFIG: OperationLogConfig = {
  logType: OIL_TANK_REFILL_LOG_TYPE,
  icon: <IconDroplet size={14} />,
  titleKey: 'oilTanks.logs.refill.sectionTitle',
  addLabelKey: 'oilTanks.logs.refill.addItem',
  addTitleKey: 'oilTanks.logs.refill.addItem',
  editTitleKey: 'oilTanks.logs.refill.editItem',
  emptyKey: 'oilTanks.logs.refill.empty',
  emptyForm: {
    logDate: todayString(),
    litres: '',
    unitPrice: '',
    totalAmount: '',
    supplier: '',
    note: '',
  },
  columns: [
    dateColumn('oilTanks.logs.refill.columns.date'),
    ...moneyColumns('oilTanks.logs.refill'),
    {
      header: 'oilTanks.logs.refill.columns.supplier',
      render: (log) => textCell(log.extra?.supplier),
    },
    { header: '__new__.01-common.labels.note', render: (log) => noteCell(log.extra?.note) },
  ],
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),

    litres: (v) =>
      v !== '' && Number(v) > 0 ? null : t('oilTanks.logs.validation.litresRequired'),
    unitPrice: (v) =>
      v === '' || Number(v) >= 0 ? null : t('operationLogs.validation.unitPriceInvalid'),
  }),
  buildExtra: (values): Partial<OilTankRefillLogExtra> => ({
    ...(values.litres !== '' && { litres: Number(values.litres) }),
    ...(values.unitPrice !== '' && { unitPrice: Number(values.unitPrice) }),
    ...(values.totalAmount !== '' && { totalAmount: Number(values.totalAmount) }),
    ...(String(values.supplier).trim() && { supplier: String(values.supplier).trim() }),
    ...(String(values.note).trim() && { note: String(values.note).trim() }),
  }),
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    return {
      logDate: datePart(log.logDate),
      litres: e.litres ?? '',
      unitPrice: e.unitPrice ?? '',
      totalAmount: e.totalAmount ?? '',
      supplier: e.supplier ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t) => (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DatePickerField
          label={t('oilTanks.logs.refill.columns.date')}
          withAsterisk
          clearable={false}
          {...form.getInputProps('logDate')}
          value={String(form.values.logDate)}
        />
        <TextInput
          label={t('oilTanks.logs.refill.columns.supplier')}
          placeholder={t('oilTanks.logs.refill.form.supplierPlaceholder')}
          {...form.getInputProps('supplier')}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <NumberInput
          label={t('oilTanks.logs.refill.columns.litres')}
          withAsterisk
          {...LITRE_INPUT_PROPS}
          {...form.getInputProps('litres')}
          onChange={(v) => {
            form.setFieldValue('litres', v);
            syncTotal(form, v, form.values.unitPrice);
          }}
        />
        <NumberInput
          label={t('oilTanks.logs.refill.columns.unitPrice')}
          min={0}
          thousandSeparator=","
          {...form.getInputProps('unitPrice')}
          onChange={(v) => {
            form.setFieldValue('unitPrice', v);
            syncTotal(form, form.values.litres, v);
          }}
        />
        <NumberInput
          label={t('oilTanks.logs.refill.columns.total')}
          min={0}
          thousandSeparator=","
          {...form.getInputProps('totalAmount')}
        />
      </SimpleGrid>
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('oilTanks.logs.refill.form.notePlaceholder')}
        autosize
        minRows={2}
        maxRows={5}
        {...form.getInputProps('note')}
      />
    </>
  ),

  photos: {
    directoryType: 'oil-tank-refill',
    labelKey: 'oilTanks.logs.refill.photosLabel',
  },
  summary: (logs, t) => {
    const litres = logs.reduce((sum, l) => sum + (Number(l.extra?.litres) || 0), 0);
    const cost = logs.reduce((sum, l) => sum + (Number(l.extra?.totalAmount) || 0), 0);
    return (
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t('oilTanks.logs.refill.summary.litres')}
          </Text>
          <Text size="sm" fw={600}>
            {formatLitres(litres)}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t('oilTanks.logs.refill.summary.cost')}
          </Text>
          <Text size="sm" fw={600}>
            {formatNumber(cost)}
          </Text>
        </Stack>
      </SimpleGrid>
    );
  },
  afterWrite: applyMovementToTankLevel,
  afterWriteErrorKey: 'oilTanks.notifications.levelSyncError',
};

export const OIL_TANK_ISSUE_LOG_CONFIG: OperationLogConfig = {
  logType: OIL_TANK_ISSUE_LOG_TYPE,
  icon: <IconTruckLoading size={14} />,
  titleKey: 'oilTanks.logs.issue.sectionTitle',
  addLabelKey: 'oilTanks.logs.issue.addItem',
  addTitleKey: 'oilTanks.logs.issue.addItem',
  editTitleKey: 'oilTanks.logs.issue.editItem',
  emptyKey: 'oilTanks.logs.issue.empty',
  emptyForm: {
    logDate: todayString(),
    litres: '',
    unitPrice: '',
    totalAmount: '',
    truckId: '',
    truckCode: '',
    driverName: '',
    driverId: '',
    note: '',
  },
  columns: [
    dateColumn('oilTanks.logs.issue.columns.date'),
    {
      header: 'oilTanks.logs.issue.columns.truck',

      render: (log) =>
        log.extra?.truckId ? (
          <TruckLink id={log.extra.truckId} fallbackLabel={log.extra.truckCode} showPlate />
        ) : (
          textCell(log.extra?.truckCode)
        ),
    },
    ...moneyColumns('oilTanks.logs.issue'),
    {
      header: 'oilTanks.logs.issue.columns.driver',

      render: (log) =>
        log.extra?.driverId ? (
          <EmployeeLink id={log.extra.driverId} fallbackLabel={log.extra.driverName} />
        ) : (
          textCell(log.extra?.driverName)
        ),
    },
    { header: '__new__.01-common.labels.note', render: (log) => noteCell(log.extra?.note) },
  ],
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
    litres: (v) =>
      v !== '' && Number(v) > 0 ? null : t('oilTanks.logs.validation.litresRequired'),
  }),

  validateOnSubmit: ({ values, previous, context, t }) => {
    const { refused, available } = issueExceedsStock({
      litres: values.litres,
      currentLevel: context?.tankCurrentLevel,
      previousLitres: Number(previous?.extra?.litres) || 0,
    });
    if (!refused) return null;
    return {
      litres: t('oilTanks.logs.validation.exceedsStock', {
        available: formatLitres(available ?? 0),
      }),
    };
  },
  buildExtra: (values): Partial<OilTankIssueLogExtra> => ({
    ...(values.litres !== '' && { litres: Number(values.litres) }),
    ...(values.unitPrice !== '' && { unitPrice: Number(values.unitPrice) }),
    ...(values.totalAmount !== '' && { totalAmount: Number(values.totalAmount) }),

    ...(String(values.truckId).trim() && { truckId: String(values.truckId).trim() }),
    ...(String(values.truckCode).trim() && { truckCode: String(values.truckCode).trim() }),
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
      truckId: e.truckId ?? '',
      truckCode: e.truckCode ?? '',
      driverName: e.driverName ?? '',
      driverId: e.driverId ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t, ctx) => (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <DatePickerField
          label={t('oilTanks.logs.issue.columns.date')}
          withAsterisk
          clearable={false}
          {...form.getInputProps('logDate')}
          value={String(form.values.logDate)}
        />
        <NumberInput
          label={t('oilTanks.logs.issue.columns.litres')}
          withAsterisk
          {...LITRE_INPUT_PROPS}
          {...form.getInputProps('litres')}
          onChange={(v) => {
            form.setFieldValue('litres', v);
            syncTotal(form, v, form.values.unitPrice);
          }}
        />
        <NumberInput
          label={t('oilTanks.logs.issue.columns.unitPrice')}
          min={0}
          thousandSeparator=","
          {...form.getInputProps('unitPrice')}
          onChange={(v) => {
            form.setFieldValue('unitPrice', v);
            syncTotal(form, form.values.litres, v);
          }}
        />
      </SimpleGrid>
      <IssueTruckDriverFields form={form} t={t} ctx={ctx} />
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('oilTanks.logs.issue.form.notePlaceholder')}
        autosize
        minRows={2}
        maxRows={5}
        {...form.getInputProps('note')}
      />
    </>
  ),

  rowLocked: (log) => Boolean(log.extra?.sourceRefuelLogId),
  summary: (logs, t) => {
    const litres = logs.reduce((sum, l) => sum + (Number(l.extra?.litres) || 0), 0);
    return (
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t('oilTanks.logs.issue.summary.litres')}
          </Text>
          <Text size="sm" fw={600}>
            {formatLitres(litres)}
          </Text>
        </Stack>
      </SimpleGrid>
    );
  },

  afterWrite: async (event, t) => {
    await applyMovementToTankLevel(event);
    await syncTruckRefuelMirror(event, t);
  },
  afterWriteErrorKey: 'oilTanks.notifications.levelSyncError',
};
