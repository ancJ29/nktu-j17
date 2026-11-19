import { ActionIcon, Box, Button, Card, Group, Table, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GroupedNumberInput } from '@/components/GroupedNumberInput';
import type { BookEntry } from '@/types';
import { formatDateTime } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import {
  bookTotals,
  bookTotalsBy,
  validateBookDraft,
  type BookDraft,
  type BookField,
  type BookIssue,
  type ValidBookDraft,
} from './bookModel';
import { balanceColor } from '@/pages/odometer-logs/balanceColor';
import type { BookKind } from './bookKinds';

type Props = {
  readonly kind: BookKind;

  readonly rows: readonly BookEntry[];

  readonly defaultDate: string;
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;

  readonly onSave: (valid: ValidBookDraft, existing?: BookEntry) => Promise<void>;
  readonly onDelete: (row: BookEntry) => Promise<void>;

  readonly actorName: (actor: string) => string;

  readonly loaded: boolean;
};

type Col = 'recordDate' | 'pick' | 'description' | 'inValue' | 'outValue' | 'note';
const NEW = '__new__';

type Open = { id: string; draft: BookDraft; focus: Col; issue?: BookIssue; field?: BookField };

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;
const cellStyle = { verticalAlign: 'top' } as const;
const numStyle = { ...cellStyle, textAlign: 'right', ...TABULAR } as const;

const OPEN_BG = 'var(--mantine-color-primary-0)';
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '4px 6px',
  font: 'inherit',
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 4,
  background: 'var(--mantine-color-body)',
  color: 'inherit',
} as const;

const draftOf = (row: BookEntry, pick?: string): BookDraft => ({
  recordDate: row.recordDate,
  pick,
  description: row.extra.description ?? '',
  inValue: row.extra.inValue,
  outValue: row.extra.outValue,
  note: row.extra.note ?? '',
});

const emptyDraft = (date: string): BookDraft => ({
  recordDate: date,
  pick: undefined,
  description: '',
  inValue: undefined,
  outValue: undefined,
  note: '',
});

const sameDraft = (a: BookDraft, b: BookDraft) =>
  a.recordDate === b.recordDate &&
  (a.pick ?? '') === (b.pick ?? '') &&
  a.description.trim() === b.description.trim() &&
  (a.inValue ?? '') === (b.inValue ?? '') &&
  (a.outValue ?? '') === (b.outValue ?? '') &&
  (a.note ?? '').trim() === (b.note ?? '').trim();

const dayLabel = (d: string) => d.split('-').reverse().join('/');

type PlainRowProps = {
  readonly row: BookEntry;
  readonly editable: boolean;
  readonly canDelete: boolean;
  readonly title: string;

  readonly pickLabel?: string;

  readonly unitSuffix: string;
  readonly deleteLabel: string;
  readonly onOpen: (row: BookEntry, col: Col) => void;
  readonly onAskDelete: (row: BookEntry) => void;
};

const PlainRow = memo(function PlainRow({
  row,
  editable,
  canDelete,
  title,
  pickLabel,
  unitSuffix,
  deleteLabel,
  onOpen,
  onAskDelete,
}: PlainRowProps) {
  const open = (col: Col) => () => editable && onOpen(row, col);
  const cursor = editable ? 'text' : undefined;
  const style = { ...cellStyle, cursor };
  return (
    <Table.Tr title={title}>
      <Table.Td style={style} onClick={open('recordDate')}>
        {dayLabel(row.recordDate)}
      </Table.Td>
      {pickLabel !== undefined && (
        <Table.Td style={style} onClick={open('pick')}>
          {pickLabel}
        </Table.Td>
      )}
      <Table.Td style={style} onClick={open('description')}>
        {row.extra.description}
      </Table.Td>
      <Table.Td style={{ ...numStyle, cursor }} c="primary.8" fw={600} onClick={open('inValue')}>
        {row.extra.inValue !== undefined ? formatNumber(row.extra.inValue) + unitSuffix : ''}
      </Table.Td>
      <Table.Td style={{ ...numStyle, cursor }} onClick={open('outValue')}>
        {row.extra.outValue !== undefined ? formatNumber(row.extra.outValue) + unitSuffix : ''}
      </Table.Td>
      <Table.Td style={style} onClick={open('note')}>
        {row.extra.note ?? ''}
      </Table.Td>
      {canDelete && (
        <Table.Td style={{ ...cellStyle, width: 1, whiteSpace: 'nowrap' }}>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            aria-label={deleteLabel}
            onClick={() => onAskDelete(row)}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Table.Td>
      )}
    </Table.Tr>
  );
});

export function BookTable({
  kind,
  rows,
  defaultDate,
  canCreate,
  canEdit,
  canDelete,
  onSave,
  onDelete,
  actorName,
  loaded,
}: Props) {
  const unitLabel = kind.unit;
  const pickColumn = kind.pickColumn;
  const { t } = useTranslation();
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(key as never, options as never) as unknown as string,
    [t],
  );
  const prefix = `books.${kind.i18nPrefix}`;
  const [open, setOpen] = useState<Open | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BookEntry | null>(null);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const queue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const next = queueRef.current.then(job, job);
    queueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const totals = useMemo(() => bookTotals(rows), [rows]);

  const unitOf = useCallback((row: BookEntry) => row.extra.unit ?? unitLabel ?? '', [unitLabel]);
  const groups = useMemo(
    () => bookTotalsBy(rows, kind.fixedExtra?.unit !== undefined ? unitOf : undefined),
    [rows, kind.fixedExtra, unitOf],
  );

  useEffect(() => {
    if (!open) return;
    const el = rowRef.current?.querySelector<HTMLInputElement>(`[data-col="${open.focus}"]`);
    el?.focus();
    // Only when a different row opens: typing must not steal focus back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  const openRow = useCallback(
    (row: BookEntry, col: Col) => {
      if (openRef.current?.id === row.id) return;
      setSaveError(null);
      setOpen({ id: row.id, draft: draftOf(row, pickColumn?.pickOf(row)?.key), focus: col });
    },
    [pickColumn],
  );
  const openNew = (col: Col) => {
    if (!canCreate || openRef.current?.id === NEW) return;
    setSaveError(null);
    setOpen({ id: NEW, draft: emptyDraft(defaultDate), focus: col });
  };

  const existingOf = (id: string) => rows.find((r) => r.id === id);

  const commit = useCallback(async () => {
    const cur = openRef.current;
    if (!cur || saving) return;
    const existing = cur.id === NEW ? undefined : existingOf(cur.id);
    const untouched = existing
      ? sameDraft(cur.draft, draftOf(existing, pickColumn?.pickOf(existing)?.key))
      : sameDraft(cur.draft, emptyDraft(defaultDate));
    if (untouched) {
      setOpen(null);
      return;
    }
    const v = validateBookDraft(cur.draft, kind.valueKind, {
      pickRequired: pickColumn?.required,
    });
    if (!v.ok) {
      setOpen({ ...cur, issue: v.issue, field: v.field });
      return;
    }
    const picked = pickColumn?.options(existing).find((o) => o.key === cur.draft.pick);
    const valid = picked ? { ...v.value, pickSnapshot: picked.snapshot } : v.value;
    setSaving(true);
    setSaveError(null);
    try {
      await queue(() => onSave(valid, existing));
      setOpen(null);
    } catch {
      setSaveError(tr('books.table.saveFailed'));
    } finally {
      setSaving(false);
    }
    // `rows` and `defaultDate` are read at the moment of leaving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, rows, defaultDate, kind.valueKind, pickColumn, onSave, queue]);

  const askDelete = useCallback((row: BookEntry) => setToDelete(row), []);
  const confirmDelete = async () => {
    const row = toDelete;
    if (!row) return;
    setSaving(true);
    try {
      await queue(() => onDelete(row));
      setToDelete(null);
    } catch {
      setSaveError(tr('books.table.saveFailed'));
      setToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  const onRowBlur = () => {
    setTimeout(() => {
      const el = rowRef.current;
      if (!el || el.contains(document.activeElement)) return;
      void commit();
    }, 0);
  };
  const onRowKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setSaveError(null);
      setOpen(null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    }
  };

  const setDraft = (patch: Partial<BookDraft>) =>
    setOpen((cur) =>
      cur ? { ...cur, draft: { ...cur.draft, ...patch }, issue: undefined, field: undefined } : cur,
    );

  const mark = (field: BookField) =>
    open?.field === field ? { borderColor: 'var(--mantine-color-red-6)' } : undefined;

  const whoWhen = (row: BookEntry) => {
    const created =
      row.createdAt !== undefined
        ? tr('books.table.whoWhen', {
            who: actorName(row.extra.createdBy),
            when: formatDateTime(row.createdAt),
          })
        : '';
    const edited =
      row.extra.updatedBy && row.updatedAt !== undefined
        ? tr('books.table.whoWhenEdited', {
            who: actorName(row.extra.updatedBy),
            when: formatDateTime(row.updatedAt),
          })
        : '';
    return [created, edited].filter(Boolean).join('\n');
  };

  const numInput = (col: 'inValue' | 'outValue') => (
    <GroupedNumberInput
      data-col={col}
      hideControls
      allowNegative={false}
      decimalScale={kind.valueKind === 'money' ? 0 : 3}
      value={open?.draft[col] ?? ''}
      onChange={(v) => setDraft({ [col]: v })}
      styles={{ input: { textAlign: 'right', ...mark(col) } }}
      size="xs"
    />
  );

  const editRow = open && (
    <Table.Tr ref={rowRef} onBlur={onRowBlur} onKeyDown={onRowKey} bg={OPEN_BG}>
      <Table.Td style={cellStyle}>
        <input
          data-col="recordDate"
          type="date"
          value={open.draft.recordDate}
          onChange={(e) => setDraft({ recordDate: e.currentTarget.value })}
          style={{ ...inputStyle, ...mark('recordDate') }}
        />
      </Table.Td>
      {pickColumn && (
        <Table.Td style={cellStyle}>
          <select
            data-col="pick"
            value={open.draft.pick ?? ''}
            onChange={(e) => setDraft({ pick: e.currentTarget.value || undefined })}
            style={{ ...inputStyle, ...mark('pick') }}
          >
            <option value="">{tr(pickColumn.placeholderKey)}</option>
            {pickColumn.options(open.id === NEW ? undefined : existingOf(open.id)).map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </Table.Td>
      )}
      <Table.Td style={cellStyle}>
        <input
          data-col="description"
          type="text"
          value={open.draft.description}
          onChange={(e) => setDraft({ description: e.currentTarget.value })}
          style={{ ...inputStyle, ...mark('description') }}
        />
      </Table.Td>
      <Table.Td style={numStyle}>{numInput('inValue')}</Table.Td>
      <Table.Td style={numStyle}>{numInput('outValue')}</Table.Td>
      <Table.Td style={cellStyle}>
        <input
          data-col="note"
          type="text"
          value={open.draft.note ?? ''}
          onChange={(e) => setDraft({ note: e.currentTarget.value })}
          style={inputStyle}
        />
      </Table.Td>
      {canDelete && <Table.Td />}
    </Table.Tr>
  );

  const colCount = 5 + (pickColumn ? 1 : 0) + (canDelete ? 1 : 0);
  const unit = unitLabel ? ` (${unitLabel})` : '';

  const amount = (n: number) => `${formatNumber(n)} đ`;

  const figure = (n: number, unitKey: string) =>
    kind.valueKind === 'money' ? amount(n) : `${formatNumber(n)}${unitKey ? ` ${unitKey}` : ''}`;
  const labelSpan = pickColumn ? 3 : 2;
  const headStyle = { textAlign: 'right', fontWeight: 500 } as const;

  return (
    <>
      {/* The month's figure that matters, in the money tab's colour, with the one
          primary action beside it (the odometer's "Ghi thanh toán" place). */}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Box>
          {kind.valueKind === 'money' && (
            <Text>
              {tr('books.table.monthTotal')}: {tr(`${prefix}.balance`)}{' '}
              <Text span fw={700} c={balanceColor(totals.balance)} style={TABULAR}>
                {amount(totals.balance)}
              </Text>
            </Text>
          )}
          {(canEdit || canCreate) && (
            <Text size="sm" c="gray.7">
              {tr('books.table.hint')}
            </Text>
          )}
        </Box>
        {canCreate && (
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => openNew('description')}
          >
            {tr('books.table.addRow')}
          </Button>
        )}
      </Group>

      <Card withBorder radius="md" padding={0} data-loaded={loaded ? 'true' : undefined}>
        <Table verticalSpacing={6} horizontalSpacing="sm" fz="sm" highlightOnHover={canEdit}>
          <Table.Thead bg="var(--mantine-color-gray-0)">
            <Table.Tr>
              <Table.Th c="gray.7" fw={500}>
                {tr(`${prefix}.columns.date`)}
              </Table.Th>
              {pickColumn && (
                <Table.Th c="gray.7" fw={500}>
                  {tr(pickColumn.headerKey)}
                </Table.Th>
              )}
              <Table.Th c="gray.7" fw={500}>
                {tr(`${prefix}.columns.description`)}
              </Table.Th>
              <Table.Th c="gray.7" style={headStyle}>
                {tr(`${prefix}.columns.in`) + unit}
              </Table.Th>
              <Table.Th c="gray.7" style={headStyle}>
                {tr(`${prefix}.columns.out`) + unit}
              </Table.Th>
              <Table.Th c="gray.7" fw={500}>
                {tr(`${prefix}.columns.note`)}
              </Table.Th>
              {canDelete && <Table.Th w={40} />}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && !open && (
              <Table.Tr>
                <Table.Td colSpan={colCount}>
                  <Text c="dimmed" size="sm">
                    {tr(`${prefix}.empty`)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {rows.map((row) =>
              open?.id === row.id ? (
                <Fragment key={row.id}>{editRow}</Fragment>
              ) : (
                <PlainRow
                  key={row.id}
                  row={row}
                  editable={canEdit}
                  canDelete={canDelete}
                  title={whoWhen(row)}
                  pickLabel={pickColumn ? (pickColumn.pickOf(row)?.label ?? '') : undefined}
                  unitSuffix={
                    row.extra.unit && row.extra.unit !== unitLabel ? ` ${row.extra.unit}` : ''
                  }
                  deleteLabel={tr('books.table.delete')}
                  onOpen={openRow}
                  onAskDelete={askDelete}
                />
              ),
            )}
            {open?.id === NEW && editRow}
          </Table.Tbody>
          <Table.Tfoot>
            {groups.map((g) => (
              <Table.Tr key={g.key} bg="var(--mantine-color-gray-0)">
                <Table.Th colSpan={labelSpan}>
                  {tr('books.table.total')}
                  {groups.length > 1 && g.key ? ` (${g.key})` : ''}
                </Table.Th>
                <Table.Th style={{ ...headStyle, ...TABULAR }}>{formatNumber(g.inTotal)}</Table.Th>
                <Table.Th style={{ ...headStyle, ...TABULAR }}>{formatNumber(g.outTotal)}</Table.Th>
                <Table.Th colSpan={canDelete ? 2 : 1} c={balanceColor(g.balance)} style={TABULAR}>
                  {tr(`${prefix}.balance`)}: {figure(g.balance, g.key)}
                </Table.Th>
              </Table.Tr>
            ))}
          </Table.Tfoot>
        </Table>
      </Card>

      <Group mt="xs" gap="sm">
        {open?.issue && (
          <Text size="sm" c="red" role="alert">
            {tr(`books.table.issue.${open.issue}`)}
          </Text>
        )}
        {saveError && (
          <Text size="sm" c="red" role="alert">
            {saveError}
          </Text>
        )}
      </Group>

      <ConfirmModal
        opened={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title={tr('books.table.confirmDeleteTitle')}
        message={tr('books.table.confirmDelete')}
        confirmLabel={tr('books.table.delete')}
        loading={saving}
      />
    </>
  );
}
