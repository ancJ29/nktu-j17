import type { Ref } from 'react';
import type { SheetRow } from '@/utils/cropSheetModel';

export type SheetGridRowProps = {
  readonly row: SheetRow;
  readonly isToday: boolean;
  readonly rowRef?: Ref<HTMLTableRowElement>;
  readonly editable: boolean;

  readonly dayLabel: string;
  readonly onCellChange: (day: number, key: string, raw: string) => void;

  readonly onOpenDay: (day: number) => void;

  readonly openLabel: string;
};

export function sameSheetRow(a: SheetGridRowProps, b: SheetGridRowProps): boolean {
  if (
    a.isToday !== b.isToday ||
    a.editable !== b.editable ||
    a.rowRef !== b.rowRef ||
    a.dayLabel !== b.dayLabel ||
    a.onCellChange !== b.onCellChange ||
    a.onOpenDay !== b.onOpenDay ||
    a.openLabel !== b.openLabel
  ) {
    return false;
  }
  if (a.row === b.row) return true;
  if (
    a.row.day !== b.row.day ||
    a.row.date !== b.row.date ||
    a.row.stage !== b.row.stage ||
    a.row.cells.length !== b.row.cells.length
  ) {
    return false;
  }
  return a.row.cells.every((cell, i) => {
    const other = b.row.cells[i]!;
    return (
      cell.column === other.column &&
      cell.value === other.value &&
      cell.changed === other.changed &&
      cell.dayTotal === other.dayTotal
    );
  });
}
