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
import { randomId, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cMngtConnector, CallApiError } from '@credo/connectors/connector';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { SectionCard } from '@/components/SectionCard';
import { SortHeader } from '@/components/SortHeader';
import { QuickFilterChips } from '@/components/QuickFilterChips';
import { formatDate } from '@/utils/dateFormat';
import { buildExpiringUploadDirectory } from '@/utils/uploadPath';
import type { OperationLog, OperationLogExtra } from '@/types';
import {
  datePart,
  DRAFT_PHOTO_PREFIX,
  formPhotos,
  PHOTOS_FIELD,
  todayString,
  yearOf,
  type LogFormValues,
  type OperationLogConfig,
  type OperationLogContext,
  type OperationLogPerms,
  type OperationLogWriteEvent,
  type TFn,
} from './operationLogConfig';
import { LogPhotoCell, LogPhotoField, LogPhotoGalleryModal } from './OperationLogPhotos';
import { Form } from '@/components/Form';

const CURRENT_YEAR = new Date().getFullYear();

type GroupedRow = {
  log: OperationLog;

  grouped: boolean;

  firstOfGroup: boolean;
};

function groupRows(logs: OperationLog[], group: OperationLogConfig['group']): GroupedRow[] {
  if (!group) return logs.map((log) => ({ log, grouped: false, firstOfGroup: false }));

  const buckets = new Map<string, OperationLog[]>();
  const ordered: OperationLog[][] = [];
  for (const log of logs) {
    const key = group.keyOf(log);
    if (key === undefined) {
      ordered.push([log]);
      continue;
    }
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      ordered.push(bucket);
    }
    bucket.push(log);
  }

  const rank = (bucket: OperationLog[]) =>
    bucket.reduce((latest, l) => {
      const d = datePart(l.logDate);
      return d > latest ? d : latest;
    }, '');

  return [...ordered]
    .sort((a, b) => rank(b).localeCompare(rank(a)))
    .flatMap((bucket) => {
      const rows = group.compare ? [...bucket].sort(group.compare) : bucket;
      return rows.map((log, i) => ({
        log,
        grouped: rows.length > 1,
        firstOfGroup: i === 0,
      }));
    });
}

function serverMessage(err: unknown): string | undefined {
  if (err instanceof CallApiError && typeof err.payload === 'object' && err.payload !== null) {
    const m = (err.payload as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return undefined;
}

function cloneFormValues(values: LogFormValues): LogFormValues {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      Array.isArray(v) ? (v as object[]).map((r) => ({ ...r })) : v,
    ]),
  ) as LogFormValues;
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

  const [bucket, setBucket] = useState<string>(config.quickFilters?.options[0]?.value ?? '');

  const [entity, setEntity] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>('');

  const [formOpened, formHandlers] = useDisclosure(false);
  const [editing, setEditing] = useState<OperationLog | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OperationLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const photoCfg = config.photos;

  const [galleryLog, setGalleryLog] = useState<OperationLog | null>(null);

  const [draftPhotoId, setDraftPhotoId] = useState(() => randomId(DRAFT_PHOTO_PREFIX));

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

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

  const entityOptions = useMemo(() => {
    const valueOf = config.entityFilter?.valueOf;
    if (!valueOf) return [];
    const seen = new Set<string>();
    for (const log of visibleLogs) {
      const value = valueOf(log)?.trim();
      if (value) seen.add(value);
    }
    return [...seen].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
  }, [visibleLogs, config.entityFilter]);

  const filteredLogs = useMemo(() => {
    const match = config.quickFilters?.options.find((o) => o.value === bucket)?.match;
    const valueOf = config.entityFilter?.valueOf;
    return visibleLogs.filter((log) => {
      if (match && !match(log)) return false;
      if (entity && valueOf?.(log)?.trim() !== entity) return false;
      return true;
    });
  }, [visibleLogs, bucket, entity, config.quickFilters, config.entityFilter]);

  const sortedLogs = useMemo(() => {
    if (!sortKey) return filteredLogs;
    const [field, dir] = sortKey.split('_');
    const column = config.columns.find((c) => c.sortField === field && c.sortValue);
    if (!column?.sortValue) return filteredLogs;
    const mult = dir === 'asc' ? 1 : -1;
    const valueOf = column.sortValue;
    return [...filteredLogs].sort((a, b) => (valueOf(a) - valueOf(b)) * mult);
  }, [filteredLogs, sortKey, config.columns]);

  const rows = useMemo(() => groupRows(sortedLogs, config.group), [sortedLogs, config.group]);

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
    setDraftPhotoId(randomId(DRAFT_PHOTO_PREFIX));
    form.setValues({
      ...cloneFormValues(config.emptyForm),
      logDate: todayString(),

      ...(photoCfg && { [PHOTOS_FIELD]: [] }),
    });
    form.resetDirty();
    formHandlers.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form identity is stable across renders
  }, [config.emptyForm, photoCfg, formHandlers]);

  const openEdit = useCallback(
    (log: OperationLog) => {
      setEditing(log);
      form.setValues({
        ...config.toForm(log),
        ...(photoCfg && { [PHOTOS_FIELD]: log.extra?.photos ?? [] }),
      });
      form.resetDirty();
      formHandlers.open();
    },

    [config, photoCfg, formHandlers],
  );

  const runAfterWrite = useCallback(
    async (event: OperationLogWriteEvent) => {
      if (!config.afterWrite) return;
      try {
        await config.afterWrite(event, tr);
      } catch {
        notifications.show({
          color: 'yellow',
          message: tr(config.afterWriteErrorKey ?? 'operationLogs.notifications.afterWriteError'),
          autoClose: 10000,
        });
      }
    },
    [config, tr],
  );

  const handleSubmit = useCallback(
    async (values: LogFormValues) => {
      const errors = config.validateOnSubmit?.({ values, previous: editing, context, t: tr });
      if (errors && Object.keys(errors).length > 0) {
        form.setErrors(errors);
        return;
      }
      setSaving(true);
      const logDate = String(values.logDate);

      const photos = photoCfg ? formPhotos(values) : [];
      const extra = {
        ...config.buildExtra(values),
        ...(photos.length > 0 && { photos }),
      } as OperationLogExtra;
      const nextYear = yearOf(logDate);
      try {
        let saved: OperationLog;
        if (editing) {
          const res = await cMngtConnector.updateOperationLog<OperationLogExtra>({
            id: editing.id,
            targetId,
            period: String(year),
            version: editing.version,
            logDate,
            extra,
          });
          saved = res.operationLog as OperationLog;
          notifications.show({
            color: 'green',
            message: tr('operationLogs.notifications.updateSuccess'),
          });
        } else {
          const res = await cMngtConnector.createOperationLog<OperationLogExtra>({
            targetId,
            targetCode,
            logType: config.logType,
            logDate,
            extra,
          });
          saved = res.operationLog as OperationLog;
          notifications.show({
            color: 'green',
            message: tr('operationLogs.notifications.createSuccess'),
          });
        }

        await runAfterWrite({
          op: editing ? 'update' : 'create',
          log: saved,
          previous: editing,
          targetId,
          targetCode,
        });
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
    [
      editing,
      targetId,
      targetCode,
      year,
      config,
      photoCfg,
      tr,
      load,
      formHandlers,
      runAfterWrite,
      context,
      form,
    ],
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
      await runAfterWrite({
        op: 'delete',
        log: deleteTarget,
        previous: null,
        targetId,
        targetCode,
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
  }, [deleteTarget, targetId, targetCode, year, tr, load, runAfterWrite]);

  if (!canView) return null;

  const showActions = canEdit || canDelete;
  const expandable = Boolean(config.renderExpanded);
  const photoLabel = tr(photoCfg?.labelKey ?? 'operationLogs.photos.label');

  const detailColSpan =
    config.columns.length + (expandable ? 1 : 0) + (photoCfg ? 1 : 0) + (showActions ? 1 : 0);

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
          />
          <Select
            size="xs"
            w={100}
            data={yearOptions}
            value={String(year)}
            onChange={switchYear}
            allowDeselect={false}
          />
          {/* Hidden until the loaded period actually holds more than one value —
              a picker offering a single option is a control that cannot do
              anything, and one offering none is worse. */}
          {config.entityFilter && entityOptions.length > 1 && (
            <Select
              size="xs"
              w={160}
              data={entityOptions}
              value={entity}
              onChange={setEntity}
              placeholder={tr(config.entityFilter.labelKey)}
              clearable
              searchable={entityOptions.length > 8}
            />
          )}
          {config.export && (
            <Button
              onClick={() =>
                config.export?.(sortedLogs, {
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
              disabled={sortedLogs.length === 0}
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
      {/* Above the empty-state branch on purpose: with a bucket selected and no
          match, the chips must stay on screen or the operator has no way back
          to the rows — only a "no entries" message and no visible cause. */}
      {config.quickFilters && !loading && (
        <QuickFilterChips
          chips={config.quickFilters.options.map((option) => ({
            key: option.value,
            label: tr(option.labelKey),
            active: bucket === option.value,
            onClick: () => setBucket(option.value),
          }))}
        />
      )}
      {loading ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : sortedLogs.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {tr(config.emptyKey, { year })}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={680}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {expandable && <Table.Th w={36} />}
                {config.columns.map((col) => (
                  <Table.Th key={col.header} ta={col.align}>
                    {col.sortValue && col.sortField ? (
                      <SortHeader
                        label={tr(col.header)}
                        field={col.sortField}
                        current={sortKey}
                        onChange={setSortKey}
                      />
                    ) : (
                      tr(col.header)
                    )}
                  </Table.Th>
                ))}
                {photoCfg && <Table.Th w={72}>{photoLabel}</Table.Th>}
                {showActions && <Table.Th w={72} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map(({ log, grouped, firstOfGroup }, index) => {
                const tone = config.rowTone?.(log, sortedLogs);
                const isOpen = expanded.has(log.id);

                const locked = config.rowLocked?.(log) ?? false;
                const row = (
                  <Table.Tr
                    key={log.id}
                    style={{
                      ...(tone?.danger
                        ? { backgroundColor: 'var(--mantine-color-red-light)' }
                        : grouped
                          ? { backgroundColor: 'var(--mantine-color-default-hover)' }
                          : {}),
                      ...(firstOfGroup && index > 0
                        ? { borderTop: '2px solid var(--mantine-color-default-border)' }
                        : {}),
                    }}
                  >
                    {expandable && (
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={() => toggleExpanded(log.id)}
                        >
                          {isOpen ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
                        </ActionIcon>
                      </Table.Td>
                    )}
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
                    {photoCfg && (
                      <Table.Td>
                        <LogPhotoCell
                          photos={log.extra?.photos}
                          onOpen={() => setGalleryLog(log)}
                          t={tr}
                        />
                      </Table.Td>
                    )}
                    {showActions && (
                      <Table.Td>
                        <Group gap={2} wrap="nowrap" justify="flex-end">
                          {canEdit && !locked && (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => openEdit(log)}
                            >
                              <IconPencil size={15} />
                            </ActionIcon>
                          )}
                          {canDelete && !locked && (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => setDeleteTarget(log)}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
                const toned =
                  tone?.danger && tone.tooltipKey ? (
                    <Tooltip key={log.id} label={tr(tone.tooltipKey)} withArrow multiline w={220}>
                      {row}
                    </Tooltip>
                  ) : (
                    row
                  );
                if (!expandable || !isOpen) return toned;
                return (
                  <Fragment key={log.id}>
                    {toned}
                    <Table.Tr bg="var(--mantine-color-default-hover)">
                      <Table.Td colSpan={detailColSpan} p="md">
                        {config.renderExpanded?.(log, tr)}
                      </Table.Td>
                    </Table.Tr>
                  </Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {!loading && sortedLogs.length > 0 && config.summary?.(sortedLogs, tr)}

      <ResponsiveModal
        opened={formOpened}
        onClose={formHandlers.close}
        title={editing ? tr(config.editTitleKey) : tr(config.addTitleKey)}
        size={config.modalSize}
      >
        <Form form={form} onSubmit={handleSubmit}>
          <Stack gap="md">
            {config.renderFields(form, tr, context)}
            {photoCfg && (
              <LogPhotoField
                photos={formPhotos(form.values)}
                onChange={(next) => form.setFieldValue(PHOTOS_FIELD, next)}

                directory={buildExpiringUploadDirectory({
                  type: photoCfg.directoryType,
                  id: editing?.id ?? draftPhotoId,
                })}
                label={photoLabel}
                marker={targetCode}
                t={tr}
              />
            )}
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" disabled={saving} onClick={formHandlers.close}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {editing
                  ? tr('__new__.01-common.actions.save')
                  : tr('operationLogs.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </Form>
      </ResponsiveModal>

      {photoCfg && (
        <LogPhotoGalleryModal
          opened={galleryLog !== null}
          onClose={() => setGalleryLog(null)}
          photos={galleryLog?.extra?.photos}
          title={`${photoLabel} — ${galleryLog ? formatDate(galleryLog.logDate) : ''}`}
          t={tr}
        />
      )}

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
