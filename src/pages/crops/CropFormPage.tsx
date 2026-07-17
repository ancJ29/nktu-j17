import {
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCalendar, IconHash, IconPlant2 } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useCropStore, CROP_RECORD_TARGET } from '@/stores/useCropStores';
import { useGreenhouseStore } from '@/stores/useGreenhouseStore';
import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { EmployeeSelector } from '@/components/selectors';
import { useInitFormFromFetch } from '@/hooks';
import { templateDayCount } from '@/utils/cropDiaryTemplateModel';
import { autoApplyDiaryTemplateOnCreate } from '@/utils/cropDiaryTemplateApply';
import {
  findGrowingCropInGreenhouse,
  findOverlappingCrop,
  windowDayCount,
  windowEndDate,
} from '@/utils/cropSchedule';
import { buildDailySequentialCode } from '@/utils/code';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import { CROP_CODE_PREFIX, type Crop, type CropExtra } from '@/types';

const isMobile = device.isMobile;

type CreatableStatus = 'planned' | 'growing';

type CropFormValues = {
  code: string;
  name: string;
  greenhouseCode: string;
  status: CreatableStatus;
  fromDate: string | null;
  totalDates: number | string;
  plantType: string;
  numberOfSeeds: number | string;
  growingMedium: string;
  picId: string | null;
  diaryTemplateCode: string | null;
  notes: string;
};

export function CropFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  
  
  const allCrops = useCropStore((s) => s.items);
  const cropsInitialized = useCropStore((s) => s.initialized);
  const loadCrops = useCropStore((s) => s.loadAll);
  useEffect(() => {
    if (!cropsInitialized) loadCrops();
  }, [cropsInitialized, loadCrops]);

  
  
  const codePreview = useMemo(
    () =>
      buildDailySequentialCode(
        CROP_CODE_PREFIX,
        allCrops.map((c) => c.code),
      ),
    [allCrops],
  );

  const greenhouses = useGreenhouseStore((s) => s.items);
  const greenhousesInitialized = useGreenhouseStore((s) => s.initialized);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadAll);
  useEffect(() => {
    if (!greenhousesInitialized) loadGreenhouses();
  }, [greenhousesInitialized, loadGreenhouses]);

  useEffect(() => {
    if (isMobile || (isEdit && !perms.crop.canEdit()) || (!isEdit && !perms.crop.canCreate())) {
      navigate(ROUTES.CROPS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Crop | null>(null);

  const greenhouseOptions = useMemo(
    () =>
      greenhouses
        .filter((g) => g.isActive)
        .map((g) => ({ value: g.code, label: `${g.name} (${g.code})` })),
    [greenhouses],
  );

  
  
  const templates = useCropDiaryTemplateStore((s) => s.items);
  const templatesInitialized = useCropDiaryTemplateStore((s) => s.initialized);
  const loadTemplates = useCropDiaryTemplateStore((s) => s.loadAll);
  useEffect(() => {
    if (!templatesInitialized) loadTemplates();
  }, [templatesInitialized, loadTemplates]);
  const templateOptions = useMemo(
    () => templates.map((tpl) => ({ value: tpl.code, label: `${tpl.name} (${tpl.code})` })),
    [templates],
  );

  const form = useForm<CropFormValues>({
    initialValues: {
      code: codePreview,
      name: '',
      greenhouseCode: '',
      status: 'planned',
      fromDate: todayInVnDateString(),
      totalDates: '',
      plantType: '',
      numberOfSeeds: '',
      growingMedium: '',
      picId: null,
      diaryTemplateCode: null,
      notes: '',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      greenhouseCode: (v) => (v.trim() ? null : t('crops.validation.greenhouseRequired')),
      
      
      diaryTemplateCode: (v) => (isEdit || v ? null : t('crops.validation.diaryTemplateRequired')),
      numberOfSeeds: (v) =>
        v !== '' && Number(v) > 0 ? null : t('crops.validation.numberOfSeedsRequired'),
      fromDate: (v) => (v ? null : t('crops.validation.fromRequired')),
      totalDates: (v, values) => {
        const n = Number(v);
        if (v === '' || !Number.isFinite(n) || n < 1) {
          return t('crops.validation.totalDatesRequired');
        }
        
        
        
        if (values.fromDate && values.greenhouseCode) {
          const end = windowEndDate(values.fromDate, n);
          if (end) {
            const overlap = findOverlappingCrop(
              useCropStore.getState().items as Crop[],
              values.greenhouseCode,
              values.fromDate,
              end,
              id,
            );
            if (overlap) return t('crops.validation.overlap', { code: overlap.code });
          }
        }
        return null;
      },
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(CROP_RECORD_TARGET, { id });
      const c = res.item as Crop;
      snapshotRef.current = c;
      return {
        code: c.code,
        name: c.name,
        greenhouseCode: c.greenhouseCode,
        status: (c.status === 'growing' ? 'growing' : 'planned') as CreatableStatus,
        fromDate: c.extra?.fromDate ?? null,
        totalDates: windowDayCount(c.extra?.fromDate, c.extra?.toDate) ?? '',
        plantType: c.extra?.plantType ?? '',
        numberOfSeeds: c.extra?.numberOfSeeds ?? '',
        growingMedium: c.extra?.growingMedium ?? '',
        picId: c.extra?.picId ?? null,
        diaryTemplateCode: c.extra?.diaryTemplateCode ?? null,
        notes: c.extra?.notes ?? '',
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('crops.notifications.fetchError') });
      navigate(ROUTES.CROPS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: CropFormValues) => {
      setLoading(true);
      try {
        
        
        
        
        const toDate = windowEndDate(values.fromDate, Number(values.totalDates));
        const buildExtra = (base?: CropExtra): CropExtra => {
          const extra: CropExtra = { ...(base ?? {}) };
          const put = (k: keyof CropExtra, v: string | number | undefined) => {
            if (v === undefined || v === '') delete extra[k];
            else extra[k] = v;
          };
          put('notes', values.notes.trim() || undefined);
          put('fromDate', values.fromDate ?? undefined);
          put('toDate', toDate ?? undefined);
          put('plantType', values.plantType.trim() || undefined);
          put(
            'numberOfSeeds',
            values.numberOfSeeds === '' ? undefined : Number(values.numberOfSeeds),
          );
          put('growingMedium', values.growingMedium.trim() || undefined);
          put('picId', values.picId ?? undefined);
          put('diaryTemplateCode', values.diaryTemplateCode ?? undefined);
          return extra;
        };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Crop snapshot missing');
          
          const updated = await useCropStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch: {
              code: values.code,
              name: values.name.trim(),
              greenhouseCode: values.greenhouseCode,
              extra: buildExtra(snapshot.extra),
            },
          });
          snapshotRef.current = updated as Crop;
          notifications.show({ color: 'green', message: t('crops.notifications.updateSuccess') });
          navigate(ROUTES.CROPS.DETAIL.replace(':id', id));
        } else {
          
          
          if (values.status === 'growing') {
            const occupant = findGrowingCropInGreenhouse(
              useCropStore.getState().items as Crop[],
              values.greenhouseCode,
            );
            if (occupant) {
              notifications.show({
                color: 'red',
                message: t('crops.notifications.occupied', { code: occupant.code }),
                autoClose: 8000,
              });
              setLoading(false);
              return;
            }
          }
          const created = await useCropStore.getState().createSafely({
            patch: {
              code: values.code,
              name: values.name.trim(),
              greenhouseCode: values.greenhouseCode,
              status: values.status,
              ...(values.status === 'growing' && { plantedAt: Date.now() }),
              extra: buildExtra(),
            },
          });
          notifications.show({ color: 'green', message: t('crops.notifications.createSuccess') });
          
          
          try {
            await autoApplyDiaryTemplateOnCreate({
              diaryTemplateCode: values.diaryTemplateCode,
              fromDate: values.fromDate,
              cropId: created.id,
              cropCode: created.code,
            });
          } catch {
            notifications.show({
              color: 'yellow',
              message: t('cropDiaries.notifications.applyTemplateError'),
              autoClose: 8000,
            });
          }
          navigate(ROUTES.CROPS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Crop;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('crops.notifications.updateError')
              : t('crops.notifications.createError'),
            autoClose: 8000,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.CROPS.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('crops.editItem') : t('crops.addItem');

  return (
    <Stack gap="lg">
      {!isMobile && (
        <Group gap="sm">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
        </Group>
      )}

      <Title order={isMobile ? 4 : 3}>{pageTitle}</Title>

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design; the internal ref read is safe. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <IconPlant2 size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('crops.form.primarySection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="md">
              <TextInput
                label={t('common.labels.name')}
                placeholder={t('crops.form.namePlaceholder')}
                withAsterisk
                size="md"
                {...form.getInputProps('name')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('crops.form.codeAutoLabel')}
                  leftSection={<IconHash size={14} />}
                  disabled={isEdit}
                  styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                  {...form.getInputProps('code')}
                />
                <Select
                  label={t('crops.form.greenhouseLabel')}
                  placeholder={t('crops.form.greenhousePlaceholder')}
                  data={greenhouseOptions}
                  withAsterisk
                  searchable
                  nothingFoundMessage={t('crops.form.noGreenhouses')}
                  {...form.getInputProps('greenhouseCode')}
                />
              </SimpleGrid>
              {!isEdit && (
                <Select
                  label={t('crops.form.statusLabel')}
                  data={[
                    { value: 'planned', label: t('crops.status.planned') },
                    { value: 'growing', label: t('crops.status.growing') },
                  ]}
                  allowDeselect={false}
                  {...form.getInputProps('status')}
                />
              )}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <DateField
                  label={t('crops.form.fromDateLabel')}
                  valueFormat="DD/MM/YYYY"
                  withAsterisk
                  clearable={false}
                  leftSection={<IconCalendar size={14} />}
                  {...form.getInputProps('fromDate')}
                />
                <NumberInput
                  label={t('crops.form.totalDatesLabel')}
                  placeholder={t('crops.form.totalDatesPlaceholder')}
                  withAsterisk
                  min={1}
                  allowNegative={false}
                  allowDecimal={false}
                  leftSection={<IconCalendar size={14} />}
                  {...form.getInputProps('totalDates')}
                />
              </SimpleGrid>
              <Divider label={t('crops.form.secondarySection')} labelPosition="left" />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('crops.form.plantTypeLabel')}
                  placeholder={t('crops.form.plantTypePlaceholder')}
                  {...form.getInputProps('plantType')}
                />
                <NumberInput
                  label={t('crops.form.numberOfSeedsLabel')}
                  placeholder={t('crops.form.numberOfSeedsPlaceholder')}
                  withAsterisk
                  min={1}
                  allowNegative={false}
                  allowDecimal={false}
                  {...form.getInputProps('numberOfSeeds')}
                />
                <TextInput
                  label={t('crops.form.growingMediumLabel')}
                  placeholder={t('crops.form.growingMediumPlaceholder')}
                  {...form.getInputProps('growingMedium')}
                />
                <EmployeeSelector
                  label={t('crops.form.picLabel')}
                  placeholder={t('crops.form.picPlaceholder')}
                  clearable
                  value={form.values.picId}
                  onChange={(sel) => form.setFieldValue('picId', sel?.id ?? null)}
                />
              </SimpleGrid>
              <Select
                label={t('crops.form.diaryTemplateLabel')}
                placeholder={t('crops.form.diaryTemplatePlaceholder')}
                data={templateOptions}
                searchable
                withAsterisk={!isEdit}
                value={form.values.diaryTemplateCode}
                error={form.errors.diaryTemplateCode}
                onChange={(value) => {
                  form.setFieldValue('diaryTemplateCode', value);
                  
                  if (value) {
                    const tpl = templates.find((tp) => tp.code === value);
                    if (tpl) form.setFieldValue('totalDates', templateDayCount(tpl));
                  }
                }}
              />
              <Textarea
                label={t('__new__.01-common.labels.note')}
                placeholder={t('crops.form.notesPlaceholder')}
                autosize
                minRows={2}
                maxRows={6}
                {...form.getInputProps('notes')}
              />
            </Stack>
          </Card>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={loading} onClick={navigateToList}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('__new__.01-common.actions.save') : t('crops.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
