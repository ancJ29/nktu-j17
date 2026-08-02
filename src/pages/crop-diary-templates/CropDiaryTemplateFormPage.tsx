import {
  Button,
  Card,
  Divider,
  FileButton,
  Group,
  NumberInput,
  ScrollArea,
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
import {
  IconArrowLeft,
  IconClipboardList,
  IconDeviceFloppy,
  IconDownload,
  IconDroplet,
  IconFileSpreadsheet,
  IconHash,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import {
  useCropDiaryTemplateStore,
  CROP_DIARY_TEMPLATE_RECORD_TARGET,
} from '@/stores/useCropDiaryTemplateStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import {
  cleanDays,
  cleanWatering,
  dayHasContent,
  daysToRows,
  deriveSteps,
  makeEmptyDay,
  resizeDays,
  rowsToDays,
  templateWatering,
} from '@/utils/cropDiaryTemplateModel';
import {
  downloadCropDiaryTemplateSample,
  exportCropDiaryTemplateRows,
  parseCropDiaryTemplateFile,
} from '@/utils/cropDiaryTemplateExcel';
import { perms } from '@/utils/permission';
import type {
  CropDiaryTemplate,
  CropDiaryTemplateExtra,
  CropTemplateWatering,
  TemplateDay,
} from '@/types';
import { TemplateDaysEditor } from './TemplateDaysEditor';
import { WateringPlanEditor } from './WateringPlanEditor';

const isMobile = device.isMobile;

type FormValues = {
  code: string;
  name: string;
  description: string;
  totalDates: number | string;
  days: TemplateDay[];
  watering: CropTemplateWatering;
};

const BLANK_WATERING: CropTemplateWatering = { activity: '', unit: '' };

function daysFromTemplate(tpl: CropDiaryTemplate): TemplateDay[] {
  if (tpl.extra?.days?.length) return tpl.extra.days;
  if (tpl.steps.length) {
    return tpl.steps.map((s, i) => ({
      day: i + 1,
      activity: s.activity,
      materials: [],
      ...(s.defaultNotes && { memo: s.defaultNotes }),
    }));
  }
  return [makeEmptyDay(1)];
}

export function CropDiaryTemplateFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.cropDiaryTemplate.canEdit()) ||
      (!isEdit && !perms.cropDiaryTemplate.canCreate())
    ) {
      navigate(ROUTES.CROP_DIARY_TEMPLATES.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const resetFileRef = useRef<() => void>(null);
  const snapshotRef = useRef<CropDiaryTemplate | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      code: '',
      name: '',
      description: '',
      totalDates: 1,
      days: [makeEmptyDay(1)],
      watering: BLANK_WATERING,
    },
    validate: {
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      totalDates: (v) =>
        v !== '' && Number(v) >= 1 ? null : t('cropDiaryTemplates.validation.totalDatesRequired'),
      days: (days) =>
        days.some((d) => d.activity.trim())
          ? null
          : t('cropDiaryTemplates.validation.activityRequired'),
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(CROP_DIARY_TEMPLATE_RECORD_TARGET, {
        id,
      });
      const tpl = res.item as CropDiaryTemplate;
      snapshotRef.current = tpl;
      const days = daysFromTemplate(tpl);
      return {
        code: tpl.code,
        name: tpl.name,
        description: tpl.extra?.description ?? '',
        totalDates: days.length,
        days,
        watering: templateWatering(tpl) ?? BLANK_WATERING,
      };
    },
    () => {
      notifications.show({
        color: 'red',
        message: t('cropDiaryTemplates.notifications.fetchError'),
      });
      navigate(ROUTES.CROP_DIARY_TEMPLATES.LIST);
    },
  );

  const handleTotalDatesChange = useCallback(
    (v: number | string) => {
      const n = v === '' ? 0 : Math.floor(Number(v));
      form.setFieldValue('totalDates', v);
      form.setFieldValue('days', resizeDays(form.getValues().days, n));
    },
    [form],
  );

  const handleDaysChange = useCallback(
    (days: TemplateDay[]) => form.setFieldValue('days', days),
    [form],
  );

  const handleWateringChange = useCallback(
    (watering: CropTemplateWatering) => form.setFieldValue('watering', watering),
    [form],
  );

  const handleImport = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const rows = await parseCropDiaryTemplateFile(file);
        const { days, unknownMaterials } = rowsToDays(rows, (code: string) => code);
        if (unknownMaterials.length > 0) {
          notifications.show({
            color: 'red',
            message: t('cropDiaryTemplates.excel.unknownMaterials', {
              names: unknownMaterials.join(', '),
            }),
            autoClose: 10000,
          });
          return;
        }
        const next = days.length ? days : [makeEmptyDay(1)];
        form.setFieldValue('totalDates', next.length);
        form.setFieldValue('days', next);
        notifications.show({
          color: 'green',
          message: t('cropDiaryTemplates.excel.importSuccess', { count: next.length }),
        });
      } catch {
        notifications.show({
          color: 'red',
          message: t('cropDiaryTemplates.excel.importError'),
          autoClose: 8000,
        });
      } finally {
        resetFileRef.current?.();
      }
    },
    [form, t],
  );

  const excelLabels = useCallback(
    () => ({
      day: t('cropDiaryTemplates.excel.colDay'),
      activity: t('cropDiaryTemplates.excel.colActivity'),
      material: t('cropDiaryTemplates.excel.colMaterial'),
      quantity: t('cropDiaryTemplates.excel.colQuantity'),
      unit: t('cropDiaryTemplates.excel.colUnit'),
      memo: t('__new__.01-common.labels.note'),
      sheetName: t('cropDiaryTemplates.excel.sheetName'),
    }),
    [t],
  );

  const handleExport = useCallback(() => {
    const days = cleanDays(form.getValues().days);
    if (!days.some(dayHasContent)) {
      notifications.show({ color: 'red', message: t('cropDiaryTemplates.excel.nothingToExport') });
      return;
    }
    const rows = daysToRows(days, (code: string) => code);
    const code = form.getValues().code.trim() || 'template';
    exportCropDiaryTemplateRows(rows, excelLabels(), `crop_diary_template_${code}.xlsx`);
  }, [form, t, excelLabels]);

  const handleDownloadSample = useCallback(() => {
    const placeholder = t('cropDiaryTemplates.excel.sampleMaterial');
    downloadCropDiaryTemplateSample(
      excelLabels(),
      {
        activityWithMaterial: t('cropDiaryTemplates.excel.sampleActivityWithMaterial'),
        activityPlain: t('cropDiaryTemplates.excel.sampleActivityPlain'),
        memo: t('cropDiaryTemplates.excel.sampleMemo'),
        materialNames: [placeholder, placeholder],
        unit: 'kg',
      },
      'crop_diary_template_sample.xlsx',
    );
  }, [t, excelLabels]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      setLoading(true);
      try {
        const days = cleanDays(values.days);
        const steps = deriveSteps(days);
        const buildExtra = (base?: CropDiaryTemplateExtra): CropDiaryTemplateExtra => {
          const extra: CropDiaryTemplateExtra = { ...(base ?? {}) };
          if (values.description.trim()) extra.description = values.description.trim();
          else delete extra.description;
          extra.totalDates = days.length;
          extra.days = days;

          const watering = cleanWatering(values.watering);
          if (watering) extra.watering = watering;
          else delete extra.watering;
          return extra;
        };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Template snapshot missing');
          const updated = await useCropDiaryTemplateStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch: {
              code: values.code.trim(),
              name: values.name.trim(),
              steps,
              extra: buildExtra(snapshot.extra),
            },
          });
          snapshotRef.current = updated as CropDiaryTemplate;
          notifications.show({
            color: 'green',
            message: t('cropDiaryTemplates.notifications.updateSuccess'),
          });
          navigate(ROUTES.CROP_DIARY_TEMPLATES.DETAIL.replace(':id', id));
        } else {
          const created = await useCropDiaryTemplateStore.getState().createSafely({
            patch: {
              code: values.code.trim(),
              name: values.name.trim(),
              steps,
              extra: buildExtra(),
            },
          });
          notifications.show({
            color: 'green',
            message: t('cropDiaryTemplates.notifications.createSuccess'),
          });
          navigate(ROUTES.CROP_DIARY_TEMPLATES.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as CropDiaryTemplate;
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
              ? t('cropDiaryTemplates.notifications.updateError')
              : t('cropDiaryTemplates.notifications.createError'),
            autoClose: 8000,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.CROP_DIARY_TEMPLATES.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('cropDiaryTemplates.editItem') : t('cropDiaryTemplates.addItem');
  const saveLabel = isEdit
    ? t('__new__.01-common.actions.save')
    : t('cropDiaryTemplates.form.createButton');

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        {/* Top action bar — Cancel + Save reachable without scrolling past a long
            day plan. */}
        <Group justify="space-between">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
          <Group gap="xs">
            <Button variant="default" size="compact-sm" disabled={loading} onClick={navigateToList}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              loading={loading}
              size="compact-sm"
              leftSection={<IconDeviceFloppy size={14} />}
            >
              {saveLabel}
            </Button>
          </Group>
        </Group>

        <Title order={3}>{pageTitle}</Title>

        <Stack gap="md">
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <IconClipboardList size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('cropDiaryTemplates.form.primarySection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('common.labels.name')}
                  placeholder={t('cropDiaryTemplates.form.namePlaceholder')}
                  withAsterisk
                  {...form.getInputProps('name')}
                />
                <TextInput
                  label={t('common.labels.code')}
                  placeholder={t('cropDiaryTemplates.form.codePlaceholder')}
                  leftSection={<IconHash size={14} />}
                  withAsterisk
                  disabled={isEdit}
                  styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                  {...form.getInputProps('code')}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <NumberInput
                  label={t('cropDiaryTemplates.form.totalDatesLabel')}
                  placeholder={t('cropDiaryTemplates.form.totalDatesPlaceholder')}
                  withAsterisk
                  min={1}
                  max={365}
                  allowNegative={false}
                  allowDecimal={false}
                  value={form.getValues().totalDates}
                  onChange={handleTotalDatesChange}
                  error={form.errors.totalDates}
                />
              </SimpleGrid>
              <Textarea
                label={t('cropDiaryTemplates.form.descriptionLabel')}
                placeholder={t('cropDiaryTemplates.form.descriptionPlaceholder')}
                autosize
                minRows={2}
                maxRows={5}
                {...form.getInputProps('description')}
              />
            </Stack>
          </Card>

          {/* Above the day plan: watering is the job that runs through every day
              of the cycle, so it reads as the backdrop the dated work sits on. */}
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <IconDroplet size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('cropDiaryTemplates.watering.section')}
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="md">
              {t('cropDiaryTemplates.watering.sectionHint')}
            </Text>
            <WateringPlanEditor
              value={form.getValues().watering}
              onChange={handleWateringChange}
              days={form.getValues().days}
              onDaysChange={handleDaysChange}
            />
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="xs" wrap="wrap">
              <Text fw={600} size="sm">
                {t('cropDiaryTemplates.form.daysSection')}
              </Text>
              <Group gap="xs">
                <Button
                  size="compact-sm"
                  variant="subtle"
                  leftSection={<IconFileSpreadsheet size={14} />}
                  onClick={handleDownloadSample}
                >
                  {t('cropDiaryTemplates.excel.sample')}
                </Button>
                <FileButton onChange={handleImport} accept=".xlsx,.xls" resetRef={resetFileRef}>
                  {(props) => (
                    <Button
                      {...props}
                      size="compact-sm"
                      variant="default"
                      leftSection={<IconUpload size={14} />}
                    >
                      {t('cropDiaryTemplates.excel.import')}
                    </Button>
                  )}
                </FileButton>
                <Button
                  size="compact-sm"
                  variant="default"
                  leftSection={<IconDownload size={14} />}
                  onClick={handleExport}
                >
                  {t('__new__.01-common.actions.exportExcel')}
                </Button>
              </Group>
            </Group>
            <Divider mb="md" />
            {/* Bounded scroll region so a long day plan stays inside the card. */}
            <ScrollArea.Autosize mah="calc(100vh - 420px)" type="auto" offsetScrollbars>
              <TemplateDaysEditor
                days={form.getValues().days}
                onChange={handleDaysChange}
                waterUnit={form.getValues().watering.unit?.trim() || undefined}
              />
            </ScrollArea.Autosize>
            {typeof form.errors.days === 'string' && (
              <Text size="xs" c="red" mt="xs">
                {form.errors.days}
              </Text>
            )}
          </Card>
        </Stack>
      </Stack>
    </form>
  );
}
