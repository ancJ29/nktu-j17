import type {
  CropDiaryTemplate,
  CropDiaryTemplateStep,
  TemplateDay,
  TemplateMaterialLine,
} from '@/types';

export function makeEmptyDay(day: number): TemplateDay {
  return { day, activity: '', materials: [], memo: '' };
}

export function templateDayCount(tpl: Pick<CropDiaryTemplate, 'steps' | 'extra'>): number {
  return tpl.extra?.totalDates ?? tpl.extra?.days?.length ?? tpl.steps.length;
}

export function templatePlanDays(tpl: Pick<CropDiaryTemplate, 'steps' | 'extra'>): TemplateDay[] {
  if (tpl.extra?.days?.length) return tpl.extra.days;
  return tpl.steps.map((s, i) => ({
    day: i + 1,
    activity: s.activity,
    materials: [],
    ...(s.defaultNotes && { memo: s.defaultNotes }),
  }));
}

export function resizeDays(days: TemplateDay[], total: number): TemplateDay[] {
  const n = Math.max(0, Math.floor(total));
  const out: TemplateDay[] = [];
  for (let i = 0; i < n; i++) {
    out.push(days[i] ? { ...days[i], day: i + 1 } : makeEmptyDay(i + 1));
  }
  return out;
}

function cleanMaterials(materials: TemplateMaterialLine[]): TemplateMaterialLine[] {
  return materials
    .filter((m) => m.materialCode)
    .map((m) => ({
      materialCode: m.materialCode,
      ...(typeof m.quantity === 'number' && m.quantity > 0 && { quantity: m.quantity }),
      ...(m.unit && { unit: m.unit }),
    }));
}

export function cleanDays(days: TemplateDay[]): TemplateDay[] {
  return days.map((d) => ({
    day: d.day,
    activity: d.activity.trim(),
    materials: cleanMaterials(d.materials),
    ...(d.memo?.trim() && { memo: d.memo.trim() }),
  }));
}

export function dayHasContent(d: TemplateDay): boolean {
  return !!(d.activity.trim() || d.memo?.trim() || d.materials.some((m) => m.materialCode));
}

export function deriveSteps(days: TemplateDay[]): CropDiaryTemplateStep[] {
  return days
    .filter((d) => d.activity.trim())
    .sort((a, b) => a.day - b.day)
    .map((d) => ({
      activity: d.activity.trim(),
      ...(d.memo?.trim() && { defaultNotes: d.memo.trim() }),
    }));
}

export type TemplateExcelRow = {
  day: number;
  activity: string;
  materialName: string;
  quantity?: number;
  unit: string;
  memo: string;
};

export function rowsToDays(
  rows: TemplateExcelRow[],
  resolveMaterialCode: (name: string) => string | null,
): { days: TemplateDay[]; unknownMaterials: string[] } {
  const valid = rows.filter((r) => Number.isFinite(r.day) && r.day >= 1);
  const maxDay = valid.reduce((m, r) => Math.max(m, Math.floor(r.day)), 0);
  const days: TemplateDay[] = Array.from({ length: maxDay }, (_, i) => makeEmptyDay(i + 1));
  const unknown = new Set<string>();

  for (const r of valid) {
    const d = days[Math.floor(r.day) - 1];
    if (r.activity.trim() && !d.activity) d.activity = r.activity.trim();
    if (r.memo.trim() && !d.memo) d.memo = r.memo.trim();
    const name = r.materialName.trim();
    if (name) {
      const code = resolveMaterialCode(name);
      if (!code) {
        unknown.add(name);
        continue;
      }
      d.materials.push({
        materialCode: code,
        ...(typeof r.quantity === 'number' && r.quantity > 0 && { quantity: r.quantity }),
        ...(r.unit.trim() && { unit: r.unit.trim() }),
      });
    }
  }

  return { days, unknownMaterials: [...unknown] };
}

export function daysToRows(
  days: TemplateDay[],
  resolveMaterialName: (code: string) => string,
): TemplateExcelRow[] {
  const out: TemplateExcelRow[] = [];
  for (const d of days) {
    if (d.materials.length === 0) {
      out.push({
        day: d.day,
        activity: d.activity,
        materialName: '',
        unit: '',
        memo: d.memo ?? '',
      });
      continue;
    }
    d.materials.forEach((m, i) => {
      out.push({
        day: d.day,
        activity: i === 0 ? d.activity : '',
        materialName: resolveMaterialName(m.materialCode),
        ...(typeof m.quantity === 'number' && { quantity: m.quantity }),
        unit: m.unit ?? '',
        memo: i === 0 ? (d.memo ?? '') : '',
      });
    });
  }
  return out;
}

export function addDaysToDateString(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export type DiaryEntryDraft = {
  entryDate: string;
  activity: string;
  memo?: string;
  materials: TemplateMaterialLine[];
};

export function buildTemplateDiaryEntries(
  days: TemplateDay[],
  startDate: string,
): DiaryEntryDraft[] {
  return days
    .filter((d) => d.activity.trim())
    .slice()
    .sort((a, b) => a.day - b.day)
    .map((d) => ({
      entryDate: addDaysToDateString(startDate, d.day - 1),
      activity: d.activity.trim(),
      ...(d.memo?.trim() && { memo: d.memo.trim() }),
      materials: d.materials.filter((m) => m.materialCode),
    }));
}
