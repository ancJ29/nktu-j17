import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Space,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconFileText,
  IconFlask,
  IconPencil,
  IconPlus,
  IconRotate2,
  IconSeeding,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePickerField } from '@/components/DatePickerField';
import { MaterialLinesEditor } from '@/components/MaterialLinesEditor';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useMaterialStore } from '@/stores/useMaterialStore';
import {
  createCropDiaryEntry,
  deleteCropDiaryEntry,
  queryCropDiary,
  updateCropDiaryEntry,
} from '@/stores/useCropDiaryStore';
import { aggregateCropMaterials, type CropMaterialTotal } from '@/utils/cropMaterialSummary';
import {
  completedOn,
  entryDatePart,
  expectsMaterial,
  isMaterialPending,
  prepEntryDefaultDate,
  splitDiaryEntries,
} from './diaryEntryGroups';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import type { CropDiaryEntry, CropDiaryExtra, MaterialLine } from '@/types';
import { Form } from '@/components/Form';

function cleanMaterialLines(lines: MaterialLine[]): MaterialLine[] {
  return lines
    .filter((m) => m.materialCode.trim())
    .map((m) => ({
      materialCode: m.materialCode,
      ...(typeof m.quantity === 'number' && { quantity: m.quantity }),
      ...(m.unit?.trim() && { unit: m.unit.trim() }),
    }));
}

type Props = {
  readonly cropId: string;
  readonly cropCode: string;

  readonly startDate?: string;

  readonly onSummaryChange?: (summary: CropMaterialTotal[]) => void;

  readonly children?: ReactNode;
};

const canView = perms.cropDiary.canView();
const canCreate = perms.cropDiary.canCreate();
const canEdit = perms.cropDiary.canEdit();
const canDelete = perms.cropDiary.canDelete();

type EntryFormValues = {
  entryDate: string;
  activity: string;
  notes: string;
  materials: MaterialLine[];

  usesMaterial: boolean;
};

export function CropDiarySection({
  cropId,
  cropCode,
  startDate,
  onSummaryChange,
  children,
}: Props) {
  const { t } = useTranslation();

  const [entries, setEntries] = useState<CropDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpened, formHandlers] = useDisclosure(false);
  const [editing, setEditing] = useState<CropDiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const [completing, setCompleting] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CropDiaryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const materials = useMaterialStore((s) => s.items);
  const materialsInit = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  const materialName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of materials) map.set(m.code, m.name);
    return (code: string) => map.get(code) ?? code;
  }, [materials]);

  const form = useForm<EntryFormValues>({
    initialValues: {
      entryDate: todayInVnDateString(),
      activity: '',
      notes: '',
      materials: [],
      usesMaterial: false,
    },
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
    if (!materialsInit) loadMaterials();
  }, [load, materialsInit, loadMaterials]);

  const { prep, events } = useMemo(
    () => splitDiaryEntries(entries, startDate),
    [entries, startDate],
  );

  const materialSummary = useMemo(() => aggregateCropMaterials(entries), [entries]);
  useEffect(() => {
    if (!loading) onSummaryChange?.(materialSummary);
  }, [loading, materialSummary, onSummaryChange]);

  const openAdd = useCallback(
    (half: 'event' | 'preparation' = 'event') => {
      const today = todayInVnDateString();
      setEditing(null);
      form.setValues({
        entryDate:
          half === 'preparation' && startDate ? prepEntryDefaultDate(startDate, today) : today,
        activity: '',
        notes: '',
        materials: [],

        usesMaterial: false,
      });
      form.resetDirty();
      formHandlers.open();
    },

    [formHandlers, startDate],
  );

  const openEdit = useCallback(
    (entry: CropDiaryEntry) => {
      setEditing(entry);
      form.setValues({
        entryDate: entryDatePart(entry.entryDate),
        activity: entry.activity,
        notes: entry.extra?.notes ?? '',

        materials: (entry.extra?.materials ?? []).map((m) => ({ ...m })),
        usesMaterial: expectsMaterial(entry),
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
        const isPrep = !!startDate && values.entryDate < startDate;
        const usesMaterial = isPrep && values.usesMaterial;

        const materials = usesMaterial || !isPrep ? cleanMaterialLines(values.materials) : [];
        if (editing) {
          const extra: CropDiaryExtra = { ...(editing.extra ?? {}) };
          if (values.notes.trim()) extra.notes = values.notes.trim();
          else delete extra.notes;
          if (materials.length > 0) extra.materials = materials;
          else delete extra.materials;
          if (usesMaterial) extra.prepKind = 'material';
          else delete extra.prepKind;
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
            ...(usesMaterial && { prepKind: 'material' as const }),
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
    [editing, cropId, cropCode, startDate, t, load, formHandlers],
  );

  const handleToggleComplete = useCallback(
    async (entry: CropDiaryEntry) => {
      setCompleting(entry.id);
      try {
        const extra: CropDiaryExtra = { ...(entry.extra ?? {}) };
        if (completedOn(entry)) delete extra.completedDate;
        else extra.completedDate = todayInVnDateString();
        await updateCropDiaryEntry({
          id: entry.id,
          cropId,
          version: entry.version,
          entryDate: entryDatePart(entry.entryDate),
          activity: entry.activity,
          extra,
        });
        await load();
      } catch {
        notifications.show({
          color: 'red',
          message: t('cropDiaries.notifications.updateError'),
          autoClose: 8000,
        });
      } finally {
        setCompleting(null);
      }
    },
    [cropId, load, t],
  );

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

  const isPrepEntry = !!startDate && !!form.values.entryDate && form.values.entryDate < startDate;

  if (!canView) return <>{children}</>;

  return (
    <>
      {/* Preparation sits **above** the season, because that is when it
          happened: soaking seed and sterilising the house are day −10, and a
          register that listed them under the grid was telling the story
          backwards. Its own card rather than a band inside the grid's — the
          jobs are dated work with edit and delete, not a header. */}
      {/* Rendered whenever the crop *has* a day 1, not only when the template
          seeded something: without that, "add the first preparation job" is
          unreachable for exactly the crops that have none. */}
      {startDate && (prep.length > 0 || canCreate) && (
        <>
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <ThemeIcon size={28} radius="md" variant="light" color="primary">
                  <IconSeeding size={16} stroke={1.75} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {t('cropDiaries.prepTitle')}
                </Text>
              </Group>
              {canCreate && (
                <Button
                  onClick={() => openAdd('preparation')}
                  size="compact-sm"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                >
                  {t('cropDiaries.addPrep')}
                </Button>
              )}
            </Group>
            {/* Only preparation gets these two. An event is an observation —
                a pest sighting is not a task with a "done" state — so the
                affordances are wired in here rather than gated inside the row
                by a flag that would have to be kept in step. */}
            {prep.length === 0 ? (
              <Text size="sm" c="dimmed" py="xs">
                {t('cropDiaries.prepEmpty')}
              </Text>
            ) : (
              <EntryGroup
                entries={prep}
                materialName={materialName}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onLogMaterial={canEdit ? openEdit : undefined}
                onToggleComplete={canEdit ? handleToggleComplete : undefined}
                completingId={completing}
              />
            )}
          </Card>
          <Space h="md" />
        </>
      )}

      {/* The season itself — passed in rather than imported, so this component
          keeps owning the crop's event register (one read, one form) while the
          page decides what sits between its two halves. */}
      {children}

      {children ? <Space h="md" /> : null}

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" variant="light" color="primary">
              <IconFileText size={16} stroke={1.75} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('cropDiaries.eventsTitle')}
            </Text>
          </Group>
          {canCreate && (
            <Button
              onClick={() => openAdd('event')}
              size="compact-sm"
              variant="light"
              leftSection={<IconPlus size={14} />}
            >
              {t('cropDiaries.addItem')}
            </Button>
          )}
        </Group>

        {loading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : events.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {t('cropDiaries.sectionEmpty')}
          </Text>
        ) : (
          <EntryGroup
            entries={events}
            materialName={materialName}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        )}
      </Card>

      <ResponsiveModal
        opened={formOpened}
        onClose={formHandlers.close}
        title={
          editing
            ? t('cropDiaries.editItem')
            : isPrepEntry
              ? t('cropDiaries.addPrep')
              : t('cropDiaries.addItem')
        }
      >
        <Form form={form} onSubmit={handleSubmit}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DatePickerField
                label={t('cropDiaries.form.entryDateLabel')}
                withAsterisk
                clearable={false}
                {...form.getInputProps('entryDate')}

                description={
                  isPrepEntry
                    ? t('cropDiaries.form.isPrepHint', { date: formatDate(startDate) })
                    : undefined
                }
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
            {/* Preparation only: this is the process's expectation, and an
                event has no process to have one. Editable rather than fixed at
                seeding — a job typed wrongly in the template is corrected here
                instead of worked around, which is the alternative when the only
                way to log material is a kind you cannot change. */}
            {isPrepEntry && (
              <Switch
                label={t('cropDiaries.form.usesMaterialLabel')}
                description={t('cropDiaries.materialExpectedHint')}
                checked={form.values.usesMaterial}
                onChange={(e) => form.setFieldValue('usesMaterial', e.currentTarget.checked)}
              />
            )}
            {/* Locked, not hidden, when the job is labour: an operator who
                expected to record something needs to see *why* they cannot, and
                the switch that unlocks it is the line above. Lines already
                logged stay on screen — they happened. */}
            <MaterialLinesEditor
              value={form.values.materials}
              onChange={(materials) => form.setFieldValue('materials', materials)}
              disabled={isPrepEntry && !form.values.usesMaterial}
              disabledHint={t('cropDiaries.form.materialLocked')}
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
        </Form>
      </ResponsiveModal>

      <ConfirmModal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('cropDiaries.deleteConfirm.title')}
        message={t('cropDiaries.deleteConfirm.message', { activity: deleteTarget?.activity ?? '' })}
        loading={deleting}
      />
    </>
  );
}

function EntryGroup({
  title,
  entries,
  materialName,
  onEdit,
  onDelete,
  onLogMaterial,
  onToggleComplete,
  completingId,
}: {
  readonly title?: string;
  readonly entries: CropDiaryEntry[];
  readonly materialName: (code: string) => string;
  readonly onEdit: (entry: CropDiaryEntry) => void;
  readonly onDelete: (entry: CropDiaryEntry) => void;

  readonly onLogMaterial?: (entry: CropDiaryEntry) => void;

  readonly onToggleComplete?: (entry: CropDiaryEntry) => void;

  readonly completingId?: string | null;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap={0}>
      {title && (
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: 0.3 }} mb={4}>
          {title}
        </Text>
      )}
      {entries.map((entry, i) => {
        const pendingMaterial = isMaterialPending(entry);
        const doneOn = completedOn(entry);
        return (
          <div key={entry.id}>
            {i > 0 && <Divider />}
            {/* Wraps, and the text keeps a floor: a prep row now carries up to
                four controls, and on a phone `nowrap` would squeeze the
                activity — the one thing the row exists to say — down to a few
                characters. Below ~220px of text the controls take their own
                line instead. */}
            <Group justify="space-between" py="sm" gap="sm" align="flex-start">
              <Stack gap={4} style={{ minWidth: 0, flex: '1 1 220px' }}>
                <Group gap={6} wrap="wrap" align="baseline">
                  <Text size="sm" fw={600}>
                    {entry.activity}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    ({formatDate(entry.entryDate)})
                  </Text>
                  {/* Only while it is outstanding. Once the lines are logged they
                    are shown below and speak for themselves; a permanent "uses
                    material" caption would mark the majority of a prep list
                    with a fact nobody can act on. */}
                  {pendingMaterial && (
                    <Badge size="xs" radius="sm" variant="light" color="orange" tt="none">
                      {t('cropDiaries.materialPending')}
                    </Badge>
                  )}
                  {/* Carries the date, not just the state: the process dated
                    this job from a template offset, and when it was really done
                    is what an operator is looking for. */}
                  {doneOn && (
                    <Badge
                      size="xs"
                      radius="sm"
                      variant="light"
                      color="green"
                      tt="none"
                      leftSection={<IconCheck size={10} />}
                    >
                      {t('cropDiaries.completedOn', { date: formatDate(doneOn) })}
                    </Badge>
                  )}
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
              <Group gap={4} wrap="nowrap" style={{ marginLeft: 'auto' }}>
                {/* Done in one tap, and a named way in to "what I used". Both
                  are light while there is something to do and subtle once there
                  is not, so a finished row settles instead of still asking. The
                  material one opens the same form the pencil does — an operator
                  who has just finished disinfecting a house should not have to
                  know that "edit" is where material lives, least of all on a
                  phone where the pencil is a 15px icon. */}
                {onToggleComplete && (
                  <Button
                    size="compact-xs"
                    variant={doneOn ? 'subtle' : 'light'}
                    color={doneOn ? 'gray' : 'green'}
                    loading={completingId === entry.id}
                    leftSection={doneOn ? <IconRotate2 size={13} /> : <IconCheck size={13} />}
                    onClick={() => onToggleComplete(entry)}
                  >
                    {doneOn ? t('cropDiaries.markUndone') : t('cropDiaries.markDone')}
                  </Button>
                )}
                {onLogMaterial && expectsMaterial(entry) && (
                  <Button
                    size="compact-xs"
                    variant={pendingMaterial ? 'light' : 'subtle'}
                    color={pendingMaterial ? 'primary' : 'gray'}
                    leftSection={<IconFlask size={13} />}
                    onClick={() => onLogMaterial(entry)}
                  >
                    {t('cropDiaries.logMaterial')}
                  </Button>
                )}
                {canEdit && (
                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onEdit(entry)}>
                    <IconPencil size={15} />
                  </ActionIcon>
                )}
                {canDelete && (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => onDelete(entry)}
                  >
                    <IconTrash size={15} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
          </div>
        );
      })}
    </Stack>
  );
}
