import * as XLSX from 'xlsx-js-style';
import { formatDate } from '@/utils/dateFormat';

export type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };

export type NumericColumnFormat = readonly [number, string];

export const FMT_QTY_PRICE = '#,##0.00';

export const FMT_MONEY = '#,##0';

const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN } as const;
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } } as const;

const R_TITLE = 0;
const R_PERIOD = 1;
const R_HEADER = 2;
const R_FIRST_DATA = 3;

export function resolveAccountingPeriodLabel(dates: Iterable<unknown>): string {
  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;
  for (const value of dates) {
    if (value == null) continue;
    const t = new Date(value as string | number).getTime();
    if (Number.isNaN(t)) continue;
    earliest = Math.min(earliest, t);
    latest = Math.max(latest, t);
  }

  if (!Number.isFinite(earliest)) {
    const now = new Date();
    return `Tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }
  const from = new Date(earliest);
  const to = new Date(latest);
  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return `Tháng ${from.getMonth() + 1} năm ${from.getFullYear()}`;
  }
  return `Từ ${formatDate(earliest)} đến ${formatDate(latest)}`;
}

export type AccountingSheetSpec = {
  title: string;

  periodLabel: string;

  headers: readonly string[];

  colWidths: readonly number[];

  dataRows: ReadonlyArray<ReadonlyArray<string | number>>;

  numericCols: ReadonlyArray<NumericColumnFormat>;
};

export function buildAccountingWorksheet({
  title,
  periodLabel,
  headers,
  colWidths,
  dataRows,
  numericCols,
}: AccountingSheetSpec): XLSX.WorkSheet {
  const colCount = headers.length;
  const lastCol = colCount - 1;

  const titleRow = new Array(colCount).fill('');
  titleRow[0] = title;
  const periodRow = new Array(colCount).fill('');
  periodRow[0] = periodLabel;

  const worksheet = XLSX.utils.aoa_to_sheet([
    titleRow,
    periodRow,
    [...headers],
    ...dataRows.map((row) => [...row]),
  ]);
  worksheet['!cols'] = colWidths.map((width) => ({ width }));

  worksheet['!merges'] = [
    { s: { r: R_TITLE, c: 0 }, e: { r: R_TITLE, c: lastCol } },
    { s: { r: R_PERIOD, c: 0 }, e: { r: R_PERIOD, c: lastCol } },
  ];

  const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell = (worksheet[ref] ?? (worksheet[ref] = { t: 's', v: '' })) as StyledCell;
    cell.s = { ...(cell.s ?? {}), ...style };
  };

  setStyle(R_TITLE, 0, { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } });
  setStyle(R_PERIOD, 0, {
    font: { bold: true, italic: true, sz: 12 },
    alignment: { horizontal: 'center' },
  });

  for (let c = 0; c <= lastCol; c++) {
    setStyle(R_HEADER, c, {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: HEADER_FILL,
      border: ALL_BORDERS,
    });
  }

  for (let i = 0; i < dataRows.length; i++) {
    const r = R_FIRST_DATA + i;
    for (const [col, fmt] of numericCols) {
      const ref = XLSX.utils.encode_cell({ r, c: col });
      const cell = worksheet[ref] as StyledCell | undefined;
      if (cell && cell.t === 'n') {
        cell.z = fmt;
        cell.s = { ...(cell.s ?? {}), alignment: { horizontal: 'right' } };
      }
    }
  }

  return worksheet;
}

export function writeAccountingWorkbook(
  worksheet: XLSX.WorkSheet,
  { sheetName, fileNamePrefix }: { sheetName: string; fileNamePrefix: string },
): void {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `${fileNamePrefix}_${yyyy}-${mm}-${dd}.xlsx`);
}
