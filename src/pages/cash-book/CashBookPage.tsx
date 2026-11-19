import { ActionIcon, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { IconCash, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { device } from '@credo/base-ui/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { BookEntry } from '@/types';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { BookTable } from '@/pages/books/BookTable';
import { useBookWrites } from '@/pages/books/useBookWrites';
import { CASH_BOOK_KIND } from '@/pages/books/bookKinds';
import { isVisibleBookRow, monthKeyOf, sortBookRows } from '@/pages/books/bookModel';

const kind = CASH_BOOK_KIND;
const isMobile = device.isMobile;
const canCreate = kind.canCreate();
const canEdit = kind.canEdit();
const canDelete = kind.canDelete();

const shiftMonth = (month: string, by: number): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export function CashBookPage() {
  const { t } = useTranslation();
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(key as never, options as never) as unknown as string,
    [t],
  );
  const today = todayInVnDateString();
  const [month, setMonth] = useState(monthKeyOf(today));
  const [rows, setRows] = useState<BookEntry[]>([]);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const monthRef = useRef(month);
  useEffect(() => {
    monthRef.current = month;
  }, [month]);
  const employees = useEmployeeStore((s) => s.items);

  const load = useCallback(async (key: string) => {
    try {
      const data = await kind.bundle.loadPartition(key);
      if (monthRef.current !== key) return;
      setRows(data);
      setFailed(false);
    } catch {
      if (monthRef.current === key) setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    kind.bundle
      .loadPartition(month)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setFailed(false);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const goMonth = useCallback((next: string) => {
    setRows([]);
    setLoaded(false);
    setMonth(next);
  }, []);

  const actorName = useCallback(
    (actor: string) => {
      const e = employees.find((x) => x.id === actor);
      return e?.name ?? actor;
    },
    [employees],
  );

  const reload = useCallback(() => load(monthRef.current), [load]);
  const { save, remove } = useBookWrites({
    kind,
    currentKey: () => monthRef.current,
    setRows,
    reload,
  });

  const visible = sortBookRows(rows.filter(isVisibleBookRow));
  const defaultDate = month === monthKeyOf(today) ? today : `${month}-01`;

  return (
    <Stack gap={isMobile ? 'md' : 'lg'} p="md">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={38} radius="md" variant="light" color="primary">
          <IconCash size={20} stroke={1.75} />
        </ThemeIcon>
        <Title order={2}>{tr(`books.${kind.i18nPrefix}.title`)}</Title>
      </Group>
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <MonthPickerInput
          label={tr(`books.${kind.i18nPrefix}.monthLabel`)}
          valueFormat="MM/YYYY"
          value={`${month}-01`}
          onChange={(v) => v && goMonth(v.slice(0, 7))}
          clearable={false}
          w={160}
        />
        <ActionIcon
          variant="default"
          size={36}
          aria-label={tr('books.table.previous')}
          onClick={() => goMonth(shiftMonth(month, -1))}
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
        <ActionIcon
          variant="default"
          size={36}
          aria-label={tr('books.table.next')}
          onClick={() => goMonth(shiftMonth(month, 1))}
        >
          <IconChevronRight size={16} />
        </ActionIcon>
      </Group>
      {failed ? (
        <Text c="red">{tr('books.table.loadFailed')}</Text>
      ) : (
        <BookTable
          kind={kind}
          rows={visible}
          defaultDate={defaultDate}
          canCreate={canCreate && !isMobile}
          canEdit={canEdit && !isMobile}
          canDelete={canDelete && !isMobile}
          onSave={save}
          onDelete={remove}
          actorName={actorName}
          loaded={loaded}
        />
      )}
    </Stack>
  );
}
