const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const VN_OFFSET_MS = 7 * 3_600_000;

export function dayOfUtc7(value: string | number | Date): string | undefined {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return undefined;
  return new Date(t + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function anchorDayOf(
  businessDate: string | undefined,
  createdAt: string | number | Date,
): string | undefined {
  if (businessDate && DAY_RE.test(businessDate)) return businessDate;
  return dayOfUtc7(createdAt);
}

export type DayRange = { from: string; to: string };

export function inDayRange(day: string | undefined, range: DayRange | undefined): boolean {
  if (!range) return true;
  return day !== undefined && day >= range.from && day <= range.to;
}
