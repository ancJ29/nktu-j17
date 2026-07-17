import { SimpleGrid, Text, TextInput, Textarea } from '@mantine/core';
import { IconCertificate } from '@tabler/icons-react';
import { DatePickerField } from '@/components/DatePickerField';
import { formatDate } from '@/utils/dateFormat';
import type { DriverTrainingLogExtra } from '@/types';
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

export const DRIVER_TRAINING_LOG_CONFIG: OperationLogConfig = {
  logType: 'driver-training',
  icon: <IconCertificate size={14} />,
  titleKey: 'operationLogs.driverTraining.sectionTitle',
  addLabelKey: 'operationLogs.driverTraining.addItem',
  addTitleKey: 'operationLogs.driverTraining.addItem',
  editTitleKey: 'operationLogs.driverTraining.editItem',
  emptyKey: 'operationLogs.driverTraining.empty',
  emptyForm: { logDate: todayString(), course: '', trainer: '', result: '', note: '' },
  columns: [
    {
      header: 'operationLogs.driverTraining.columns.date',
      nowrap: true,
      render: (log) => formatDate(log.logDate),
    },
    {
      header: 'operationLogs.driverTraining.columns.course',
      render: (log) => textCell(log.extra?.course),
    },
    {
      header: 'operationLogs.driverTraining.columns.trainer',
      render: (log) => textCell(log.extra?.trainer),
    },
    {
      header: 'operationLogs.driverTraining.columns.result',
      render: (log) => textCell(log.extra?.result),
    },
    {
      header: '__new__.01-common.labels.note',
      render: (log) => noteCell(log.extra?.note),
    },
  ],
  validate: (t) => ({
    logDate: (v) => (v ? null : t('operationLogs.validation.dateRequired')),
  }),
  buildExtra: (values): Partial<DriverTrainingLogExtra> => ({
    ...(String(values.course).trim() && { course: String(values.course).trim() }),
    ...(String(values.trainer).trim() && { trainer: String(values.trainer).trim() }),
    ...(String(values.result).trim() && { result: String(values.result).trim() }),
    ...(String(values.note).trim() && { note: String(values.note).trim() }),
  }),
  toForm: (log): LogFormValues => {
    const e = log.extra ?? {};
    return {
      logDate: datePart(log.logDate),
      course: e.course ?? '',
      trainer: e.trainer ?? '',
      result: e.result ?? '',
      note: e.note ?? '',
    };
  },
  renderFields: (form, t) => (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DatePickerField
          label={t('operationLogs.driverTraining.columns.date')}
          withAsterisk
          clearable={false}
          {...form.getInputProps('logDate')}
          value={String(form.values.logDate)}
        />
        <TextInput
          label={t('operationLogs.driverTraining.columns.course')}
          placeholder={t('operationLogs.driverTraining.form.coursePlaceholder')}
          {...form.getInputProps('course')}
        />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t('operationLogs.driverTraining.columns.trainer')}
          placeholder={t('operationLogs.driverTraining.form.trainerPlaceholder')}
          {...form.getInputProps('trainer')}
        />
        <TextInput
          label={t('operationLogs.driverTraining.columns.result')}
          placeholder={t('operationLogs.driverTraining.form.resultPlaceholder')}
          {...form.getInputProps('result')}
        />
      </SimpleGrid>
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('operationLogs.driverTraining.form.notePlaceholder')}
        autosize
        minRows={2}
        maxRows={5}
        {...form.getInputProps('note')}
      />
    </>
  ),
};
