import { NumberInput, SimpleGrid, Text, TextInput, Textarea } from '@mantine/core';
import { IconTool } from '@tabler/icons-react';
import { DatePickerField } from '@/components/DatePickerField';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import type { GreenhouseMaintenanceLogExtra } from '@/types';
import {
  datePart,
  todayString,
  type LogFormValues,
  type OperationLogConfig,
} from '@/pages/operation-logs/operationLogConfig';

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

export const GREENHOUSE_MAINTENANCE_LOG_CONFIG: OperationLogConfig = {
  logType: 'greenhouse-maintenance',
  icon: <IconTool size={14} />,
  titleKey: 'operationLogs.greenhouseMaintenance.sectionTitle',
  addLabelKey: 'operationLogs.greenhouseMaintenance.addItem',
  addTitleKey: 'operationLogs.greenhouseMaintenance.addItem',
  editTitleKey: 'operationLogs.greenhouseMaintenance.editItem',
  emptyKey: 'operationLogs.greenhouseMaintenance.empty',
  emptyForm: { logDate: todayString(), activity: '', performedBy: '', cost: '', note: '' },
  columns: [
    {
      header: 'operationLogs.greenhouseMaintenance.columns.date',
      nowrap: true,
      render: (log) => formatDate(log.logDate),
    },
    {
      header: 'operationLogs.greenhouseMaintenance.columns.activity',
      render: (log) => textCell(log.extra?.activity),
    },
    {
      header: 'operationLogs.greenhouseMaintenance.columns.performedBy',
      render: (log) => textCell(log.extra?.performedBy),
    },
    {
      header: 'operationLogs.greenhouseMaintenance.columns.cost',
      align: 'right',
      nowrap: true,
      render: (log) =>
        log.extra?.cost ? (
          <Text size="sm">{formatNumber(log.extra.cost)}</Text>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
    },
    {
      header: '__new__.01-common.labels.note',
      render: (log) => noteCell(log.extra?.note),
    },
  ],
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
    activity: (v) =>
      String(v ?? '').trim()
        ? null
        : t('operationLogs.greenhouseMaintenance.validation.activityRequired'),
  }),
  buildExtra: (values): Partial<GreenhouseMaintenanceLogExtra> => ({
    ...(String(values.activity).trim() && { activity: String(values.activity).trim() }),
    ...(String(values.performedBy).trim() && { performedBy: String(values.performedBy).trim() }),

    ...(values.cost !== '' &&
      Number.isFinite(Number(values.cost)) && { cost: Number(values.cost) }),
    ...(String(values.note).trim() && { note: String(values.note).trim() }),
  }),
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    return {
      logDate: datePart(log.logDate),
      activity: e.activity ?? '',
      performedBy: e.performedBy ?? '',
      cost: e.cost ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t) => (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DatePickerField
          label={t('operationLogs.greenhouseMaintenance.columns.date')}
          withAsterisk
          clearable={false}
          {...form.getInputProps('logDate')}
          value={String(form.values.logDate)}
        />
        <TextInput
          label={t('operationLogs.greenhouseMaintenance.columns.activity')}
          placeholder={t('operationLogs.greenhouseMaintenance.form.activityPlaceholder')}
          withAsterisk
          {...form.getInputProps('activity')}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t('operationLogs.greenhouseMaintenance.columns.performedBy')}
          placeholder={t('operationLogs.greenhouseMaintenance.form.performedByPlaceholder')}
          {...form.getInputProps('performedBy')}
        />
        <NumberInput
          label={t('operationLogs.greenhouseMaintenance.columns.cost')}
          placeholder={t('operationLogs.greenhouseMaintenance.form.costPlaceholder')}
          min={0}
          allowNegative={false}
          thousandSeparator=","
          {...form.getInputProps('cost')}
        />
      </SimpleGrid>
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('operationLogs.greenhouseMaintenance.form.notePlaceholder')}
        autosize
        minRows={2}
        maxRows={5}
        {...form.getInputProps('note')}
      />
    </>
  ),
};
