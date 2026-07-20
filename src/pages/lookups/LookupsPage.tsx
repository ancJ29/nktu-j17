

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
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconLock, IconLockOpen, IconPlus, IconTrash } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { cMngtConnector } from '@credo/connectors/connector';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useLookupStore } from '@/stores/useLookupStore';
import { isListVersionConflict, readListHash } from '@/utils/listVersionConflict';
import type { Lookup } from '@/types';
import { getEnabledCategories, getLookupCategory } from './categoryRegistry';
import { ActiveBadge } from '@/components/badges';

const enabledCategories = getEnabledCategories();

type FormValues = {
  value: string;
  label: string;
  sortOrder: number;
};

export function LookupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  
  
  const { hash } = useLocation();
  const category = hash.startsWith('#') ? hash.slice(1) : hash;
  const registered = (category ? getLookupCategory(category) : undefined) ?? enabledCategories[0];

  const items = useLookupStore((s) => s.items);
  const initialized = useLookupStore((s) => s.initialized);
  const loading = useLookupStore((s) => s.loading);
  const loadAll = useLookupStore((s) => s.loadAll);
  const invalidate = useLookupStore((s) => s.invalidate);

  useEffect(() => {
    if (!initialized && !loading) void loadAll();
  }, [initialized, loading, loadAll]);

  const categoryItems = useMemo(() => {
    if (!registered) return [];
    return items
      .filter((l) => l.category === registered.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }, [items, registered]);

  const [editing, setEditing] = useState<Lookup | null>(null);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lookup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormValues>({
    initialValues: { value: '', label: '', sortOrder: registered?.defaultSortOrder ?? 10 },
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
        (categoryItems[categoryItems.length - 1]?.sortOrder ?? 0) +
        (registered?.defaultSortOrder ?? 10),
    });
    openForm();
  }, [form, openForm, categoryItems, registered]);

  const startEdit = useCallback(
    (entry: Lookup) => {
      setEditing(entry);
      form.setValues({
        value: entry.value,
        label: entry.label,
        sortOrder: entry.sortOrder,
      });
      openForm();
    },
    [form, openForm],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!registered) return;
      const activeDuplicate = categoryItems.find(
        (l) =>
          l.isActive &&
          l.id !== editing?.id &&
          l.value.trim().toLowerCase() === values.value.trim().toLowerCase(),
      );
      if (activeDuplicate) {
        form.setFieldError('value', t('lookups.validation.valueDuplicate'));
        return;
      }

      setSubmitting(true);

      
      values.value = values.value.trim().toUpperCase();

      try {
        if (editing) {
          await useLookupStore.getState().updateSafely({
            id: editing.id,
            version: editing.version,
            patch: {
              value: values.value.trim(),
              label: values.label.trim(),
              sortOrder: values.sortOrder,
            },
          });
          notifications.show({
            color: 'green',
            message: t('lookups.notifications.updateSuccess'),
          });
        } else {
          const expectedListHash = readListHash(useLookupStore, 'lookups');
          await cMngtConnector.createLookup({
            category: registered.id,
            value: values.value.trim(),
            label: values.label.trim(),
            sortOrder: values.sortOrder,
            ...(expectedListHash && { expectedListHash }),
          });
          notifications.show({
            color: 'green',
            message: t('lookups.notifications.createSuccess'),
          });
          invalidate();
          void loadAll();
        }
        closeForm();
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) {
            const latest = err.latest as Lookup;
            setEditing(latest);
            form.setValues({
              value: latest.value,
              label: latest.label,
              sortOrder: latest.sortOrder,
            });
          }
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else if (!editing && isListVersionConflict(err)) {
          
          
          
          invalidate();
          void loadAll();
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.listMessage'),
            autoClose: 10000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('lookups.notifications.writeError'),
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [registered, editing, form, categoryItems, t, closeForm, invalidate, loadAll],
  );

  const handleToggleActive = useCallback(
    async (entry: Lookup) => {
      const nextActive = !entry.isActive;
      closeForm();
      try {
        await useLookupStore.getState().updateSafely({
          id: entry.id,
          version: entry.version,
          patch: { isActive: nextActive },
        });
        notifications.show({
          color: 'green',
          message: t(
            nextActive
              ? 'lookups.notifications.enableSuccess'
              : 'lookups.notifications.disableSuccess',
          ),
        });
      } catch (err) {
        if (err instanceof EntityConflictError) {
          invalidate();
          void loadAll();
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('lookups.notifications.writeError'),
          });
        }
      }
    },
    [t, invalidate, loadAll, closeForm],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await useLookupStore
        .getState()
        .deleteSafely({ id: deleteTarget.id, version: deleteTarget.version });
      invalidate();
      void loadAll();
      notifications.show({
        color: 'green',
        message: t('lookups.notifications.deleteSuccess'),
      });
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        invalidate();
        void loadAll();
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        setDeleteTarget(null);
      } else {
        notifications.show({ color: 'red', message: t('lookups.notifications.writeError') });
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, invalidate, loadAll, t]);

  const tabData = enabledCategories.map((c) => ({
    value: c.id,
    label: t(c.labelKey as never),
  }));

  const isEditing = !!editing;

  return (
    <DesktopOnlyGuard>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Stack gap={2}>
            <Title order={3}>{t('lookups.title')}</Title>
            <Text size="xs" c="dimmed">
              {t('lookups.subtitle')}
            </Text>
          </Stack>
          <Button leftSection={<IconPlus size={14} />} onClick={startCreate}>
            {t('lookups.addItem')}
          </Button>
        </Group>

        <Select
          value={registered.id}
          onChange={(v) => v && navigate({ hash: `#${v}` })}
          data={tabData}
          allowDeselect={false}
          searchable={false}
          maw={360}
        />

        {categoryItems.length === 0 ? (
          <Card withBorder padding="xl">
            <Stack align="center" gap="sm">
              <Text size="sm" c="dimmed">
                {t('lookups.noItems')}
              </Text>
              <Button leftSection={<IconPlus size={14} />} onClick={startCreate} variant="light">
                {t('lookups.addItem')}
              </Button>
            </Stack>
          </Card>
        ) : (
          <Card withBorder padding={0}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
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
                    style={{ opacity: entry.isActive ? 1 : 0.55, cursor: 'pointer' }}
                    onClick={() => startEdit(entry)}
                  >
                    <Table.Td>{entry.sortOrder}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {entry.label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text ff="monospace" fw="bold">
                        {entry.value.toUpperCase()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActiveBadge
                        isActive={entry.isActive}
                        activeLabel={t('common.status.active')}
                        inactiveLabel={t('common.filters.inactive')}
                        size="sm"
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        {/* Create / Edit modal */}
        <Modal
          opened={formOpened}
          onClose={closeForm}
          title={
            isEditing
              ? `${t('__new__.01-common.actions.edit')} — ${t(registered.labelKey as never)}`
              : `${t('lookups.addItem')} — ${registered ? t(registered.labelKey as never) : ''}`
          }
          centered
          size="50vw"
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

            {/* Footer */}
            <Group
              justify="space-between"
              gap="sm"
              p="md"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              {/* Danger actions — only when editing an existing entry */}
              <Group gap="xs">
                <Button
                  disabled={!editing}
                  variant="subtle"
                  color={editing?.isActive ? 'orange' : 'teal'}
                  size="compact-md"
                  leftSection={
                    editing && editing.isActive ? (
                      <IconLock size={14} />
                    ) : (
                      <IconLockOpen size={14} />
                    )
                  }
                  onClick={() => handleToggleActive(editing!)}
                >
                  {editing?.isActive
                    ? t('__new__.01-common.actions.disable')
                    : t('__new__.01-common.actions.enable')}
                </Button>
                <Button
                  disabled={!editing}
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
