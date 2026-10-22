import { addDays } from '@/utils/cropSchedule';
import type {
  CropDiaryEvent,
  CropDiaryRecord,
  CropProcessPlan,
  CropSheet,
  CropSheetExtra,
  MaterialLine,
  PlanMemo,
  PlanPreparation,
  SheetColumn,
  SheetDay,
  SheetDayValues,
  SheetStage,
} from '@/types';

export function isCropSheet(record: CropDiaryRecord): record is CropSheet {
  return (record as CropSheet).kind === 'sheet';
}

export function isCropDiaryEvent(record: CropDiaryRecord): record is CropDiaryEvent {
  return !isCropSheet(record);
}

export function numericValue(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function hasValue(value: number | string | undefined): boolean {
  return typeof value === 'number' ? Number.isFinite(value) : !!value?.trim();
}

export type SheetHeader = {
  target?: string;
  seedCount?: number;
  plantCount?: number;
  adjustmentRate?: number;
  memos: PlanMemo[];
};

export function sheetHeader(plan: CropProcessPlan, crop?: Partial<CropSheetExtra>): SheetHeader {
  return {
    ...((crop?.target ?? plan.target) && { target: crop?.target ?? plan.target }),
    ...((crop?.seedCount ?? plan.referenceSeedCount) !== undefined && {
      seedCount: crop?.seedCount ?? plan.referenceSeedCount,
    }),
    ...((crop?.plantCount ?? plan.referencePlantCount) !== undefined && {
      plantCount: crop?.plantCount ?? plan.referencePlantCount,
    }),
    ...((crop?.adjustmentRate ?? plan.referenceAdjustmentRate) !== undefined && {
      adjustmentRate: crop?.adjustmentRate ?? plan.referenceAdjustmentRate,
    }),

    memos: crop?.memos ?? plan.memos ?? [],
  };
}

export function weekdayLabel(isoDate: string): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ms)) return '';
  const dow = new Date(ms).getUTCDay();
  return dow === 0 ? 'Chủ nhật' : `Thứ ${dow + 1}`;
}

export function sheetCellValue(raw: string): number | string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && String(n) === cleaned ? n : raw;
}

export function makeEmptySheetDay(day: number): SheetDay {
  return { day, values: {} };
}

export function resizeSheetDays(days: SheetDay[], total: number): SheetDay[] {
  const n = Math.max(0, Math.floor(total));
  const byDay = new Map(days.map((d) => [d.day, d]));
  return Array.from({ length: n }, (_, i) => {
    const existing = byDay.get(i + 1);
    return existing ? { ...existing, day: i + 1 } : makeEmptySheetDay(i + 1);
  });
}

function cleanValues(values: SheetDayValues, knownKeys?: Set<string>): SheetDayValues {
  const out: SheetDayValues = {};
  for (const key of Object.keys(values)) {
    if (knownKeys && !knownKeys.has(key)) continue;
    const value = values[key];
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = value;
      continue;
    }
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export function cleanMaterialLines(lines: MaterialLine[]): MaterialLine[] {
  return lines
    .filter((m) => m.materialCode.trim())
    .map((m) => ({
      materialCode: m.materialCode.trim(),
      ...(typeof m.quantity === 'number' &&
        Number.isFinite(m.quantity) && { quantity: m.quantity }),
      ...(m.unit?.trim() && { unit: m.unit.trim() }),
    }));
}

function cleanDay(day: SheetDay, knownKeys?: Set<string>): SheetDay {
  const materials: Record<string, MaterialLine[]> = {};
  for (const key of Object.keys(day.materials ?? {})) {
    if (knownKeys && !knownKeys.has(key)) continue;
    const lines = cleanMaterialLines(day.materials?.[key] ?? []);
    if (lines.length) materials[key] = lines;
  }
  return {
    day: day.day,
    values: cleanValues(day.values, knownKeys),
    ...(Object.keys(materials).length > 0 && { materials }),
  };
}

export function stageOf(day: number, stages: SheetStage[]): SheetStage | undefined {
  return stages.find((s) => day >= s.fromDay && day <= s.toDay);
}

export function cleanStages(stages: SheetStage[], totalDays: number): SheetStage[] {
  return stages
    .map((s) => ({
      name: s.name.trim(),
      fromDay: Math.max(1, Math.floor(s.fromDay)),
      toDay: Math.min(Math.floor(totalDays), Math.floor(s.toDay)),
    }))
    .filter((s) => s.name && s.toDay >= s.fromDay)
    .sort((a, b) => a.fromDay - b.fromDay);
}

export function cleanColumns(columns: SheetColumn[]): SheetColumn[] {
  const seen = new Set<string>();
  const out: SheetColumn[] = [];
  for (const c of columns) {
    const key = c.key?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      kind: c.kind,
      label: c.label?.trim() || key,
      ...(c.materialCode?.trim() && { materialCode: c.materialCode.trim() }),
      ...(c.unit?.trim() && { unit: c.unit.trim() }),
      ...(c.group?.trim() && { group: c.group.trim() }),
    });
  }
  return out;
}

export function cleanPreparation(preparation: PlanPreparation[]): PlanPreparation[] {
  return preparation
    .map((p) => ({
      dayOffset: Math.trunc(p.dayOffset),
      activity: p.activity.trim(),
      ...(p.label?.trim() && { label: p.label.trim() }),

      ...(p.kind === 'material' && { kind: p.kind }),
    }))
    .filter((p) => p.activity)
    .sort((a, b) => a.dayOffset - b.dayOffset);
}

export function cleanPlan(plan: CropProcessPlan): CropProcessPlan {
  const totalDays = Math.max(0, Math.floor(plan.totalDays));
  const columns = cleanColumns(plan.columns);
  const known = new Set(columns.map((c) => c.key));
  return {
    columns,
    stages: cleanStages(plan.stages, totalDays),
    totalDays,
    days: resizeSheetDays(plan.days, totalDays).map((d) => cleanDay(d, known)),

    ...(plan.referencePlantCount &&
      plan.referencePlantCount > 0 && { referencePlantCount: plan.referencePlantCount }),
    ...(plan.referenceAdjustmentRate &&
      plan.referenceAdjustmentRate > 0 && {
        referenceAdjustmentRate: plan.referenceAdjustmentRate,
      }),
    ...(plan.preparation?.length && { preparation: cleanPreparation(plan.preparation) }),

    ...(plan.target?.trim() && { target: plan.target.trim() }),
    ...(plan.referenceSeedCount &&
      plan.referenceSeedCount > 0 && { referenceSeedCount: plan.referenceSeedCount }),
    ...(plan.memos?.some((m) => m.key.trim() || m.value.trim()) && {
      memos: plan.memos
        .map((m) => ({ key: m.key.trim(), value: m.value.trim() }))
        .filter((m) => m.key || m.value),
    }),
  };
}

export function makeCropSheetExtra(
  plan: CropProcessPlan,
  opts?: { templateCode?: string },
): CropSheetExtra {
  const cleaned = cleanPlan(plan);
  return {
    plan: cleaned,
    days: cleaned.days.map((d) => ({
      day: d.day,
      values: { ...d.values },

      ...(d.materials && { materials: { ...d.materials } }),
    })),
    ...(opts?.templateCode?.trim() && { templateCode: opts.templateCode.trim() }),
  };
}

export type SheetCropContext = {
  plantCount?: number;

  adjustmentRate?: number;
};

export function columnMaterialCode(
  column: SheetColumn,
  extra?: Pick<CropSheetExtra, 'columnMaterials'>,
): string | undefined {
  const chosen = extra?.columnMaterials?.[column.key]?.materialCode?.trim();
  return chosen || column.materialCode;
}

export function columnUnit(
  column: SheetColumn,
  extra?: Pick<CropSheetExtra, 'columnMaterials'>,
): string | undefined {
  const chosen = extra?.columnMaterials?.[column.key]?.unit?.trim();
  return chosen || column.unit;
}

export function columnScale(
  column: SheetColumn,
  plan: CropProcessPlan,
  crop?: SheetCropContext,
): number | undefined {
  if (column.kind !== 'ratio') return undefined;
  const count =
    typeof crop?.plantCount === 'number' && crop.plantCount > 0 ? crop.plantCount : undefined;

  const referenceRate = positive(plan.referenceAdjustmentRate) ?? 1;
  const rate = positive(crop?.adjustmentRate) ?? referenceRate;
  const intensity = rate / referenceRate;

  const referenceCount = plan.referencePlantCount;
  if (!referenceCount || referenceCount <= 0) return intensity;
  return count === undefined ? undefined : (count / referenceCount) * intensity;
}

function positive(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export type SheetCell = {
  column: SheetColumn;

  value?: number | string;

  planned?: number | string;

  changed: boolean;

  scale?: number;

  materials?: MaterialLine[];
};

export type SheetRow = {
  day: number;

  date?: string;
  stage?: string;
  cells: SheetCell[];
};

export function sheetRows(
  extra: CropSheetExtra,
  opts?: { startDate?: string } & SheetCropContext,
): SheetRow[] {
  const { plan } = extra;
  const working = new Map(extra.days.map((d) => [d.day, d]));
  const planned = new Map(plan.days.map((d) => [d.day, d.values]));
  const crop: SheetCropContext = {
    ...(opts?.plantCount !== undefined && { plantCount: opts.plantCount }),
    adjustmentRate: opts?.adjustmentRate ?? extra.adjustmentRate,
  };

  return Array.from({ length: plan.totalDays }, (_, i) => {
    const day = i + 1;
    const workingValues = working.get(day)?.values ?? {};
    const plannedValues = planned.get(day) ?? {};
    const stage = stageOf(day, plan.stages);
    const date = opts?.startDate ? (addDays(opts.startDate, day - 1) ?? undefined) : undefined;

    return {
      day,
      ...(date && { date }),
      ...(stage && { stage: stage.name }),
      cells: plan.columns.map((column) => {
        const value = workingValues[column.key];
        const plannedValue = plannedValues[column.key];
        const scale = columnScale(column, plan, crop);
        const materials =
          column.kind === 'activity' ? working.get(day)?.materials?.[column.key] : undefined;
        return {
          column,
          ...(hasValue(value) && { value }),
          ...(hasValue(plannedValue) && { planned: plannedValue }),
          changed: !sameValue(value, plannedValue),
          ...(scale !== undefined && { scale }),
          ...(materials?.length && { materials }),
        };
      }),
    };
  });
}

export function sheetStageSpans(rows: readonly Pick<SheetRow, 'stage'>[]): number[] {
  return runSpans(rows, (r) => r.stage);
}

export function sheetColumnGroupSpans(columns: readonly Pick<SheetColumn, 'group'>[]): number[] {
  return runSpans(columns, (c) => c.group);
}

export function sheetHasGroups(columns: readonly Pick<SheetColumn, 'group'>[]): boolean {
  return columns.some((c) => c.group);
}

function runSpans<T>(items: readonly T[], keyOf: (item: T) => string | undefined): number[] {
  const spans = items.map(() => 0);
  let start = 0;
  for (let i = 1; i <= items.length; i++) {
    if (i === items.length || keyOf(items[i]!) !== keyOf(items[start]!)) {
      spans[start] = i - start;
      start = i;
    }
  }
  return spans;
}

function sameValue(a: number | string | undefined, b: number | string | undefined): boolean {
  if (!hasValue(a) && !hasValue(b)) return true;
  if (!hasValue(a) || !hasValue(b)) return false;
  const na = numericValue(a);
  const nb = numericValue(b);
  if (na !== undefined && nb !== undefined) return na === nb;
  return String(a).trim() === String(b).trim();
}

function tidy(value: number): number {
  return Number(value.toPrecision(12));
}

export function cellInputText(cell: Pick<SheetCell, 'column' | 'value' | 'scale'>): string {
  if (cell.column.kind !== 'ratio' || !cell.scale || typeof cell.value !== 'number') {
    return String(cell.value ?? '');
  }
  return String(tidy(cell.value * cell.scale));
}

export function cellInputToStored(text: string, cell: Pick<SheetCell, 'column' | 'scale'>): string {
  if (cell.column.kind !== 'ratio' || !cell.scale) return text;
  const cleaned = text.trim().replace(/,/g, '');
  const n = Number(cleaned);
  if (!cleaned || !Number.isFinite(n) || String(n) !== cleaned) return text;
  return String(tidy(n / cell.scale));
}

export type SheetDayLine = {
  column: SheetColumn;

  scale?: number;

  unit?: string;

  value?: number | string;

  planned?: number | string;
  changed: boolean;

  materials?: MaterialLine[];
};

export type SheetDayGroup = {
  name?: string;
  lines: SheetDayLine[];
};

export type SheetDayView = {
  day: number;
  totalDays: number;
  date?: string;

  weekday?: string;
  stage?: string;

  doses: SheetDayGroup[];

  activities: SheetDayLine[];

  notes: SheetDayLine[];

  changed: boolean;

  empty: boolean;
};

export function sheetDayView(
  row: SheetRow,
  totalDays: number,
  extra?: Pick<CropSheetExtra, 'columnMaterials'>,
): SheetDayView {
  const doses: SheetDayGroup[] = [];
  const activities: SheetDayLine[] = [];
  const notes: SheetDayLine[] = [];

  for (const cell of row.cells) {
    const unit = columnUnit(cell.column, extra);
    const line: SheetDayLine = {
      column: cell.column,
      ...(cell.scale !== undefined && { scale: cell.scale }),
      ...(unit && { unit }),
      ...(cell.value !== undefined && { value: cell.value }),
      ...(cell.planned !== undefined && { planned: cell.planned }),
      changed: cell.changed,
      ...(cell.materials?.length && { materials: cell.materials }),
    };
    if (cell.column.kind === 'ratio') {
      const name = cell.column.group;
      const group = doses.find((g) => g.name === name);
      if (group) group.lines.push(line);
      else doses.push({ ...(name && { name }), lines: [line] });
    } else if (cell.column.kind === 'activity') {
      activities.push(line);
    } else {
      notes.push(line);
    }
  }

  return {
    day: row.day,
    totalDays,
    ...(row.date && { date: row.date, weekday: weekdayLabel(row.date) }),
    ...(row.stage && { stage: row.stage }),
    doses,
    activities,
    notes,
    changed: row.cells.some((c) => c.changed),

    empty: !row.cells.some((c) => hasValue(c.value) || c.materials?.length),
  };
}

export type SheetColumnTotal = {
  columnKey: string;
  kind: 'ratio' | 'activity';
  label: string;
  unit?: string;

  materialCode?: string;

  group?: string;

  quantity: number;

  total?: number;

  dayCount: number;
};

export function seasonTotals(extra: CropSheetExtra, opts?: SheetCropContext): SheetColumnTotal[] {
  const crop: SheetCropContext = {
    ...(opts?.plantCount !== undefined && { plantCount: opts.plantCount }),
    adjustmentRate: opts?.adjustmentRate ?? extra.adjustmentRate,
  };

  const out: SheetColumnTotal[] = [];
  for (const column of extra.plan.columns) {
    if (column.kind === 'ratio') {
      let quantity = 0;
      let dayCount = 0;
      for (const day of extra.days) {
        const n = numericValue(day.values[column.key]);
        if (n === undefined || n === 0) continue;
        quantity += n;
        dayCount += 1;
      }
      if (!dayCount) continue;
      const scale = columnScale(column, extra.plan, crop);

      const materialCode = columnMaterialCode(column, extra);
      const unit = columnUnit(column, extra);
      out.push({
        columnKey: column.key,
        kind: 'ratio',
        label: column.label,
        ...(unit && { unit }),
        ...(materialCode && { materialCode }),
        ...(column.group && { group: column.group }),
        quantity,
        ...(scale !== undefined && { total: quantity * scale }),
        dayCount,
      });
      continue;
    }

    if (column.kind === 'activity') {
      const buckets = new Map<string, { unit?: string; quantity: number; dayCount: number }>();
      for (const day of extra.days) {
        for (const line of day.materials?.[column.key] ?? []) {
          if (!line.materialCode.trim()) continue;
          const id = `${line.materialCode}\u0000${line.unit ?? ''}`;
          const bucket = buckets.get(id) ?? {
            ...(line.unit && { unit: line.unit }),
            quantity: 0,
            dayCount: 0,
          };
          bucket.quantity += line.quantity ?? 0;
          bucket.dayCount += 1;
          buckets.set(id, bucket);
        }
      }
      for (const [id, bucket] of buckets) {
        const materialCode = id.split('\u0000')[0]!;
        out.push({
          columnKey: column.key,
          kind: 'activity',
          label: column.label,
          ...(bucket.unit && { unit: bucket.unit }),
          materialCode,
          ...(column.group && { group: column.group }),
          quantity: bucket.quantity,
          total: bucket.quantity,
          dayCount: bucket.dayCount,
        });
      }
    }
  }
  return out;
}

export type SheetCellChange = {
  day: number;
  columnKey: string;
  planned?: number | string;
  value?: number | string;
};

export function diffFromPlan(extra: CropSheetExtra): SheetCellChange[] {
  const planned = new Map(extra.plan.days.map((d) => [d.day, d.values]));
  const out: SheetCellChange[] = [];

  for (const day of extra.days) {
    const plannedValues = planned.get(day.day) ?? {};
    for (const column of extra.plan.columns) {
      const value = day.values[column.key];
      const plannedValue = plannedValues[column.key];
      if (sameValue(value, plannedValue)) continue;
      out.push({
        day: day.day,
        columnKey: column.key,
        ...(hasValue(plannedValue) && { planned: plannedValue }),
        ...(hasValue(value) && { value }),
      });
    }
  }
  return out;
}

export function resetDayToPlan(extra: CropSheetExtra, day: number): SheetDay[] {
  const plannedValues = extra.plan.days.find((d) => d.day === day)?.values ?? {};
  return extra.days.map((d) => (d.day === day ? { day, values: { ...plannedValues } } : d));
}

export type SheetCostLine = SheetColumnTotal & {
  cost?: number;
};

export type SheetCost = {
  lines: SheetCostLine[];

  total: number;

  unpriced: string[];
};

export function sheetCost(
  totals: SheetColumnTotal[],
  priceOf: (materialCode: string) => number | undefined,
): SheetCost {
  const lines: SheetCostLine[] = [];
  const unpriced: string[] = [];
  let total = 0;

  for (const line of totals) {
    const quantity = line.total ?? line.quantity;
    const price = line.materialCode ? priceOf(line.materialCode) : undefined;
    if (price === undefined || !quantity) {
      if (quantity) unpriced.push(line.label);
      lines.push(line);
      continue;
    }
    const cost = quantity * price;
    total += cost;
    lines.push({ ...line, cost });
  }

  return { lines, total, unpriced };
}
