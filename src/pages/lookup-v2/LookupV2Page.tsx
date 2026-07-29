import {
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { CodeLabel } from '@credo/base-ui/components';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconGripVertical, IconLock, IconLockOpen, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { ActiveBadge } from '@/components/badges';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useLookupV2Store } from '@/stores/useLookupV2Store';
import { perms } from '@/utils/permission';
import type { LookupV2Row } from '@/types';
import { getEnabledLookupV2Categories, getLookupV2Category } from './categoryRegistry';

const enabledCategories = getEnabledLookupV2Categories();

const canCreate = perms.lookupV2.canCreate();
const canEdit = perms.lookupV2.canEdit();
const canDelete = perms.lookupV2.canDelete();

type FormValues = { value: string; label: string; sortOrder: number };

export function LookupV2Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { hash } = useLocation();
  const category = hash.startsWith('#') ? hash.slice(1) : hash;
  const registered =
    (category ? getLookupV2Category(category) : undefined) ?? enabledCategories[0]!;

  const { items, initialized, loading, loadAll } = useLookupV2Store(
    useShallow((s) => ({
      items: s.items,
      initialized: s.initialized,
      loading: s.loading,
      loadAll: s.loadAll,
    })),
  );

  useEffect(() => {
    if (!initialized && !loading) void loadAll();
  }, [initialized, loading, loadAll]);

  const categoryItems = useMemo(
    () =>
      items
        .filter((l) => l.category === registered.id && !l.extra?.isDeleted)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [items, registered],
  );

  const itemsRef = useRef(categoryItems);
  useEffect(() => {
    itemsRef.current = categoryItems;
  }, [categoryItems]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: 'before' | 'after' } | null>(
    null,
  );
  const [reordering, setReordering] = useState(false);

  const persistReorder = useCallback(
    async (sourceId: string, targetId: string, pos: 'before' | 'after') => {
      const list = itemsRef.current;
      const moved = list.find((i) => i.id === sourceId);
      if (!moved || sourceId === targetId) return;
      const without = list.filter((i) => i.id !== sourceId);
      const targetIdx = without.findIndex((i) => i.id === targetId);
      if (targetIdx < 0) return;
      without.splice(pos === 'after' ? targetIdx + 1 : targetIdx, 0, moved);

      const changed = without
        .map((item, idx) => ({ item, sortOrder: idx + 1 }))
        .filter(({ item, sortOrder }) => item.sortOrder !== sortOrder);
      if (changed.length === 0) return;

      setReordering(true);
      try {
        const res = await useLookupV2Store.getState().bulkUpsertSafely({
          items: changed.map(({ item, sortOrder }) => ({
            category: item.category,
            value: item.value,
            sortOrder,
          })),
        });
        if (res.errors.length > 0) {
          notifications.show({ color: 'red', message: t('lookups.notifications.writeError') });
        } else {
          notifications.show({ color: 'green', message: t('lookups.notifications.updateSuccess') });
        }
      } catch {
        notifications.show({ color: 'red', message: t('lookups.notifications.writeError') });
      } finally {
        setReordering(false);
      }
    },
    [t],
  );

  const handleDragStart = useCallback((e: DragEvent<HTMLElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      // some browsers need setData to start a drag — ignore failures
    }
  }, []);

  const handleRowDragOver = useCallback(
    (e: DragEvent<HTMLTableRowElement>, id: string) => {
      if (!draggingId || draggingId === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const pos: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
      setDropTarget((prev) => (prev?.id === id && prev.pos === pos ? prev : { id, pos }));
    },
    [draggingId],
  );

  const handleRowDrop = useCallback(
    (e: DragEvent<HTMLTableRowElement>, targetId: string) => {
      e.preventDefault();
      const sourceId = draggingId;
      const rect = e.currentTarget.getBoundingClientRect();
      const pos: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
      setDraggingId(null);
      setDropTarget(null);
      if (sourceId) void persistReorder(sourceId, targetId, pos);
    },
    [draggingId, persistReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const [editing, setEditing] = useState<LookupV2Row | null>(null);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LookupV2Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormValues>({
    initialValues: { value: '', label: '', sortOrder: registered.defaultSortOrder },
    validate: {
      value: (v) => (v.trim() ? null : t('lookups.validation.valueRequired')),
      label: (v) => (v.trim() ? null : t('lookups.validation.labelRequired')),
    },
  });

  const startCreate = useCallback(() => {
    setEditing(null);
    form.setValues({
      value: '',
      label: '',
      sortOrder:
        (categoryItems[categoryItems.length - 1]?.sortOrder ?? 0) + registered.defaultSortOrder,
    });
    openForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openForm, categoryItems, registered]);

  const startEdit = useCallback(
    (entry: LookupV2Row) => {
      if (!canEdit) return;
      setEditing(entry);
      form.setValues({ value: entry.value, label: entry.label, sortOrder: entry.sortOrder });
      openForm();
    },

    [openForm],
  );

  const onConflict = useCallback(
    (latest?: LookupV2Row) => {
      if (latest) {
        setEditing(latest);
        form.setValues({ value: latest.value, label: latest.label, sortOrder: latest.sortOrder });
      }
      notifications.show({
        color: 'yellow',
        title: t('common.conflict.title'),
        message: t('common.conflict.message'),
        autoClose: 8000,
      });
    },

    [t],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const nextValue = values.value.trim().toUpperCase();

      const duplicate = categoryItems.find(
        (l) => l.id !== editing?.id && l.value.trim().toUpperCase() === nextValue,
      );
      if (duplicate) {
        form.setFieldError('value', t('lookups.validation.valueDuplicate'));
        return;
      }

      setSubmitting(true);
      try {
        if (editing) {
          await useLookupV2Store.getState().updateSafely({
            id: editing.id,
            version: editing.version,
            patch: { value: nextValue, label: values.label.trim(), sortOrder: values.sortOrder },
          });
          notifications.show({ color: 'green', message: t('lookups.notifications.updateSuccess') });
        } else {
          await useLookupV2Store.getState().createSafely({
            patch: {
              category: registered.id,
              value: nextValue,
              label: values.label.trim(),
              sortOrder: values.sortOrder,
              isActive: true,
            },
          });
          notifications.show({ color: 'green', message: t('lookups.notifications.createSuccess') });
        }
        closeForm();
      } catch (err) {
        if (err instanceof EntityConflictError) onConflict(err.latest as LookupV2Row | undefined);
        else notifications.show({ color: 'red', message: t('lookups.notifications.writeError') });
      } finally {
        setSubmitting(false);
      }
    },
    [registered, editing, form, categoryItems, t, closeForm, onConflict],
  );

  const handleToggleActive = useCallback(
    async (entry: LookupV2Row) => {
      closeForm();
      try {
        await useLookupV2Store.getState().updateSafely({
          id: entry.id,
          version: entry.version,
          patch: { isActive: !entry.isActive },
        });
        notifications.show({
          color: 'green',
          message: t(
            !entry.isActive
              ? 'lookups.notifications.enableSuccess'
              : 'lookups.notifications.disableSuccess',
          ),
        });
      } catch (err) {
        if (err instanceof EntityConflictError) onConflict();
        else notifications.show({ color: 'red', message: t('lookups.notifications.writeError') });
      }
    },
    [t, closeForm, onConflict],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await useLookupV2Store
        .getState()
        .deleteSafely({ id: deleteTarget.id, version: deleteTarget.version });
      notifications.show({ color: 'green', message: t('lookups.notifications.deleteSuccess') });
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        onConflict();
        setDeleteTarget(null);
      } else notifications.show({ color: 'red', message: t('lookups.notifications.writeError') });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, t, onConflict]);

  const tabData = enabledCategories.map((c) => ({ value: c.id, label: t(c.labelKey as never) }));
  const isEditing = !!editing;

  return (
    <DesktopOnlyGuard>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Stack gap={2}>
            <Title order={3}>{t('nav.lookupsV2')}</Title>
            <Text size="xs" c="dimmed">
              {t('lookups.subtitle')}
            </Text>
          </Stack>
          {canCreate && (
            <Button leftSection={<IconPlus size={14} />} onClick={startCreate}>
              {t('lookups.addItem')}
            </Button>
          )}
        </Group>

        <Select
          value={registered.id}
          onChange={(v) => v && navigate({ hash: `#${v}` })}
          data={tabData}
          allowDeselect={false}
          searchable={false}
          maw={360}
        />

        {canEdit && categoryItems.length > 1 && (
          <Text size="xs" c="dimmed">
            {t('lookups.reorderHint')}
          </Text>
        )}

        {categoryItems.length === 0 ? (
          <Card withBorder padding="xl">
            <Stack align="center" gap="sm">
              <Text size="sm" c="dimmed">
                {t('lookups.noItems')}
              </Text>
              {canCreate && (
                <Button leftSection={<IconPlus size={14} />} onClick={startCreate} variant="light">
                  {t('lookups.addItem')}
                </Button>
              )}
            </Stack>
          </Card>
        ) : (
          <Card withBorder padding={0}>
            <Table
              highlightOnHover
              verticalSpacing="sm"
              style={reordering ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <Table.Thead>
                <Table.Tr>
                  {canEdit && <Table.Th style={{ width: 44 }} />}
                  <Table.Th style={{ width: 80 }}>{t('lookups.columns.sortOrder')}</Table.Th>
                  <Table.Th>{t('lookups.columns.label')}</Table.Th>
                  <Table.Th style={{ width: 200 }}>{t('lookups.columns.value')}</Table.Th>
                  <Table.Th style={{ width: 120 }}>{t('__new__.01-common.labels.status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categoryItems.map((entry) => (
                  <Table.Tr
                    key={entry.id}
                    style={{
                      opacity: draggingId === entry.id ? 0.4 : entry.isActive ? 1 : 0.55,
                      cursor: canEdit ? 'pointer' : 'default',
                      boxShadow:
                        dropTarget?.id === entry.id
                          ? `inset 0 ${dropTarget.pos === 'before' ? 2 : -2}px 0 0 var(--mantine-color-blue-5)`
                          : undefined,
                    }}
                    onClick={() => startEdit(entry)}
                    onDragOver={
                      canEdit
                        ? (e: DragEvent<HTMLTableRowElement>) => handleRowDragOver(e, entry.id)
                        : undefined
                    }
                    onDrop={
                      canEdit
                        ? (e: DragEvent<HTMLTableRowElement>) => handleRowDrop(e, entry.id)
                        : undefined
                    }
                  >
                    {canEdit && (
                      <Table.Td
                        draggable
                        onDragStart={(e: DragEvent<HTMLElement>) => handleDragStart(e, entry.id)}
                        onDragEnd={handleDragEnd}
                        onClick={(e: MouseEvent) => e.stopPropagation()}
                        style={{ cursor: 'grab', color: 'var(--mantine-color-dimmed)' }}
                      >
                        <IconGripVertical size={16} />
                      </Table.Td>
                    )}
                    <Table.Td>{entry.sortOrder}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {entry.label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <CodeLabel code={entry.value.toUpperCase()} size="sm" fw={600} />
                    </Table.Td>
                    <Table.Td>
                      <ActiveBadge
                        isActive={entry.isActive}
                        activeLabel={t('__new__.01-common.labels.active')}
                        inactiveLabel={t('__new__.01-common.labels.inactive')}
                        size="sm"
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        <Modal
          opened={formOpened}
          onClose={closeForm}
          title={
            isEditing
              ? `${t('__new__.01-common.actions.edit')} — ${t(registered.labelKey as never)}`
              : `${t('lookups.addItem')} — ${t(registered.labelKey as never)}`
          }
          centered
          size="lg"
          padding={0}
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md" p="md">
              <TextInput
                label={t('lookups.form.value')}
                description={t('lookups.form.valueHelp')}
                autoFocus
                {...form.getInputProps('value')}
              />
              <TextInput
                label={t('lookups.form.label')}
                description={t('lookups.form.labelHelp')}
                {...form.getInputProps('label')}
              />
              <NumberInput
                label={t('lookups.form.sortOrder')}
                description={t('lookups.form.sortOrderHelp')}
                min={0}
                max={9999}
                {...form.getInputProps('sortOrder')}
              />
            </Stack>

            <Group
              justify="space-between"
              gap="sm"
              p="md"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <Group gap="xs">
                {editing && canEdit && (
                  <Button
                    variant="subtle"
                    color={editing.isActive ? 'orange' : 'teal'}
                    size="compact-md"
                    leftSection={
                      editing.isActive ? <IconLock size={14} /> : <IconLockOpen size={14} />
                    }
                    onClick={() => handleToggleActive(editing)}
                  >
                    {editing.isActive
                      ? t('__new__.01-common.actions.disable')
                      : t('__new__.01-common.actions.enable')}
                  </Button>
                )}
                {editing && canDelete && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-md"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => {
                      closeForm();
                      setDeleteTarget(editing);
                    }}
                  >
                    {t('__new__.01-common.actions.remove')}
                  </Button>
                )}
              </Group>
              <Group justify="flex-end" gap="sm">
                <Button variant="default" onClick={closeForm}>
                  {t('__new__.01-common.actions.cancel')}
                </Button>
                <Button type="submit" loading={submitting}>
                  {isEditing ? t('__new__.01-common.actions.edit') : t('lookups.addItem')}
                </Button>
              </Group>
            </Group>
          </form>
        </Modal>

        <ConfirmModal
          opened={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={t('lookups.deleteConfirm.title')}
          message={t('lookups.deleteConfirm.message', { label: deleteTarget?.label ?? '' })}
          loading={deleting}
        />
      </Stack>
    </DesktopOnlyGuard>
  );
}
