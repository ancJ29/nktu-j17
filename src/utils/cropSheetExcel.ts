import * as XLSX from 'xlsx';
import { ExcelParseError } from './excelParser';
import { parseCropSheetGrid, type CropSheetImport, type SheetGrid } from './cropSheetImport';
import { columnScale, numericValue, type SheetCropContext } from './cropSheetModel';
import type { CropProcessPlan } from '@/types';

export function workbookToGrid(workbook: XLSX.WorkBook): SheetGrid {
  const name = workbook.SheetNames[0];
  const sheet = name ? workbook.Sheets[name] : undefined;
  if (!sheet) throw new Error('Workbook has no readable first sheet');
  return XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: true,
  });
}

export async function parseCropSheetFile(
  file: File,
  opts?: { resolveMaterialCode?: (label: string) => string | undefined },
): Promise<CropSheetImport> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const parsed = parseCropSheetGrid(workbookToGrid(workbook), opts);

  if (!parsed) throw new ExcelParseError(['Ngày thực tế']);
  return parsed;
}

export type CropSheetExportLabels = {
  stage: string;
  day: string;
  date: string;
  weekday: string;
  totals: string;
  sheetName: string;
};

export function buildCropSheetRows(
  plan: CropProcessPlan,
  labels: CropSheetExportLabels,
  opts?: SheetCropContext & { startDate?: string; dayDate?: (day: number) => string | undefined },
): (string | number)[][] {
  const header = [
    labels.stage,
    labels.day,
    labels.date,
    labels.weekday,
    ...plan.columns.map((c) => c.label),
  ];
  const groups = plan.columns.map((c) => c.group ?? '');
  const rows: (string | number)[][] = groups.some(Boolean)
    ? [['', '', '', '', ...groups], header]
    : [header];

  const stageStart = new Map(plan.stages.map((s) => [s.fromDay, s.name]));
  const totals = plan.columns.map(() => 0);

  for (const day of plan.days) {
    const cells = plan.columns.map((column, i) => {
      const raw = day.values[column.key];
      const n = numericValue(raw);
      if (n === undefined) return raw === undefined ? '' : String(raw);

      const value = column.kind === 'material' ? n * (columnScale(column, plan, opts) ?? 1) : n;
      if (column.kind === 'material' || column.kind === 'perPlant') totals[i] += value;
      return value;
    });
    rows.push([
      stageStart.get(day.day) ?? '',
      day.day,
      opts?.dayDate?.(day.day) ?? '',
      '',
      ...cells,
    ]);
  }

  rows.push([
    labels.totals,
    '',
    '',
    '',
    ...plan.columns.map((column, i) =>
      column.kind === 'material' || column.kind === 'perPlant' ? Number(totals[i].toFixed(3)) : '',
    ),
  ]);
  return rows;
}

export function exportCropSheet(
  plan: CropProcessPlan,
  labels: CropSheetExportLabels,
  filename: string,
  opts?: SheetCropContext & { dayDate?: (day: number) => string | undefined },
): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(buildCropSheetRows(plan, labels, opts));
  XLSX.utils.book_append_sheet(workbook, sheet, labels.sheetName);
  XLSX.writeFile(workbook, filename);
}
