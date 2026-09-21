import type { Employee, OdometerLog } from '@/types';
import type { PhotoEntry } from '@/components/ImageUploadPanel';

export function visibleLogPhotos(photos: PhotoEntry[] | undefined): PhotoEntry[] {
  return (photos ?? []).filter((p) => !p.isDeleted);
}

export function isCompleteEntry(km: number | string, photos: PhotoEntry[] | undefined): boolean {
  const value = typeof km === 'string' ? Number(km) : km;
  return Number.isFinite(value) && value > 0 && visibleLogPhotos(photos).length > 0;
}

export const DRIVER_BACKDATE_DAYS = 1;

export function canWriteDate(
  date: string,
  today: string,
  { canEditAny = false }: { canEditAny?: boolean } = {},
): boolean {
  if (date > today) return false;
  if (canEditAny) return true;
  return date >= shiftDate(today, -DRIVER_BACKDATE_DAYS);
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const at = new Date(y, (m ?? 1) - 1, (d ?? 1) + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`;
}

export function daysDescending(from: string, to: string): string[] {
  const out: string[] = [];
  for (let day = to; day >= from; day = shiftDate(day, -1)) {
    out.push(day);
    if (out.length > 400) break; // a range no UI should be rendering anyway
  }
  return out;
}

export function liveLogs(logs: OdometerLog[]): OdometerLog[] {
  return logs.filter((log) => !log.extra?.isDeleted);
}

export function findEntry(
  logs: OdometerLog[],
  employeeId: string,
  date: string,
): OdometerLog | undefined {
  return liveLogs(logs).find(
    (log) => log.recordDate === date && log.extra?.employeeId === employeeId,
  );
}

export type ComplianceCell = {
  date: string;
  log?: OdometerLog;
};

export type ComplianceRow = {
  employeeId: string;
  employeeName: string;
  cells: ComplianceCell[];

  missingCount: number;
};

export function buildComplianceGrid({
  roster,
  logs,
  from,
  to,
}: {
  roster: Employee[];
  logs: OdometerLog[];
  from: string;
  to: string;
}): ComplianceRow[] {
  const days = daysDescending(from, to);
  const live = liveLogs(logs);

  const byEmployee = new Map<string, Map<string, OdometerLog>>();
  for (const log of live) {
    const id = String(log.extra?.employeeId ?? '');
    if (!id) continue;
    const days = byEmployee.get(id) ?? new Map<string, OdometerLog>();
    days.set(log.recordDate, log);
    byEmployee.set(id, days);
  }

  return roster.map((employee) => {
    const own = byEmployee.get(employee.id);
    const cells = days.map((date) => ({ date, log: own?.get(date) }));
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      cells,
      missingCount: cells.filter((cell) => !cell.log).length,
    };
  });
}

export function previousReading(logs: OdometerLog[], log: OdometerLog): OdometerLog | undefined {
  return liveLogs(logs)
    .filter((l) => l.extra?.employeeId === log.extra?.employeeId && l.recordDate < log.recordDate)
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))[0];
}

export function dayGap(from: string, to: string): number {
  const parse = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, day ?? 1).getTime();
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export function distanceSincePrevious(logs: OdometerLog[], log: OdometerLog): number | undefined {
  const previous = previousReading(logs, log);
  if (!previous) return undefined;
  return log.extra.km - previous.extra.km;
}
