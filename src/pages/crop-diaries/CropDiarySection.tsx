import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconFileText, IconPencil, IconPlus, IconTemplate, IconTrash } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePickerField } from '@/components/DatePickerField';
import { MaterialLinesEditor } from '@/components/MaterialLinesEditor';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import {
  createCropDiaryEntry,
  deleteCropDiaryEntry,
  queryCropDiary,
  updateCropDiaryEntry,
} from '@/stores/useCropDiaryStore';
import { applyTemplateToCropDiary } from '@/utils/cropDiaryTemplateApply';
import { aggregateCropMaterials, type CropMaterialTotal } from '@/utils/cropMaterialSummary';
import { templatePlanDays } from '@/utils/cropDiaryTemplateModel';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import type { CropDiaryEntry, CropDiaryExtra, TemplateMaterialLine } from '@/types';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function cleanMaterialLines(lines: TemplateMaterialLine[]): TemplateMaterialLine[] {
  return lines
    .filter((m) => m.materialCode.trim())
    .map((m) => ({
      materialCode: m.materialCode,
      ...(typeof m.quantity === 'number' && { quantity: m.quantity }),
      ...(m.unit?.trim() && { unit: m.unit.trim() }),
    }));
}

function datePart(value: CropDiaryEntry['entryDate']): string {
  return String(value).slice(0, 10);
}

type Props = {
  readonly cropId: string;
  readonly cropCode: string;
  
  readonly onSummaryChange?: (summary: CropMaterialTotal[]) => void;
};

const canView = perms.cropDiary.canView();
const canCreate = perms.cropDiary.canCreate();
const canEdit = perms.cropDiary.canEdit();
const canDelete = perms.cropDiary.canDelete();
const canViewTemplates = perms.cropDiaryTemplate.canView();

type EntryFormValues = {
  entryDate: string;
  activity: string;
  notes: string;
  materials: TemplateMaterialLine[];
};

export function CropDiarySection({ cropId, cropCode, onSummaryChange }: Props) {
  const { t } = useTranslation();

  const [entries, setEntries] = useState<CropDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  
  const [applying, setApplying] = useState(false);
  const [templateCode, setTemplateCode] = useState<string | null>(null);
  const [applyDate, setApplyDate] = useState(todayString());

  
  const [formOpened, formHandlers] = useDisclosure(false);
  const [editing, setEditing] = useState<CropDiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);

  
  const [deleteTarget, setDeleteTarget] = useState<CropDiaryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const templates = useCropDiaryTemplateStore((s) => s.items);
  const templatesInit = useCropDiaryTemplateStore((s) => s.initialized);
  const loadTemplates = useCropDiaryTemplateStore((s) => s.loadAll);

  
  const materials = useMaterialStore((s) => s.items);
  const materialsInit = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  const materialName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of materials) map.set(m.code, m.name);
    return (code: string) => map.get(code) ?? code;
  }, [materials]);

  const form = useForm<EntryFormValues>({
    initialValues: { entryDate: todayString(), activity: '', notes: '', materials: [] },
    validate: {
      entryDate: (v) => (v ? null : t('cropDiaries.validation.entryDateRequired')),
      activity: (v) => (v.trim() ? null : t('cropDiaries.validation.activityRequired')),
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await queryCropDiary(cropId));
    } catch {
      notifications.show({ color: 'red', message: t('cropDiaries.notifications.fetchError') });
    } finally {
      setLoading(false);
    }
  }, [cropId, t]);

  useEffect(() => {
    if (!canView) return;
    
    load();
    if (canViewTemplates && !templatesInit) loadTemplates();
    if (!materialsInit) loadMaterials();
  }, [load, templatesInit, loadTemplates, materialsInit, loadMaterials]);

  const templateOptions = useMemo(
    () => templates.map((tpl) => ({ value: tpl.code, label: `${tpl.name} (${tpl.code})` })),
    [templates],
  );

  
  
  
  const materialSummary = useMemo(() => aggregateCropMaterials(entries), [entries]);
  useEffect(() => {
    if (!loading) onSummaryChange?.(materialSummary);
  }, [loading, materialSummary, onSummaryChange]);

  const openAdd = useCallback(() => {
    setEditing(null);
    form.setValues({ entryDate: todayString(), activity: '', notes: '', materials: [] });
    form.resetDirty();
    formHandlers.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form identity is stable across renders
  }, [formHandlers]);

  const openEdit = useCallback(
    (entry: CropDiaryEntry) => {
      setEditing(entry);
      form.setValues({
        entryDate: datePart(entry.entryDate),
        activity: entry.activity,
        notes: entry.extra?.notes ?? '',
        
        materials: (entry.extra?.materials ?? []).map((m) => ({ ...m })),
      });
      form.resetDirty();
      formHandlers.open();
    },
    
    [formHandlers],
  );

  const handleSubmit = useCallback(
    async (values: EntryFormValues) => {
      setSaving(true);
      try {
        const materials = cleanMaterialLines(values.materials);
        if (editing) {
          
          
          const extra: CropDiaryExtra = { ...(editing.extra ?? {}) };
          if (values.notes.trim()) extra.notes = values.notes.trim();
          else delete extra.notes;
          if (materials.length > 0) extra.materials = materials;
          else delete extra.materials;
          await updateCropDiaryEntry({
            id: editing.id,
            cropId,
            version: editing.version,
            entryDate: values.entryDate,
            activity: values.activity.trim(),
            extra,
          });
          notifications.show({
            color: 'green',
            message: t('cropDiaries.notifications.updateSuccess'),
          });
        } else {
          const extra: CropDiaryExtra = {
            ...(values.notes.trim() && { notes: values.notes.trim() }),
            ...(materials.length > 0 && { materials }),
          };
          await createCropDiaryEntry({
            cropId,
            cropCode,
            entryDate: values.entryDate,
            activity: values.activity.trim(),
            extra,
          });
          notifications.show({
            color: 'green',
            message: t('cropDiaries.notifications.createSuccess'),
          });
        }
        formHandlers.close();
        setEditing(null);
        await load();
      } catch {
        notifications.show({
          color: 'red',
          message: editing
            ? t('cropDiaries.notifications.updateError')
            : t('cropDiaries.notifications.createError'),
          autoClose: 8000,
        });
      } finally {
        setSaving(false);
      }
    },
    [editing, cropId, cropCode, t, load, formHandlers],
  );

  
  
  
  const handleApply = useCallback(async () => {
    if (!templateCode) return;
    const tpl = templates.find((x) => x.code === templateCode);
    if (!tpl) return;
    setApplying(true);
    try {
      const count = await applyTemplateToCropDiary({
        cropId,
        cropCode,
        templateCode,
        startDate: applyDate,
        days: templatePlanDays(tpl),
      });
      notifications.show({
        color: 'green',
        message: t('cropDiaries.notifications.applyTemplateSuccess', { count }),
      });
      setTemplateCode(null);
      await load();
    } catch {
      notifications.show({
        color: 'red',
        message: t('cropDiaries.notifications.applyTemplateError'),
        autoClose: 8000,
      });
    } finally {
      setApplying(false);
    }
  }, [templateCode, templates, applyDate, cropId, cropCode, t, load]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCropDiaryEntry({ id: deleteTarget.id, cropId, version: deleteTarget.version });
      notifications.show({ color: 'green', message: t('cropDiaries.notifications.deleteSuccess') });
      setDeleteTarget(null);
      await load();
    } catch {
      notifications.show({
        color: 'red',
        message: t('cropDiaries.notifications.deleteError'),
        autoClose: 8000,
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, cropId, t, load]);

  if (!canView) return null;

  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" variant="light" color="primary">
            <IconFileText size={16} stroke={1.75} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('cropDiaries.sectionTitle')}
          </Text>
        </Group>
        {canCreate && (
          <Button
            onClick={openAdd}
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}
          >
            {t('cropDiaries.addItem')}
          </Button>
        )}
      </Group>

      {canCreate && canViewTemplates && templateOptions.length > 0 && (
        <>
          <Group gap="xs" align="flex-end" wrap="nowrap" mb="md">
            <Select
              style={{ flex: 1 }}
              size="sm"
              placeholder={t('cropDiaries.applyTemplatePlaceholder')}
              data={templateOptions}
              searchable
              value={templateCode}
              onChange={setTemplateCode}
              leftSection={<IconTemplate size={14} />}
            />
            <DatePickerField
              size="sm"
              clearable={false}
              value={applyDate}
              onChange={(v) => {
                if (v) setApplyDate(v);
              }}
            />
            <Button
              size="sm"
              variant="light"
              disabled={!templateCode}
              loading={applying}
              onClick={handleApply}
            >
              {t('cropDiaries.applyTemplateButton')}
            </Button>
          </Group>
          <Divider mb="md" />
        </>
      )}

      {loading ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : entries.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {t('cropDiaries.sectionEmpty')}
        </Text>
      ) : (
        <Stack gap={0}>
          {entries.map((entry, i) => (
            <div key={entry.id}>
              {i > 0 && <Divider />}
              <Group justify="space-between" wrap="nowrap" py="sm" gap="sm" align="flex-start">
                <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap={6} wrap="wrap" align="baseline">
                    <Text size="sm" fw={600}>
                      {entry.activity}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      ({formatDate(entry.entryDate)})
                    </Text>
                  </Group>
                  {entry.extra?.notes && (
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                      {entry.extra.notes}
                    </Text>
                  )}
                  {entry.extra?.materials && entry.extra.materials.length > 0 && (
                    <Stack gap={1} mt={2}>
                      <Text size="xs" c="dimmed" fw={600}>
                        {t('cropDiaries.materialsLabel')}
                      </Text>
                      {entry.extra.materials.map((m, idx) => (
                        <Text key={idx} size="xs" c="primary">
                          {'• '}
                          {materialName(m.materialCode)}
                          {typeof m.quantity === 'number'
                            ? ` · ${formatNumber(m.quantity)}${m.unit ? ` ${m.unit}` : ''}`
                            : ''}
                        </Text>
                      ))}
                    </Stack>
                  )}
                </Stack>
                <Group gap={4} wrap="nowrap">
                  {canEdit && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => openEdit(entry)}
                      aria-label={t('__new__.01-common.actions.edit')}
                    >
                      <IconPencil size={15} />
                    </ActionIcon>
                  )}
                  {canDelete && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => setDeleteTarget(entry)}
                      aria-label={t('__new__.01-common.actions.remove')}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            </div>
          ))}
        </Stack>
      )}

      <ResponsiveModal
        opened={formOpened}
        onClose={formHandlers.close}
        title={editing ? t('cropDiaries.editItem') : t('cropDiaries.addItem')}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DatePickerField
                label={t('cropDiaries.form.entryDateLabel')}
                withAsterisk
                clearable={false}
                {...form.getInputProps('entryDate')}
              />
            </SimpleGrid>
            <TextInput
              label={t('cropDiaries.form.activityLabel')}
              placeholder={t('cropDiaries.form.activityPlaceholder')}
              withAsterisk
              {...form.getInputProps('activity')}
            />
            <Textarea
              label={t('__new__.01-common.labels.note')}
              placeholder={t('cropDiaries.form.notesPlaceholder')}
              autosize
              minRows={2}
              maxRows={6}
              {...form.getInputProps('notes')}
            />
            <MaterialLinesEditor
              value={form.values.materials}
              onChange={(materials) => form.setFieldValue('materials', materials)}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" disabled={saving} onClick={formHandlers.close}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {editing ? t('__new__.01-common.actions.save') : t('cropDiaries.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </form>
      </ResponsiveModal>

      <ConfirmModal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('cropDiaries.deleteConfirm.title')}
        message={t('cropDiaries.deleteConfirm.message', { activity: deleteTarget?.activity ?? '' })}
        loading={deleting}
      />
    </Card>
  );
}
