import { Alert, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCamera } from '@tabler/icons-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device, logger } from '@credo/base-ui/utils';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import { DateField } from '@/components/DateField';
import { Form } from '@/components/Form';
import {
  CameraCapture,
  ImageUploadPanel,
  type CaptureResult,
  type PhotoEntry,
} from '@/components/ImageUploadPanel';
import { NumberField } from '@/components/NumberField';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import type { Employee, OdometerLog } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { captureResultToFile, photoUploadErrorKey, uploadPhotoFile } from '@/utils/photoUpload';
import { buildUploadDirectory, buildUploadFileName } from '@/utils/uploadPath';
import { saveOdometerLog } from './saveOdometerLog';
import {
  canWriteDate,
  isCompleteEntry,
  readEmployeeId,
  readFuelCost,
  readKm,
  visibleLogPhotos,
} from './odometerLogModel';

const isMobile = device.isMobile;

type FormValues = {
  recordDate: string;
  km: number | undefined;
  fuelCost: number | undefined;
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

  const [entry, setEntry] = useState<OdometerLog | undefined>(existing);
  const [loadingDay, setLoadingDay] = useState(false);

  const [dayUnknown, setDayUnknown] = useState(false);
  const latestDay = useRef('');
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraOpened, { open: openCamera, close: closeCamera }] = useDisclosure(false);

  const form = useForm<FormValues>({
    initialValues: {
      recordDate: initialDate ?? existing?.recordDate ?? today,
      km: readKm(existing),
      fuelCost: readFuelCost(existing),
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

  const dateAllowed = canWriteDate(date, today, { canEditAny, hasEntry: !!entry });
  const complete = isCompleteEntry(form.values.km ?? '', photos);
  const photoCount = visibleLogPhotos(photos).length;

  const handleDateChange = async (next: string | null) => {
    if (!next) return;
    form.setFieldValue('recordDate', next);
    latestDay.current = next;
    setLoadingDay(true);
    try {
      const partition = await odometerLogBundle.queryPartition(next);
      if (latestDay.current !== next) return;
      const found = partition.find(
        (log) => readEmployeeId(log) === employee.id && !log.extra?.isDeleted,
      );
      const stored = new Set((entry?.extra?.photos ?? []).map((p) => p.url));
      const fresh = photos.filter((p) => !stored.has(p.url));
      if (found || entry) {
        form.setValues({
          km: readKm(found),
          fuelCost: readFuelCost(found),
          note: found?.extra?.note ?? '',
        });
      }
      setPhotos([...(found?.extra?.photos ?? []), ...fresh]);
      setEntry(found);
      setDayUnknown(false);
    } catch (err) {
      if (latestDay.current !== next) return;
      logger.error('Odometer day lookup failed:', err);
      setDayUnknown(true);
    } finally {
      if (latestDay.current === next) setLoadingDay(false);
    }
  };

  const handlePhotosChange = useCallback(async (next: PhotoEntry[]) => {
    setPhotos(next);
  }, []);

  const handleCaptured = useCallback(
    async (result: CaptureResult): Promise<boolean> => {
      const fileName = `odometer-${Date.now()}.jpg`;
      setCapturing(true);
      try {
        const file = await captureResultToFile(result.base64, fileName);
        const uploaded = await uploadPhotoFile({
          file,
          imageDirectory,
          fileName: buildUploadFileName(fileName),
        });

        if (!uploaded.ok) {
          notifications.show({
            color: 'red',
            message: t(photoUploadErrorKey(uploaded.reason), { name: fileName }),
            autoClose: 8000,
          });
          return false;
        }

        setPhotos((prev) => [
          ...prev,
          {
            url: uploaded.url,
            timestamp: result.timestamp,
            fileName,
            userId: employee.id,
            userName: employee.name,
            ...(result.location && { location: result.location }),
            ...(result.latitude != null && { latitude: result.latitude }),
            ...(result.longitude != null && { longitude: result.longitude }),
          },
        ]);
        closeCamera();
        return true;
      } catch {
        notifications.show({ color: 'red', message: t('photos.uploadError', { name: fileName }) });
        return false;
      } finally {
        setCapturing(false);
      }
    },
    [imageDirectory, employee, closeCamera, t],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!complete || !dateAllowed || dayUnknown || values.km === undefined) return;
      setSaving(true);
      try {
        const saved = await saveOdometerLog({
          recordDate: values.recordDate,
          employeeId: employee.id,
          employeeName: employee.name,
          km: values.km,
          photos,
          fuelCost: values.fuelCost,
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
    [complete, dateAllowed, dayUnknown, employee, photos, onClose, onSaved, t],
  );

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Stack gap="md">
        {/* No `minDate`: an older day with an entry is the driver's to correct,
            and `dateLocked` below explains an older day without one. */}
        <DateField
          label={t('odometerLog.form.date')}
          withAsterisk
          clearable={false}
          maxDate={new Date()}
          {...form.getInputProps('recordDate')}
          onChange={(value) => void handleDateChange(value)}
        />

        {/* Explicit value/onChange rather than `getInputProps`: NumberField's
              props are a union (required vs optional number) that a spread of
              `any`-typed form props can't satisfy. */}
        {/* No `thousandSeparator` here: NumberField groups by default, in the
            marks this device prints with. */}
        <NumberField
          label={t('odometerLog.form.km')}
          description={t('odometerLog.form.kmHint')}
          withAsterisk
          min={0}
          value={form.values.km}
          error={form.errors.km}
          onChange={(value) => form.setFieldValue('km', value)}
        />

        <NumberField
          label={t('odometerLog.form.fuelCost')}
          description={t('odometerLog.form.fuelCostHint')}
          min={0}
          allowDecimal={false}
          value={form.values.fuelCost}
          onChange={(value) => form.setFieldValue('fuelCost', value)}
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {photoCount > 0
              ? `${t('odometerLog.form.photo')} (${photoCount})`
              : t('odometerLog.form.photo')}
          </Text>

          {isMobile ? (
            <>
              {/* The app's own camera, as on the delivery-request page: the
                  reading must be shot at the end of the shift, and the OS
                  picker would offer the gallery — where any image from any day
                  satisfies the requirement the photo exists to enforce. It also
                  burns driver / date / time (and the location when there is
                  one) into the frame, which is what makes the shot evidence
                  rather than a picture of a number. */}
              <Button
                variant="light"
                leftSection={<IconCamera size={16} />}
                onClick={openCamera}
                loading={capturing}
              >
                {photoCount > 0
                  ? t('odometerLog.form.takeAnotherPhoto')
                  : t('odometerLog.form.takePhoto')}
              </Button>
              {/* Mounted only once there is something in it — the panel's empty
                  state is a tall placeholder, and this sits in an already-long
                  form. */}
              {photoCount > 0 && (
                <ImageUploadPanel
                  section="grid"
                  images={photos}
                  onChange={handlePhotosChange}
                  imageDirectory={imageDirectory}
                  buildFileName={buildUploadFileName}
                  marker={`${employee.name} ${date}`}
                  currentUserId={employee.id}
                  currentUserName={employee.name}
                />
              )}
            </>
          ) : (
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
          )}

          {photoCount === 0 && (
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

        {dayUnknown ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {t('odometerLog.form.dayLoadFailed')}
          </Alert>
        ) : (
          !dateAllowed && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              {t('odometerLog.form.dateLocked')}
            </Alert>
          )
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={saving}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            type="submit"
            loading={saving || loadingDay}
            disabled={!complete || !dateAllowed || dayUnknown}
          >
            {t('common.actions.save')}
          </Button>
        </Group>
      </Stack>
      <CameraCapture
        opened={cameraOpened}
        onClose={closeCamera}
        onCapture={handleCaptured}
        uploading={capturing}
        marker={`${employee.name} · ${formatDate(date)}`}
        userName={employee.name}
        t={t}
      />
    </Form>
  );
}
