import * as XLSX from 'xlsx';
import { ExcelParseError } from './excelParser';
import { parseCropSheetGrid, type CropSheetImport, type SheetGrid } from './cropSheetImport';
import {
  columnScale,
  numericValue,
  sheetHeader,
  weekdayLabel,
  type SheetCropContext,
} from './cropSheetModel';
import { addDays } from './cropSchedule';
import type { TFunction } from 'i18next';
import type { CropProcessPlan, CropSheetExtra } from '@/types';

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

export function cropSheetExportLabels(t: TFunction): CropSheetExportLabels {
  return {
    stage: t('cropDiaryTemplates.plan.stage'),
    day: t('cropDiaryTemplates.plan.day'),
    date: 'Ngày thực tế',
    weekday: 'Thứ',
    totals: 'TỔNG PHÂN',
    sheetName: t('cropDiaryTemplates.excel.sheetName'),
  };
}

const META = {
  target: 'Giống',
  seeds: 'Hạt',
  plants: 'Số lượng cây',
  memo: 'Ghi chú chung',

  prepMaterial: 'Vật tư',
} as const;

function sheetDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

export function buildCropSheetRows(
  plan: CropProcessPlan,
  labels: CropSheetExportLabels,
  opts?: SheetCropContext & {
    startDate?: string;
    dayDate?: (day: number) => string | undefined;

    crop?: Partial<CropSheetExtra>;
  },
): (string | number)[][] {
  const header = [
    labels.stage,
    labels.day,
    labels.date,
    labels.weekday,
    ...plan.columns.map((c) => c.label),
  ];
  const groups = plan.columns.map((c) => c.group ?? '');

  const meta = sheetHeader(plan, opts?.crop);

  const rows: (string | number)[][] = meta.memos.map((memo) => [META.memo, memo.key, memo.value]);
  if (meta.target) rows.push([META.target, meta.target]);
  if (meta.seedCount !== undefined) rows.push([META.seeds, meta.seedCount]);
  if (meta.plantCount !== undefined) {
    rows.push([
      META.plants,
      meta.plantCount,
      ...(meta.adjustmentRate ? [meta.adjustmentRate] : []),
    ]);
  }

  for (const job of plan.preparation ?? []) {
    const date =
      (opts?.startDate ? addDays(opts.startDate, job.dayOffset) : undefined) ?? undefined;
    rows.push([
      job.label ?? '',

      date ? sheetDate(date) : job.dayOffset,
      date ? weekdayLabel(date) : '',
      job.activity,
      ...(job.kind === 'material' ? [META.prepMaterial] : []),
    ]);
  }

  if (groups.some(Boolean)) rows.push(['', '', '', '', ...groups]);
  rows.push(header);

  const stageStart = new Map(plan.stages.map((s) => [s.fromDay, s.name]));
  const totals = plan.columns.map(() => 0);

  for (const day of plan.days) {
    const cells = plan.columns.map((column, i) => {
      const raw = day.values[column.key];
      const n = numericValue(raw);
      if (n === undefined) return raw === undefined ? '' : String(raw);

      const value = column.kind === 'ratio' ? n * (columnScale(column, plan, opts) ?? 1) : n;
      if (column.kind === 'ratio') totals[i] += value;
      return value;
    });

    const date = opts?.dayDate?.(day.day) ?? '';
    rows.push([
      stageStart.get(day.day) ?? '',
      day.day,
      date ? sheetDate(date) : '',
      date ? weekdayLabel(date) : '',
      ...cells,
    ]);
  }

  rows.push([
    labels.totals,
    '',
    '',
    '',
    ...plan.columns.map((column, i) =>
      column.kind === 'ratio' ? Number(totals[i].toFixed(3)) : '',
    ),
  ]);
  return rows;
}

export function exportCropSheet(
  plan: CropProcessPlan,
  labels: CropSheetExportLabels,
  filename: string,
  opts?: SheetCropContext & {
    startDate?: string;
    dayDate?: (day: number) => string | undefined;
    crop?: Partial<CropSheetExtra>;
  },
): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(buildCropSheetRows(plan, labels, opts));
  XLSX.utils.book_append_sheet(workbook, sheet, labels.sheetName);
  XLSX.writeFile(workbook, filename);
}
