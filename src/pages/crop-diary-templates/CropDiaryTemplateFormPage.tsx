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
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalendar,
  IconClipboardList,
  IconDeviceFloppy,
  IconDownload,
  IconFileSpreadsheet,
  IconHash,
  IconUpload,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { cMngtConnector } from '@credo/connectors/connector';
import { Form } from '@/components/Form';
import { ROUTES } from '@/constants/routes';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import {
  useCropDiaryTemplateStore,
  CROP_DIARY_TEMPLATE_RECORD_TARGET,
} from '@/stores/useCropDiaryTemplateStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { cleanPlan, resizeSheetDays } from '@/utils/cropSheetModel';
import { exportCropSheet, parseCropSheetFile } from '@/utils/cropSheetExcel';
import { perms } from '@/utils/permission';
import type {
  CropDiaryTemplate,
  CropDiaryTemplateExtra,
  CropProcessPlan,
  SheetColumn,
  PlanPreparation,
  SheetDay,
  SheetStage,
} from '@/types';
import { ProcessColumnsEditor } from './plan/ProcessColumnsEditor';
import { ProcessGridEditor } from './plan/ProcessGridEditor';
import { ProcessPreparationEditor } from './plan/ProcessPreparationEditor';
import { ProcessStagesEditor } from './plan/ProcessStagesEditor';

const isMobile = device.isMobile;

type FormValues = {
  code: string;
  name: string;
  description: string;
  totalDays: number | string;
  columns: SheetColumn[];
  stages: SheetStage[];
  days: SheetDay[];
  preparation: PlanPreparation[];
  referencePlantCount: number | string;
  adjustmentRate: number | string;
};

function planOf(tpl: CropDiaryTemplate): CropProcessPlan {
  return (
    tpl.extra?.plan ?? { columns: [], stages: [], totalDays: 1, days: [{ day: 1, values: {} }] }
  );
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

  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  useEffect(() => {
    if (!materialsInitialized) loadMaterials();
  }, [materialsInitialized, loadMaterials]);

  const resolveMaterialCode = useMemo(() => {
    const byName = new Map<string, string>();
    for (const m of materials) {
      byName.set(m.name.trim().toLowerCase(), m.code);
      byName.set(m.code.trim().toLowerCase(), m.code);
    }
    return (label: string) => byName.get(label.trim().toLowerCase());
  }, [materials]);

  const form = useForm<FormValues>({
    initialValues: {
      code: '',
      name: '',
      description: '',
      totalDays: 1,
      columns: [],
      stages: [],
      days: [{ day: 1, values: {} }],
      preparation: [],
      referencePlantCount: '',
      adjustmentRate: '',
    },
    validate: {
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      totalDays: (v) =>
        v !== '' && Number(v) >= 1 ? null : t('cropDiaryTemplates.validation.totalDatesRequired'),
      columns: (columns) =>
        columns.some((c) => c.label.trim())
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
      const plan = planOf(tpl);
      return {
        code: tpl.code,
        name: tpl.name,
        description: tpl.extra?.description ?? '',
        totalDays: plan.totalDays,
        columns: plan.columns,
        stages: plan.stages,
        days: resizeSheetDays(plan.days, plan.totalDays),
        preparation: plan.preparation ?? [],
        referencePlantCount: plan.referencePlantCount ?? '',
        adjustmentRate: plan.referenceAdjustmentRate ?? '',
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

  const handleTotalDaysChange = useCallback(
    (v: number | string) => {
      const n = v === '' ? 0 : Math.floor(Number(v));
      form.setFieldValue('totalDays', v);
      form.setFieldValue('days', resizeSheetDays(form.getValues().days, n));
    },
    [form],
  );

  const handleColumnsChange = useCallback(
    (columns: SheetColumn[]) => form.setFieldValue('columns', columns),
    [form],
  );
  const handleStagesChange = useCallback(
    (stages: SheetStage[]) => form.setFieldValue('stages', stages),
    [form],
  );
  const handleDaysChange = useCallback(
    (days: SheetDay[]) => form.setFieldValue('days', days),
    [form],
  );
  const handlePreparationChange = useCallback(
    (preparation: PlanPreparation[]) => form.setFieldValue('preparation', preparation),
    [form],
  );

  const currentPlan = useCallback((): CropProcessPlan => {
    const values = form.getValues();
    return cleanPlan({
      columns: values.columns,
      stages: values.stages,
      totalDays: Number(values.totalDays) || 0,
      days: values.days,
      ...(values.preparation.length && { preparation: values.preparation }),
      ...(Number(values.referencePlantCount) > 0 && {
        referencePlantCount: Number(values.referencePlantCount),
      }),
      ...(Number(values.adjustmentRate) > 0 && {
        referenceAdjustmentRate: Number(values.adjustmentRate),
      }),
    });
  }, [form]);

  const handleImport = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const parsed = await parseCropSheetFile(file, { resolveMaterialCode });
        form.setFieldValue('totalDays', parsed.plan.totalDays);
        form.setFieldValue('columns', parsed.plan.columns);
        form.setFieldValue('stages', parsed.plan.stages);
        form.setFieldValue('days', parsed.plan.days);
        form.setFieldValue('referencePlantCount', parsed.plan.referencePlantCount ?? '');
        form.setFieldValue('adjustmentRate', parsed.plan.referenceAdjustmentRate ?? '');

        notifications.show({
          color: 'green',
          message: t('cropDiaryTemplates.plan.importedColumns', {
            columns: parsed.plan.columns.length,
            days: parsed.plan.totalDays,
          }),
        });

        const unlinked = parsed.plan.columns
          .filter((c) => c.kind === 'material' && !c.materialCode)
          .map((c) => c.label);
        if (unlinked.length) {
          notifications.show({
            color: 'yellow',
            message: t('cropDiaryTemplates.plan.importUnmatched', { names: unlinked.join(', ') }),
            autoClose: 12000,
          });
        }
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
    [form, t, resolveMaterialCode],
  );

  const handleExport = useCallback(() => {
    const plan = currentPlan();
    if (!plan.columns.length) {
      notifications.show({ color: 'red', message: t('cropDiaryTemplates.excel.nothingToExport') });
      return;
    }
    const code = form.getValues().code.trim() || 'template';
    exportCropSheet(
      plan,
      {
        stage: t('cropDiaryTemplates.plan.stage'),
        day: t('cropDiaryTemplates.plan.day'),
        date: 'Ngày thực tế',
        weekday: 'Thứ',
        totals: 'TỔNG PHÂN',
        sheetName: t('cropDiaryTemplates.excel.sheetName'),
      },
      `crop_process_${code}.xlsx`,
    );
  }, [currentPlan, form, t]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      setLoading(true);
      try {
        const plan = currentPlan();
        const buildExtra = (base?: CropDiaryTemplateExtra): CropDiaryTemplateExtra => {
          const extra: CropDiaryTemplateExtra = { ...(base ?? {}) };
          if (values.description.trim()) extra.description = values.description.trim();
          else delete extra.description;
          extra.plan = plan;
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

              steps: [],
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
            color: 'red',
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
    [currentPlan, id, isEdit, navigate, t],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.CROP_DIARY_TEMPLATES.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('cropDiaryTemplates.editItem') : t('cropDiaryTemplates.addItem');
  const saveLabel = isEdit
    ? t('__new__.01-common.actions.save')
    : t('cropDiaryTemplates.form.createButton');
  const values = form.getValues();

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Stack gap="lg">
        {/* Top action bar — Cancel + Save reachable without scrolling past a
            65-row grid. */}
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

          {/* Sizing sits above the grid because it changes what every dose in it
              means — the same numbers read differently at another house size. */}
          <Card withBorder radius="md" padding="lg">
            <Text fw={600} size="sm" mb="xs">
              {t('cropDiaryTemplates.plan.sizingSection')}
            </Text>
            <Divider mb="md" />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <NumberInput
                label={t('cropDiaryTemplates.plan.totalDays')}
                description={' '}
                withAsterisk
                min={1}
                max={365}
                allowNegative={false}
                allowDecimal={false}
                value={values.totalDays}
                onChange={handleTotalDaysChange}
                error={form.errors.totalDays}
              />
              <NumberInput
                label={t('cropDiaryTemplates.plan.referencePlantCount')}
                description={t('cropDiaryTemplates.plan.referencePlantCountHint')}
                min={0}
                allowNegative={false}
                allowDecimal={false}
                thousandSeparator=","
                {...form.getInputProps('referencePlantCount')}
              />
              <NumberInput
                label={t('cropDiaryTemplates.plan.adjustmentRate')}
                description={t('cropDiaryTemplates.plan.adjustmentRateHint')}
                min={0}
                max={2}
                step={0.05}
                decimalScale={3}
                allowNegative={false}
                {...form.getInputProps('adjustmentRate')}
              />
            </SimpleGrid>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={600} size="sm">
              {t('cropDiaryTemplates.plan.columnsSection')}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              {t('cropDiaryTemplates.plan.columnsSectionHint')}
            </Text>
            <ProcessColumnsEditor columns={values.columns} onChange={handleColumnsChange} />
            {typeof form.errors.columns === 'string' && (
              <Text size="xs" c="red" mt="xs">
                {form.errors.columns}
              </Text>
            )}
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={600} size="sm">
              {t('cropDiaryTemplates.plan.preparationSection')}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              {t('cropDiaryTemplates.plan.preparationSectionHint')}
            </Text>
            <ProcessPreparationEditor
              preparation={values.preparation}
              onChange={handlePreparationChange}
            />
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={600} size="sm">
              {t('cropDiaryTemplates.plan.stagesSection')}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              {t('cropDiaryTemplates.plan.stagesSectionHint')}
            </Text>
            <ProcessStagesEditor
              stages={values.stages}
              totalDays={Number(values.totalDays) || 1}
              onChange={handleStagesChange}
            />
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="xs" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon size={28} radius="md" variant="light" color="primary">
                  <IconCalendar size={16} stroke={1.75} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {t('cropDiaryTemplates.plan.gridSection')}
                </Text>
              </Group>
              <Group gap="xs">
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
            <Text size="xs" c="dimmed" mb="md">
              <IconFileSpreadsheet size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {t('cropDiaryTemplates.plan.gridSectionHint')}
            </Text>
            <Divider mb="md" />
            {/* Bounded scroll region so a 65-day grid stays inside the card. */}
            <ScrollArea.Autosize mah="calc(100vh - 340px)" type="auto" offsetScrollbars>
              <ProcessGridEditor
                columns={values.columns}
                days={values.days}
                stages={values.stages}
                onChange={handleDaysChange}
              />
            </ScrollArea.Autosize>
          </Card>
        </Stack>
      </Stack>
    </Form>
  );
}
