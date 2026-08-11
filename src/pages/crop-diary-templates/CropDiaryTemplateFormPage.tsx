import {
  Alert,
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
  IconCopy,
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
import { useLocation, useNavigate, useParams } from 'react-router';
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
  CropDiaryTemplateCopyFrom,
  CropDiaryTemplateExtra,
  CropProcessPlan,
  SheetColumn,
  PlanPreparation,
  SheetDay,
  SheetStage,
} from '@/types';
import { ProcessColumnsEditor } from './plan/ProcessColumnsEditor';
import { ProcessGridEditor } from './plan/ProcessGridEditor';
import { ProcessMemosEditor } from './plan/ProcessMemosEditor';
import { ProcessPreparationEditor } from './plan/ProcessPreparationEditor';
import { ProcessStagesEditor } from './plan/ProcessStagesEditor';

const isMobile = device.isMobile;

type FormValues = {
  code: string;
  name: string;
  description: string;
  totalDays: number | string;
  referencePlantCount: number | string;
  adjustmentRate: number | string;
  target: string;
  seedCount: number | string;
};

type PlanDraft = {
  columns: SheetColumn[];
  stages: SheetStage[];
  days: SheetDay[];
  preparation: PlanPreparation[];

  memos: string[];
};

const EMPTY_PLAN: PlanDraft = {
  columns: [],
  stages: [],
  days: [{ day: 1, values: {} }],
  preparation: [],
  memos: [],
};

function planOf(tpl: CropDiaryTemplate): CropProcessPlan {
  return (
    tpl.extra?.plan ?? { columns: [], stages: [], totalDays: 1, days: [{ day: 1, values: {} }] }
  );
}

export function CropDiaryTemplateFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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

  const copyFrom = !isEdit
    ? (location.state as { copyFrom?: CropDiaryTemplateCopyFrom } | null)?.copyFrom
    : undefined;

  const [plan, setPlan] = useState<PlanDraft>(() =>
    copyFrom
      ? {
          columns: copyFrom.plan.columns,
          stages: copyFrom.plan.stages,
          days: resizeSheetDays(copyFrom.plan.days, copyFrom.plan.totalDays),
          preparation: copyFrom.plan.preparation ?? [],
          memos: copyFrom.plan.memos ?? [],
        }
      : EMPTY_PLAN,
  );

  const [columnsError, setColumnsError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      code: '',
      name: copyFrom?.name ?? '',
      description: copyFrom?.description ?? '',
      totalDays: copyFrom?.plan.totalDays ?? 1,
      referencePlantCount: copyFrom?.plan.referencePlantCount ?? '',
      adjustmentRate: copyFrom?.plan.referenceAdjustmentRate ?? '',
      target: copyFrom?.plan.target ?? '',
      seedCount: copyFrom?.plan.referenceSeedCount ?? '',
    },
    validate: {
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      totalDays: (v) =>
        v !== '' && Number(v) >= 1 ? null : t('cropDiaryTemplates.validation.totalDatesRequired'),
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
      const loaded = planOf(tpl);

      setPlan({
        columns: loaded.columns,
        stages: loaded.stages,
        days: resizeSheetDays(loaded.days, loaded.totalDays),
        preparation: loaded.preparation ?? [],
        memos: loaded.memos ?? [],
      });
      return {
        code: tpl.code,
        name: tpl.name,
        description: tpl.extra?.description ?? '',
        totalDays: loaded.totalDays,
        referencePlantCount: loaded.referencePlantCount ?? '',
        adjustmentRate: loaded.referenceAdjustmentRate ?? '',
        target: loaded.target ?? '',
        seedCount: loaded.referenceSeedCount ?? '',
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

  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  });

  const handleTotalDaysChange = useCallback((v: number | string) => {
    const n = v === '' ? 0 : Math.floor(Number(v));
    formRef.current.setFieldValue('totalDays', v);
    setPlan((p) => ({ ...p, days: resizeSheetDays(p.days, n) }));
  }, []);

  const handleColumnsChange = useCallback((columns: SheetColumn[]) => {
    setPlan((p) => ({ ...p, columns }));
    setColumnsError(null);
  }, []);
  const handleStagesChange = useCallback(
    (stages: SheetStage[]) => setPlan((p) => ({ ...p, stages })),
    [],
  );
  const handleDaysChange = useCallback((days: SheetDay[]) => setPlan((p) => ({ ...p, days })), []);
  const handleMemosChange = useCallback((memos: string[]) => setPlan((p) => ({ ...p, memos })), []);
  const handlePreparationChange = useCallback(
    (preparation: PlanPreparation[]) => setPlan((p) => ({ ...p, preparation })),
    [],
  );

  const currentPlan = useCallback((): CropProcessPlan => {
    const values = formRef.current.getValues();
    return cleanPlan({
      columns: plan.columns,
      stages: plan.stages,
      totalDays: Number(values.totalDays) || 0,
      days: plan.days,
      ...(plan.preparation.length && { preparation: plan.preparation }),
      ...(Number(values.referencePlantCount) > 0 && {
        referencePlantCount: Number(values.referencePlantCount),
      }),
      ...(Number(values.adjustmentRate) > 0 && {
        referenceAdjustmentRate: Number(values.adjustmentRate),
      }),
      ...(values.target.trim() && { target: values.target.trim() }),
      ...(Number(values.seedCount) > 0 && { referenceSeedCount: Number(values.seedCount) }),
      ...(plan.memos.length && { memos: plan.memos }),
    });
  }, [plan]);

  const handleImport = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const parsed = await parseCropSheetFile(file, { resolveMaterialCode });
        formRef.current.setFieldValue('totalDays', parsed.plan.totalDays);
        formRef.current.setFieldValue('referencePlantCount', parsed.plan.referencePlantCount ?? '');
        formRef.current.setFieldValue('adjustmentRate', parsed.plan.referenceAdjustmentRate ?? '');
        formRef.current.setFieldValue('target', parsed.plan.target ?? '');
        formRef.current.setFieldValue('seedCount', parsed.plan.referenceSeedCount ?? '');
        setPlan((p) => ({
          ...p,
          columns: parsed.plan.columns,
          stages: parsed.plan.stages,
          days: parsed.plan.days,
          ...(parsed.plan.preparation && { preparation: parsed.plan.preparation }),
          ...(parsed.plan.memos && { memos: parsed.plan.memos }),
        }));
        setColumnsError(null);

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
    [t, resolveMaterialCode],
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
      if (!plan.columns.some((c) => c.label.trim())) {
        setColumnsError(t('cropDiaryTemplates.validation.activityRequired'));
        return;
      }
      setLoading(true);
      try {
        const built = currentPlan();
        const buildExtra = (base?: CropDiaryTemplateExtra): CropDiaryTemplateExtra => {
          const extra: CropDiaryTemplateExtra = { ...(base ?? {}) };
          if (values.description.trim()) extra.description = values.description.trim();
          else delete extra.description;
          extra.plan = built;
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

              extra: buildExtra(copyFrom ? { copyFromId: copyFrom.sourceId } : undefined),
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
    [currentPlan, plan.columns, copyFrom, id, isEdit, navigate, t],
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

        {/* Without this, a form that arrives already holding 65 days of someone
            else's doses reads as a bug. It also makes the one lossy part of
            routing through `location.state` visible: refresh drops the copy,
            and the banner going away is the signal. */}
        {copyFrom && (
          <Alert icon={<IconCopy size={16} />} color="blue" variant="light" radius="md" py="xs">
            {t('cropDiaryTemplates.form.copyingFrom', { code: copyFrom.sourceCode })}
          </Alert>
        )}

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
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              <TextInput
                label={t('cropDiaryTemplates.plan.target')}
                description={t('cropDiaryTemplates.plan.targetHint')}
                placeholder="PI 52"
                {...form.getInputProps('target')}
              />
              <NumberInput
                label={t('cropDiaryTemplates.plan.seedCount')}
                description={t('cropDiaryTemplates.plan.seedCountHint')}
                min={0}
                allowNegative={false}
                allowDecimal={false}
                thousandSeparator=","
                {...form.getInputProps('seedCount')}
              />
            </SimpleGrid>
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
            <ProcessColumnsEditor columns={plan.columns} onChange={handleColumnsChange} />
            {columnsError && (
              <Text size="xs" c="red" mt="xs">
                {columnsError}
              </Text>
            )}
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={600} size="sm">
              {t('cropDiaryTemplates.plan.memosSection')}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              {t('cropDiaryTemplates.plan.memosSectionHint')}
            </Text>
            <ProcessMemosEditor memos={plan.memos} onChange={handleMemosChange} />
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={600} size="sm">
              {t('cropDiaryTemplates.plan.preparationSection')}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              {t('cropDiaryTemplates.plan.preparationSectionHint')}
            </Text>
            <ProcessPreparationEditor
              preparation={plan.preparation}
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
              stages={plan.stages}
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
                columns={plan.columns}
                days={plan.days}
                stages={plan.stages}
                onChange={handleDaysChange}
              />
            </ScrollArea.Autosize>
          </Card>
        </Stack>
      </Stack>
    </Form>
  );
}
