import { Alert, Card, Group, Select, Stack, Table, Text } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { BookTable } from '@/pages/books/BookTable';
import { stockLogKindFor, stockLogPickOf } from '@/pages/books/bookKinds';
import {
  bookTotalsBy,
  bookTotalsByPick,
  isVisibleBookRow,
  sortBookRows,
} from '@/pages/books/bookModel';
import { useBookWrites } from '@/pages/books/useBookWrites';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { BookEntry, Product } from '@/types';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { formatNumber } from '@/utils/number';
import { vendorCodesOf } from '@/utils/productVendorCodes';

const isMobile = device.isMobile;
const ALL = '__all__';
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;

export function ProductStockLogTab({ product }: { readonly product: Product }) {
  const { t } = useTranslation();
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(key as never, options as never) as unknown as string,
    [t],
  );
  const kind = useMemo(() => stockLogKindFor(product), [product]);
  const hasCodes = vendorCodesOf(product.extra).length > 0;
  const [rows, setRows] = useState<BookEntry[]>([]);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>(ALL);
  const employees = useEmployeeStore((s) => s.items);

  useEffect(() => {
    let cancelled = false;
    kind.bundle
      .loadPartition(product.id)
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
    // The partition is the product's id; the kind is rebuilt when the product changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const reload = useCallback(async () => {
    try {
      setRows(await kind.bundle.loadPartition(product.id));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [kind, product.id]);
  const { save, remove } = useBookWrites({
    kind,
    currentKey: () => product.id,
    setRows,
    reload,
  });

  const actorName = useCallback(
    (actor: string) => employees.find((e) => e.id === actor)?.name ?? actor,
    [employees],
  );

  const visible = useMemo(() => sortBookRows(rows.filter(isVisibleBookRow)), [rows]);
  const unitOf = useCallback((row: BookEntry) => row.extra.unit ?? kind.unit ?? '', [kind.unit]);
  const byCode = useMemo(
    () => bookTotalsByPick(visible, stockLogPickOf, unitOf),
    [visible, unitOf],
  );
  const inAll = useMemo(() => bookTotalsBy(visible, unitOf), [visible, unitOf]);

  const filterData = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of kind.pickColumn?.options() ?? []) seen.set(o.key, o.label);
    for (const row of visible) {
      const p = stockLogPickOf(row);
      if (p && !seen.has(p.key)) seen.set(p.key, p.label);
    }
    return [
      { value: ALL, label: tr('books.stockLog.filterAll') },
      ...[...seen.entries()].map(([value, label]) => ({ value, label })),
    ];
  }, [kind, visible, tr]);

  const shown = useMemo(
    () => (filter === ALL ? visible : visible.filter((r) => stockLogPickOf(r)?.key === filter)),
    [visible, filter],
  );

  const writable = hasCodes && !isMobile;
  const today = todayInVnDateString();

  if (failed) return <Text c="red">{tr('books.table.loadFailed')}</Text>;

  return (
    <Stack gap="md">
      {!hasCodes && (
        <Alert variant="light" color="gray">
          {tr('books.stockLog.needsCodes')}
        </Alert>
      )}

      <Group align="flex-end" gap="sm">
        <Select
          label={tr('books.stockLog.filterLabel')}
          data={filterData}
          value={filter}
          onChange={(v) => setFilter(v ?? ALL)}
          allowDeselect={false}
          w={280}
        />
      </Group>

      <BookTable
        kind={kind}
        rows={shown}
        defaultDate={today}
        canCreate={writable && kind.canCreate()}
        canEdit={writable && kind.canEdit()}
        canDelete={writable && kind.canDelete()}
        onSave={save}
        onDelete={remove}
        actorName={actorName}
        loaded={loaded}
      />

      {byCode.length > 0 && (
        <Card withBorder radius="md" padding={0} data-testid="stock-log-totals">
          <Table verticalSpacing={6} horizontalSpacing="sm" fz="sm">
            <Table.Thead bg="var(--mantine-color-gray-0)">
              <Table.Tr>
                <Table.Th c="gray.7" fw={500}>
                  {tr('books.stockLog.totalsByCode')}
                </Table.Th>
                <Table.Th c="gray.7" fw={500}>
                  {tr('books.stockLog.unit')}
                </Table.Th>
                <Table.Th c="gray.7" fw={500} ta="right">
                  {tr('books.stockLog.columns.in')}
                </Table.Th>
                <Table.Th c="gray.7" fw={500} ta="right">
                  {tr('books.stockLog.columns.out')}
                </Table.Th>
                <Table.Th c="gray.7" fw={500} ta="right">
                  {tr('books.stockLog.balance')}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {byCode.map((g) => (
                <Table.Tr key={`${g.pickKey}|${g.unit}`}>
                  <Table.Td>{g.label}</Table.Td>
                  <Table.Td>{g.unit}</Table.Td>
                  <Table.Td ta="right" style={TABULAR}>
                    {formatNumber(g.inTotal)}
                  </Table.Td>
                  <Table.Td ta="right" style={TABULAR}>
                    {formatNumber(g.outTotal)}
                  </Table.Td>
                  <Table.Td ta="right" style={TABULAR}>
                    {formatNumber(g.balance)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
            <Table.Tfoot>
              {inAll.map((g) => (
                <Table.Tr key={g.key} bg="var(--mantine-color-gray-0)">
                  <Table.Th>{tr('books.stockLog.allCodes')}</Table.Th>
                  <Table.Th>{g.key}</Table.Th>
                  <Table.Th ta="right" style={TABULAR}>
                    {formatNumber(g.inTotal)}
                  </Table.Th>
                  <Table.Th ta="right" style={TABULAR}>
                    {formatNumber(g.outTotal)}
                  </Table.Th>
                  <Table.Th ta="right" style={TABULAR}>
                    {formatNumber(g.balance)}
                  </Table.Th>
                </Table.Tr>
              ))}
            </Table.Tfoot>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
