import type {
  CropProcessPlan,
  PlanMemo,
  PlanPreparation,
  PrepActivityKind,
  SheetColumn,
  SheetColumnKind,
  SheetDay,
  SheetStage,
} from '@/types';

export type SheetGrid = (string | number)[][];

const DATE_CELL = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;

const DATE_HEADER = /ngày\s*thực\s*tế/i;

const DERIVED_HEADER = /nước\s*\/\s*cây/i;

const WATER_TOTAL_HEADER = /nước\s*\/\s*ngày/i;
const MEASURE_HEADER = /^\s*(ec|ph)\s*$/i;
const ACTIVITY_HEADER = /phun|chạy\s*gốc|thuốc/i;
const NOTE_HEADER = /ghi\s*chú|note/i;

const TOTALS_ROW = /^tổng/i;

const PREP_MATERIAL_CELL = /^vật\s*tư$/i;

function text(value: string | number | undefined): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value !== 'string') return '';
  const trimmed = value.normalize('NFC').trim();

  return trimmed === '-' ? '' : trimmed;
}

function cell(row: (string | number)[] | undefined, index: number): string {
  return text(row?.[index]);
}

export function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function parseSheetDate(raw: string): string | undefined {
  const m = DATE_CELL.exec(raw.trim());
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function findHeaderRow(grid: SheetGrid): { row: number; dateIndex: number } | undefined {
  for (let row = 0; row < grid.length; row++) {
    const dateIndex = (grid[row] ?? []).findIndex((c) => DATE_HEADER.test(text(c)));
    if (dateIndex > 0) return { row, dateIndex };
  }
  return undefined;
}

function readDataRow(
  row: (string | number)[],
  dateIndex: number,
): { day: number; date: string; at: number } | undefined {
  const at = row.findIndex((c) => DATE_CELL.test(text(c)));
  if (at >= 1) {
    const day = parseNumber(cell(row, at - 1));
    const date = parseSheetDate(cell(row, at));
    if (day !== undefined && date && day >= 1) return { day, date, at };
  }

  const day = parseNumber(cell(row, dateIndex - 1));
  if (day === undefined || day < 1 || !Number.isInteger(day)) return undefined;
  return { day, date: '', at: dateIndex };
}

function columnKindFor(label: string, values: string[], group?: string): SheetColumnKind {
  if (WATER_TOTAL_HEADER.test(label)) return 'ratio';

  if (MEASURE_HEADER.test(label) || NOTE_HEADER.test(label)) return 'text';

  if (ACTIVITY_HEADER.test(label)) return 'activity';

  const filled = values.filter(Boolean);

  if (!filled.length) return group ? 'ratio' : 'text';

  const numeric = filled.filter((v) => parseNumber(v) !== undefined).length;
  return numeric >= filled.length / 2 ? 'ratio' : 'text';
}

function columnKey(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `${slug}-${index}` : `col-${index}`;
}

export type ImportedEvent = {
  entryDate: string;
  activity: string;
  label?: string;

  kind?: PrepActivityKind;
};

export type CropSheetImport = {
  plan: CropProcessPlan;

  events: ImportedEvent[];

  startDate?: string;

  footerValues: number[];

  derivedColumns: string[];
};

export function parseCropSheetGrid(
  grid: SheetGrid,
  opts?: { resolveMaterialCode?: (label: string) => string | undefined },
): CropSheetImport | undefined {
  const header = findHeaderRow(grid);
  if (!header) return undefined;

  const headerRow = grid[header.row] ?? [];
  const groupRow = header.row > 0 ? (grid[header.row - 1] ?? []) : [];

  const firstDataIndex = header.dateIndex + 2;
  const labels: string[] = [];
  const groups: string[] = [];
  let lastGroup = '';
  for (let i = firstDataIndex; i < headerRow.length; i++) {
    labels.push(cell(headerRow, i));
    const g = cell(groupRow, i);
    if (g) lastGroup = g;
    groups.push(lastGroup);
  }

  const parsed: { day: number; date: string; values: string[]; stage: string }[] = [];
  const footerValues: number[] = [];
  for (let row = header.row + 1; row < grid.length; row++) {
    const current = grid[row] ?? [];
    if (current.some((c) => TOTALS_ROW.test(text(c)))) {
      for (const raw of current) {
        const n = parseNumber(text(raw));
        if (n !== undefined) footerValues.push(n);
      }
      continue;
    }
    const located = readDataRow(current, header.dateIndex);
    if (!located) continue;
    parsed.push({
      day: located.day,
      date: located.date,

      stage: located.at >= 2 ? cell(current, located.at - 2) : '',
      values: labels.map((_, i) => cell(current, located.at + 2 + i)),
    });
  }
  if (!parsed.length) return undefined;

  const events: ImportedEvent[] = [];
  for (let row = 0; row < header.row; row++) {
    const current = grid[row] ?? [];
    const at = current.findIndex((c) => DATE_CELL.test(text(c)));
    if (at < 0) continue;
    const entryDate = parseSheetDate(cell(current, at));
    if (!entryDate) continue;

    const texts = current.slice(at + 1).map((c) => text(c));

    const kind: PrepActivityKind | undefined = texts.some((t) => PREP_MATERIAL_CELL.test(t))
      ? 'material'
      : undefined;
    const activity = texts
      .filter((t) => !PREP_MATERIAL_CELL.test(t))
      .reduce((best, t) => (t.length > best.length ? t : best), '');
    if (!activity) continue;

    let label = '';
    for (let i = at - 1; i >= 0 && !label; i--) label = cell(current, i);
    events.push({ entryDate, activity, ...(label && { label }), ...(kind && { kind }) });
  }

  const derivedColumns: string[] = [];
  const columns: SheetColumn[] = [];
  const keptIndexes: number[] = [];
  labels.forEach((label, i) => {
    if (!label) return;
    if (DERIVED_HEADER.test(label)) {
      derivedColumns.push(label);
      return;
    }
    const values = parsed.map((p) => p.values[i] ?? '');
    const kind = columnKindFor(label, values, groups[i]);
    const materialCode = kind === 'ratio' ? opts?.resolveMaterialCode?.(label) : undefined;
    columns.push({
      key: columnKey(label, i),
      kind,
      label,
      ...(materialCode && { materialCode }),

      ...(kind === 'ratio' && groups[i] && { group: groups[i] }),
    });
    keptIndexes.push(i);
  });

  const totalDays = parsed.reduce((max, p) => Math.max(max, p.day), 0);
  const days: SheetDay[] = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    values: {},
  }));
  for (const p of parsed) {
    const target = days[p.day - 1];
    if (!target) continue;
    columns.forEach((column, ci) => {
      const raw = p.values[keptIndexes[ci]] ?? '';
      if (!raw) return;
      const n = column.kind === 'text' ? undefined : parseNumber(raw);
      target.values[column.key] = n ?? raw;
    });
  }

  const stages: SheetStage[] = [];
  for (const p of parsed) {
    const name = p.stage.replace(/\s+/g, ' ').trim();

    if (name && parseNumber(name) === undefined) {
      stages.push({ fromDay: p.day, toDay: totalDays, name });
    }
  }
  stages.forEach((s, i) => {
    const next = stages[i + 1];
    if (next) s.toDay = next.fromDay - 1;
  });

  const startDate = parsed.find((p) => p.day === 1)?.date;

  const preparation: PlanPreparation[] = startDate
    ? events.map((e) => ({
        dayOffset: Math.round(
          (Date.parse(`${e.entryDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
            86_400_000,
        ),
        activity: e.activity,
        ...(e.label && { label: e.label }),
        ...(e.kind && { kind: e.kind }),
      }))
    : [];
  const referencePlantCount = findPlantCount(grid);
  const referenceAdjustmentRate = findAdjustmentRate(grid);
  const target = findTarget(grid);
  const referenceSeedCount = findSeedCount(grid);
  const memos = findMemos(grid);

  return {
    plan: {
      columns,
      stages: stages.filter((s) => s.toDay >= s.fromDay),
      totalDays,
      days,
      ...(referencePlantCount && { referencePlantCount }),
      ...(referenceAdjustmentRate && { referenceAdjustmentRate }),
      ...(preparation.length && { preparation }),
      ...(target && { target }),
      ...(referenceSeedCount && { referenceSeedCount }),
      ...(memos.length && { memos }),
    },
    events,
    ...(startDate && { startDate }),
    footerValues,
    derivedColumns,
  };
}

function labelledCells(grid: SheetGrid, label: RegExp): string[] {
  const out: string[] = [];
  for (const row of grid) {
    const at = (row ?? []).findIndex((c) => label.test(text(c)));
    if (at < 0) continue;
    for (let i = at + 1; i < row.length; i++) {
      const value = cell(row, i);
      if (value) {
        out.push(value);
        break;
      }
    }
  }
  return out;
}

export function findTarget(grid: SheetGrid): string | undefined {
  return labelledCells(grid, /^\s*giống\s*$/i)[0];
}

export function findSeedCount(grid: SheetGrid): number | undefined {
  for (const value of labelledCells(grid, /^\s*hạt(\s*giống)?\s*$/i)) {
    const n = parseNumber(value);
    if (n !== undefined && n > 0) return n;
  }
  return undefined;
}

export function findMemos(grid: SheetGrid): PlanMemo[] {
  const out: PlanMemo[] = [];
  for (const row of grid) {
    const at = (row ?? []).findIndex((c) => /ghi\s*chú\s*chung/i.test(text(c)));
    if (at < 0) continue;
    const key = cell(row, at + 1);
    const value = cell(row, at + 2);
    if (value) out.push({ key, value });
    else if (key) out.push({ key: '', value: key });
  }
  return out;
}

export function findPlantCount(grid: SheetGrid): number | undefined {
  for (const row of grid) {
    const at = (row ?? []).findIndex((c) => /số\s*lượng\s*cây/i.test(text(c)));
    if (at < 0) continue;
    for (let i = at + 1; i < row.length; i++) {
      const n = parseNumber(cell(row, i));

      if (n !== undefined && n >= 100) return n;
    }
  }
  return undefined;
}

export function findAdjustmentRate(grid: SheetGrid): number | undefined {
  for (const row of grid) {
    const at = (row ?? []).findIndex((c) => /số\s*lượng\s*cây/i.test(text(c)));
    if (at < 0) continue;
    let seenCount = false;
    for (let i = at + 1; i < row.length; i++) {
      const n = parseNumber(cell(row, i));
      if (n === undefined) continue;
      if (!seenCount && n >= 100) {
        seenCount = true;
        continue;
      }
      if (seenCount && n > 0 && n <= 2) return n;
    }
  }
  return undefined;
}
