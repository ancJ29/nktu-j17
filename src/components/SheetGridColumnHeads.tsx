import { Table, Text } from '@mantine/core';
import { sheetColumnGroupSpans } from '@/utils/cropSheetModel';
import { sheetColumnThProps } from '@/utils/sheetGridLayout';
import type { SheetColumn } from '@/types';

export function SheetGroupHeadCells({ columns }: { readonly columns: readonly SheetColumn[] }) {
  const spans = sheetColumnGroupSpans(columns);
  return (
    <>
      {columns.map((column, i) =>
        spans[i]! > 0 ? (
          <Table.Th key={column.key} colSpan={spans[i]!}>
            <Text size="10px" fw={600} c="dimmed" ta="center" lh={1.2}>
              {column.group ?? ''}
            </Text>
          </Table.Th>
        ) : null,
      )}
    </>
  );
}

export function SheetColumnHeadCells({
  columns,
  unitOf,
}: {
  readonly columns: readonly SheetColumn[];
  readonly unitOf: (column: SheetColumn) => string | undefined;
}) {
  return (
    <>
      {columns.map((column) => {
        const unit = unitOf(column);
        return (
          <Table.Th key={column.key} {...sheetColumnThProps(column.kind)}>
            <Text size="xs" fw={600} lh={1.2}>
              {column.label || column.key}
            </Text>
            {unit && (
              <Text size="10px" c="dimmed" lh={1.2}>
                {unit}
              </Text>
            )}
          </Table.Th>
        );
      })}
    </>
  );
}
