import { addDays } from '@/utils/cropSchedule';
import type {
  CropDiaryEvent,
  CropDiaryRecord,
  CropProcessPlan,
  CropSheet,
  CropSheetExtra,
  SheetColumn,
  SheetDay,
  SheetDayValues,
  SheetStage,
  PlanPreparation,
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
    days: resizeSheetDays(plan.days, totalDays).map((d) => ({
      day: d.day,
      values: cleanValues(d.values, known),
    })),

    ...(plan.referencePlantCount &&
      plan.referencePlantCount > 0 && { referencePlantCount: plan.referencePlantCount }),
    ...(plan.referenceAdjustmentRate &&
      plan.referenceAdjustmentRate > 0 && {
        referenceAdjustmentRate: plan.referenceAdjustmentRate,
      }),
    ...(plan.preparation?.length && { preparation: cleanPreparation(plan.preparation) }),
  };
}

export function makeCropSheetExtra(
  plan: CropProcessPlan,
  opts?: { templateCode?: string },
): CropSheetExtra {
  const cleaned = cleanPlan(plan);
  return {
    plan: cleaned,
    days: cleaned.days.map((d) => ({ day: d.day, values: { ...d.values } })),
    ...(opts?.templateCode?.trim() && { templateCode: opts.templateCode.trim() }),
  };
}

export type SheetCropContext = {
  plantCount?: number;

  adjustmentRate?: number;
};

export function columnScale(
  column: SheetColumn,
  plan: CropProcessPlan,
  crop?: SheetCropContext,
): number | undefined {
  const count =
    typeof crop?.plantCount === 'number' && crop.plantCount > 0 ? crop.plantCount : undefined;

  if (column.kind === 'perPlant') return count;
  if (column.kind !== 'material') return undefined;

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

  dayTotal?: number;
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
  const working = new Map(extra.days.map((d) => [d.day, d.values]));
  const planned = new Map(plan.days.map((d) => [d.day, d.values]));
  const crop: SheetCropContext = {
    ...(opts?.plantCount !== undefined && { plantCount: opts.plantCount }),
    adjustmentRate: opts?.adjustmentRate ?? extra.adjustmentRate,
  };

  return Array.from({ length: plan.totalDays }, (_, i) => {
    const day = i + 1;
    const workingValues = working.get(day) ?? {};
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
        const raw = numericValue(value);
        return {
          column,
          ...(hasValue(value) && { value }),
          ...(hasValue(plannedValue) && { planned: plannedValue }),
          changed: !sameValue(value, plannedValue),
          ...(raw !== undefined && scale !== undefined && { dayTotal: raw * scale }),
        };
      }),
    };
  });
}

function sameValue(a: number | string | undefined, b: number | string | undefined): boolean {
  if (!hasValue(a) && !hasValue(b)) return true;
  if (!hasValue(a) || !hasValue(b)) return false;
  const na = numericValue(a);
  const nb = numericValue(b);
  if (na !== undefined && nb !== undefined) return na === nb;
  return String(a).trim() === String(b).trim();
}

export type SheetColumnTotal = {
  columnKey: string;
  kind: 'material' | 'perPlant';
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

  return extra.plan.columns
    .filter((c) => c.kind === 'material' || c.kind === 'perPlant')
    .map((column) => {
      let quantity = 0;
      let dayCount = 0;
      for (const day of extra.days) {
        const n = numericValue(day.values[column.key]);
        if (n === undefined || n === 0) continue;
        quantity += n;
        dayCount += 1;
      }
      const kind = column.kind as 'material' | 'perPlant';
      const scale = columnScale(column, extra.plan, crop);
      return {
        columnKey: column.key,
        kind,
        label: column.label,
        ...(column.unit && { unit: column.unit }),
        ...(column.materialCode && { materialCode: column.materialCode }),
        ...(column.group && { group: column.group }),
        quantity,
        ...(scale !== undefined && { total: quantity * scale }),
        dayCount,
      };
    })
    .filter((t) => t.dayCount > 0);
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
    if (line.kind !== 'material') {
      lines.push(line);
      continue;
    }
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
