import { Alert, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { Form } from '@/components/Form';
import { ImageUploadPanel, type PhotoEntry } from '@/components/ImageUploadPanel';
import { NumberField } from '@/components/NumberField';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import type { Employee, OdometerLog } from '@/types';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { buildUploadDirectory, buildUploadFileName } from '@/utils/uploadPath';
import { saveOdometerLog } from './saveOdometerLog';
import {
  canWriteDate,
  DRIVER_BACKDATE_DAYS,
  isCompleteEntry,
  shiftDate,
  visibleLogPhotos,
} from './odometerLogModel';

type FormValues = {
  recordDate: string;
  km: number | undefined;
  note: string;
};

type OdometerLogModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly employee: Pick<Employee, 'id' | 'name'>;

  readonly existing?: OdometerLog | undefined;

  readonly initialDate?: string;

  readonly canEditAny?: boolean;
  readonly onSaved?: (log: OdometerLog) => void;
};

export function OdometerLogModal(props: OdometerLogModalProps) {
  const { t } = useTranslation();
  const { opened, onClose, existing } = props;

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={existing ? t('odometerLog.form.editTitle') : t('odometerLog.form.title')}
    >
      {/* Mounted only while open, so the form seeds from props at mount and the
          next opening starts clean. Seeding a kept-mounted form in an effect
          would be a setState-in-effect — the rule is right: the state IS
          derivable from props, given a fresh mount. */}
      {opened && <OdometerLogForm {...props} />}
    </ResponsiveModal>
  );
}

function OdometerLogForm({
  onClose,
  employee,
  existing,
  initialDate,
  canEditAny = false,
  onSaved,
}: OdometerLogModalProps) {
  const { t } = useTranslation();
  const today = todayInVnDateString();

  const [photos, setPhotos] = useState<PhotoEntry[]>(() => existing?.extra?.photos ?? []);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      recordDate: initialDate ?? existing?.recordDate ?? today,
      km: existing?.extra?.km,
      note: existing?.extra?.note ?? '',
    },
    validate: {
      recordDate: (v) => (v ? null : t('odometerLog.validation.dateRequired')),
      km: (v) => (v && v > 0 ? null : t('odometerLog.validation.kmRequired')),
    },
  });

  const date = form.values.recordDate || today;

  const imageDirectory = useMemo(
    () =>
      buildUploadDirectory({ type: 'odometer-log', id: `${employee.id}-${date}`, noDate: true }),
    [employee.id, date],
  );

  const dateAllowed = canWriteDate(date, today, { canEditAny });
  const complete = isCompleteEntry(form.values.km ?? '', photos);

  const handlePhotosChange = useCallback(async (next: PhotoEntry[]) => {
    setPhotos(next);
  }, []);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!complete || !dateAllowed || values.km === undefined) return;
      setSaving(true);
      try {
        const saved = await saveOdometerLog({
          recordDate: values.recordDate,
          employeeId: employee.id,
          employeeName: employee.name,
          km: values.km,
          photos,
          note: values.note.trim(),
        });
        notifications.show({ color: 'green', message: t('odometerLog.notifications.saved') });
        onSaved?.(saved);
        onClose();
      } catch (err) {
        logger.error('Odometer log save failed:', err);
        notifications.show({
          color: 'red',
          title: t('odometerLog.notifications.saveFailedTitle'),
          message: t('odometerLog.notifications.saveFailed'),
          autoClose: 10000,
        });
      } finally {
        setSaving(false);
      }
    },
    [complete, dateAllowed, employee, photos, onClose, onSaved, t],
  );

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Stack gap="md">
        <DateField
          label={t('odometerLog.form.date')}
          withAsterisk
          clearable={false}
          maxDate={new Date()}
          minDate={canEditAny ? undefined : new Date(shiftDate(today, -DRIVER_BACKDATE_DAYS))}
          {...form.getInputProps('recordDate')}
        />

        {/* Explicit value/onChange rather than `getInputProps`: NumberField's
              props are a union (required vs optional number) that a spread of
              `any`-typed form props can't satisfy. */}
        <NumberField
          label={t('odometerLog.form.km')}
          description={t('odometerLog.form.kmHint')}
          withAsterisk
          min={0}
          thousandSeparator
          value={form.values.km}
          error={form.errors.km}
          onChange={(value) => form.setFieldValue('km', value)}
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {t('odometerLog.form.photo')}
          </Text>
          <ImageUploadPanel
            images={photos}
            onChange={handlePhotosChange}
            imageDirectory={imageDirectory}
            buildFileName={buildUploadFileName}

            uploadControl="button"
            uploadButtonLabel={t('odometerLog.form.addPhoto')}
            marker={`${employee.name} ${date}`}
            currentUserId={employee.id}
            currentUserName={employee.name}
          />
          {visibleLogPhotos(photos).length === 0 && (
            <Text size="xs" c="dimmed">
              {t('odometerLog.form.photoRequired')}
            </Text>
          )}
        </Stack>

        <Textarea
          label={t('odometerLog.form.note')}
          autosize
          minRows={2}
          {...form.getInputProps('note')}
        />

        {!dateAllowed && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {t('odometerLog.form.dateLocked')}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={saving}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={!complete || !dateAllowed}>
            {t('common.actions.save')}
          </Button>
        </Group>
      </Stack>
    </Form>
  );
}
