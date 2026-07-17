import {
  ActionIcon,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cMngtConnector, CallApiError } from '@credo/connectors/connector';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { SectionCard } from '@/components/SectionCard';
import { formatDate } from '@/utils/dateFormat';
import type { OperationLog, OperationLogExtra } from '@/types';
import {
  datePart,
  todayString,
  yearOf,
  type LogFormValues,
  type OperationLogConfig,
  type OperationLogContext,
  type OperationLogPerms,
  type TFn,
} from './operationLogConfig';

const CURRENT_YEAR = new Date().getFullYear();

function serverMessage(err: unknown): string | undefined {
  if (err instanceof CallApiError && typeof err.payload === 'object' && err.payload !== null) {
    const m = (err.payload as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return undefined;
}

type Props = {
  readonly targetId: string;
  readonly targetCode: string;
  readonly config: OperationLogConfig;
  
  readonly perms: OperationLogPerms;
  
  readonly context?: OperationLogContext;
};

export function OperationLogSection({ targetId, targetCode, config, perms, context }: Props) {
  const { canView, canCreate, canEdit, canDelete } = perms;
  const { t, i18n } = useTranslation();
  
  
  const tr = useCallback<TFn>((key, options) => t(key as never, options), [t]);

  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(CURRENT_YEAR);
  
  
  const [month, setMonth] = useState<string>('all');

  const [formOpened, formHandlers] = useDisclosure(false);
  const [editing, setEditing] = useState<OperationLog | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OperationLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<LogFormValues>({
    initialValues: config.emptyForm,
    validate: config.validate(tr),
  });

  const yearOptions = useMemo(() => {
    const base = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
    const set = new Set<number>([...base, year]);
    return [...set].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) }));
  }, [year]);

  const monthOptions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'long' });
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: fmt.format(new Date(2020, i, 1)),
    }));
    return [{ value: 'all', label: tr('operationLogs.allMonths') }, ...months];
  }, [i18n.language, tr]);

  
  
  
  const visibleLogs = useMemo(() => {
    if (month === 'all') return logs;
    const m = Number(month);
    return logs.filter((l) => Number(datePart(l.logDate).slice(5, 7)) === m);
  }, [logs, month]);

  const load = useCallback(
    async (forYear: number) => {
      setLoading(true);
      try {
        const res = await cMngtConnector.getOperationLogsByTarget<OperationLogExtra>({
          targetId,
          period: String(forYear),
        });
        const sorted = [...(res.operationLogs as OperationLog[])]
          .filter((l) => l.logType === config.logType)
          .sort((a, b) => datePart(b.logDate).localeCompare(datePart(a.logDate)));
        setLogs(sorted);
      } catch {
        notifications.show({ color: 'red', message: tr('operationLogs.notifications.fetchError') });
      } finally {
        setLoading(false);
      }
    },
    [targetId, config.logType, tr],
  );

  useEffect(() => {
    if (!canView) return;
    
    load(CURRENT_YEAR);
  }, [load, canView]);

  const switchYear = useCallback(
    (value: string | null) => {
      if (!value) return;
      const y = Number(value);
      setYear(y);
      load(y);
    },
    [load],
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    form.setValues({ ...config.emptyForm, logDate: todayString() });
    form.resetDirty();
    formHandlers.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form identity is stable across renders
  }, [config.emptyForm, formHandlers]);

  const openEdit = useCallback(
    (log: OperationLog) => {
      setEditing(log);
      form.setValues(config.toForm(log));
      form.resetDirty();
      formHandlers.open();
    },
    
    [config, formHandlers],
  );

  const handleSubmit = useCallback(
    async (values: LogFormValues) => {
      setSaving(true);
      const logDate = String(values.logDate);
      const extra = config.buildExtra(values) as OperationLogExtra;
      const nextYear = yearOf(logDate);
      try {
        if (editing) {
          await cMngtConnector.updateOperationLog<OperationLogExtra>({
            id: editing.id,
            targetId,
            period: String(year),
            version: editing.version,
            logDate,
            extra,
          });
          notifications.show({
            color: 'green',
            message: tr('operationLogs.notifications.updateSuccess'),
          });
        } else {
          await cMngtConnector.createOperationLog<OperationLogExtra>({
            targetId,
            targetCode,
            logType: config.logType,
            logDate,
            extra,
          });
          notifications.show({
            color: 'green',
            message: tr('operationLogs.notifications.createSuccess'),
          });
        }
        formHandlers.close();
        setEditing(null);
        setYear(nextYear);
        await load(nextYear);
      } catch (err) {
        notifications.show({
          color: 'red',
          message:
            serverMessage(err) ??
            (editing
              ? tr('operationLogs.notifications.updateError')
              : tr('operationLogs.notifications.createError')),
          autoClose: 8000,
        });
      } finally {
        setSaving(false);
      }
    },
    [editing, targetId, targetCode, year, config, tr, load, formHandlers],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await cMngtConnector.deleteOperationLog({
        id: deleteTarget.id,
        targetId,
        period: String(year),
        version: deleteTarget.version,
      });
      notifications.show({
        color: 'green',
        message: tr('operationLogs.notifications.deleteSuccess'),
      });
      setDeleteTarget(null);
      await load(year);
    } catch (err) {
      notifications.show({
        color: 'red',
        message: serverMessage(err) ?? tr('operationLogs.notifications.deleteError'),
        autoClose: 8000,
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, targetId, year, tr, load]);

  if (!canView) return null;

  const showActions = canEdit || canDelete;

  return (
    <SectionCard
      icon={config.icon}
      title={tr(config.titleKey)}
      actions={
        <Group gap="xs" wrap="nowrap">
          <Select
            size="xs"
            w={130}
            data={monthOptions}
            value={month}
            onChange={(v) => setMonth(v ?? 'all')}
            allowDeselect={false}
            aria-label={tr('operationLogs.monthLabel')}
          />
          <Select
            size="xs"
            w={100}
            data={yearOptions}
            value={String(year)}
            onChange={switchYear}
            allowDeselect={false}
            aria-label={tr('operationLogs.yearLabel')}
          />
          {config.export && (
            <Button
              onClick={() =>
                config.export?.(visibleLogs, {
                  targetId,
                  targetCode,
                  year,
                  month,
                  monthLabel:
                    month === 'all'
                      ? undefined
                      : monthOptions.find((o) => o.value === month)?.label,
                  language: i18n.language,
                })
              }
              size="compact-sm"
              variant="default"
              leftSection={<IconDownload size={14} />}
              disabled={visibleLogs.length === 0}
            >
              {tr(config.exportLabelKey ?? 'operationLogs.exportExcel')}
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={openAdd}
              size="compact-sm"
              variant="light"
              leftSection={<IconPlus size={14} />}
            >
              {tr(config.addLabelKey)}
            </Button>
          )}
        </Group>
      }
    >
      {loading ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : visibleLogs.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {tr(config.emptyKey, { year })}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={680}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {config.columns.map((col) => (
                  <Table.Th key={col.header} ta={col.align}>
                    {tr(col.header)}
                  </Table.Th>
                ))}
                {showActions && <Table.Th w={72} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleLogs.map((log) => {
                const tone = config.rowTone?.(log, visibleLogs);
                const row = (
                  <Table.Tr
                    key={log.id}
                    style={
                      tone?.danger
                        ? { backgroundColor: 'var(--mantine-color-red-light)' }
                        : undefined
                    }
                  >
                    {config.columns.map((col) => (
                      <Table.Td
                        key={col.header}
                        ta={col.align}
                        fw={col.emphasize ? 600 : undefined}
                        style={col.nowrap ? { whiteSpace: 'nowrap' } : undefined}
                      >
                        {col.render(log)}
                      </Table.Td>
                    ))}
                    {showActions && (
                      <Table.Td>
                        <Group gap={2} wrap="nowrap" justify="flex-end">
                          {canEdit && (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => openEdit(log)}
                              aria-label={tr('operationLogs.actions.edit')}
                            >
                              <IconPencil size={15} />
                            </ActionIcon>
                          )}
                          {canDelete && (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => setDeleteTarget(log)}
                              aria-label={tr('operationLogs.actions.delete')}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
                return tone?.danger && tone.tooltipKey ? (
                  <Tooltip key={log.id} label={tr(tone.tooltipKey)} withArrow multiline w={220}>
                    {row}
                  </Tooltip>
                ) : (
                  row
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {!loading && visibleLogs.length > 0 && config.summary?.(visibleLogs, tr)}

      <ResponsiveModal
        opened={formOpened}
        onClose={formHandlers.close}
        title={editing ? tr(config.editTitleKey) : tr(config.addTitleKey)}
        size={config.modalSize}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {config.renderFields(form, tr, context)}
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" disabled={saving} onClick={formHandlers.close}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {editing
                  ? tr('operationLogs.form.updateButton')
                  : tr('operationLogs.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </form>
      </ResponsiveModal>

      <ConfirmModal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={tr('operationLogs.deleteConfirm.title')}
        message={tr('operationLogs.deleteConfirm.message', {
          date: deleteTarget ? formatDate(deleteTarget.logDate) : '',
        })}
        loading={deleting}
      />
    </SectionCard>
  );
}
