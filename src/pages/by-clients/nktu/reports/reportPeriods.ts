const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;

export const WEEK_LENGTH = 6;

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function weekdayIndex(dateStr: string): number {
  return (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isoWeek1Monday(year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  return jan4;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ddmm(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface ResolvedWeek {
  periodKey: string;
  year: number;
  week: number;

  mondayStr: string;
  endStr: string;

  label: string;

  rangeText: string;
}

export function resolveIsoWeek(periodKey: string): ResolvedWeek {
  const m = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (!m) throw new Error(`Invalid week period key: ${periodKey}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  const monday = isoWeek1Monday(year);
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + WEEK_LENGTH - 1);
  return {
    periodKey,
    year,
    week,
    mondayStr: fmtDate(monday),
    endStr: fmtDate(end),
    label: `Tuần ${week} · ${year}`,
    rangeText: `${ddmm(monday)} – ${ddmm(end)}/${end.getUTCFullYear()}`,
  };
}

function isoWeekKeyOf(utcDate: Date): string {
  const monday = new Date(utcDate);
  monday.setUTCDate(utcDate.getUTCDate() - ((utcDate.getUTCDay() + 6) % 7));
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.round((monday.getTime() - isoWeek1Monday(year).getTime()) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function currentIsoWeekKey(now: number = Date.now()): string {
  const vn = new Date(now + VN_OFFSET_MS);
  return isoWeekKeyOf(new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate())));
}

export function recentWeekKeys(count: number, now: number = Date.now()): string[] {
  const monday = new Date(`${resolveIsoWeek(currentIsoWeekKey(now)).mondayStr}T00:00:00Z`);
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - i * 7);
    keys.push(isoWeekKeyOf(d));
  }
  return keys;
}

export interface ResolvedPeriod {
  periodKey: string;
  kind: 'week' | 'month';

  startStr: string;
  endStr: string;
  label: string;
  rangeText: string;

  buckets: { key: string; label: string }[];

  bucketOf: (dateStr: string) => number;
}

export function resolveWeekPeriod(periodKey: string): ResolvedPeriod {
  const w = resolveIsoWeek(periodKey);
  return {
    periodKey,
    kind: 'week',
    startStr: w.mondayStr,
    endStr: w.endStr,
    label: w.label,
    rangeText: w.rangeText,
    buckets: WEEKDAY_LABELS.map((l) => ({ key: l, label: l })),
    bucketOf: (dateStr) => {
      const i = weekdayIndex(dateStr);
      return i < WEEKDAY_LABELS.length ? i : -1;
    },
  };
}

export function resolveMonth(periodKey: string): ResolvedPeriod {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!m) throw new Error(`Invalid month period key: ${periodKey}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${periodKey}`);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const days = end.getUTCDate();
  return {
    periodKey,
    kind: 'month',
    startStr: fmtDate(start),
    endStr: fmtDate(end),
    label: `Tháng ${month} · ${year}`,
    rangeText: `${ddmm(start)} – ${ddmm(end)}/${year}`,
    buckets: Array.from({ length: days }, (_, i) => ({ key: String(i + 1), label: String(i + 1) })),
    bucketOf: (dateStr) => {
      const day = new Date(`${dateStr}T00:00:00Z`).getUTCDate();
      return day >= 1 && day <= days ? day - 1 : -1;
    },
  };
}

export function recentMonthKeys(count: number, now: number = Date.now()): string[] {
  const vn = new Date(now + VN_OFFSET_MS);
  let y = vn.getUTCFullYear();
  let mo = vn.getUTCMonth();
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    keys.push(`${y}-${String(mo + 1).padStart(2, '0')}`);
    mo -= 1;
    if (mo < 0) {
      mo = 11;
      y -= 1;
    }
  }
  return keys;
}
