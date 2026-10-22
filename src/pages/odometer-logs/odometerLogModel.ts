import type { Employee, OdometerLog, OdometerOtherCost } from '@/types';
import type { PhotoEntry } from '@/components/ImageUploadPanel';

export function visibleLogPhotos(photos: PhotoEntry[] | undefined): PhotoEntry[] {
  return (photos ?? []).filter((p) => !p.isDeleted);
}

export function canSaveEntry(
  km: number | string | undefined,
  photos: PhotoEntry[] | undefined,
): boolean {
  if (visibleLogPhotos(photos).length === 0) return false;
  if (km === undefined || km === '') return true;
  const value = typeof km === 'string' ? Number(km) : km;
  return Number.isFinite(value) && value > 0;
}

export function hasKm(log: OdometerLog | undefined): boolean {
  return readKm(log) !== undefined;
}

export const DRIVER_BACKDATE_DAYS = 1;

export function canWriteDate(
  date: string,
  today: string,
  { canEditAny = false, hasEntry = false }: { canEditAny?: boolean; hasEntry?: boolean } = {},
): boolean {
  if (date > today) return false;
  if (canEditAny || hasEntry) return true;
  return date >= shiftDate(today, -DRIVER_BACKDATE_DAYS);
}

export function isEdited(log: OdometerLog | undefined): boolean {
  const created = log?.createdAt;
  const updated = log?.updatedAt;
  return typeof created === 'number' && typeof updated === 'number' && updated > created;
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

export function readKm(log: OdometerLog | undefined): number | undefined {
  const raw: unknown = log?.extra?.km;
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readFuelCost(log: OdometerLog | undefined): number | undefined {
  const raw: unknown = log?.extra?.fuelCost;
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export const OTHER_COST_CONTENTS = [
  'Chành',
  'Vá Xe',
  'Sửa Xe',
  'Thay Nhớt',
  'Mua Hàng Cty',
  'Cp Khác',
] as const;

export const pickableContent = (content: string): string =>
  (OTHER_COST_CONTENTS as readonly string[]).includes(content) ? content : '';

export function readOtherCosts(log: OdometerLog | undefined): OdometerOtherCost[] {
  const raw: unknown = log?.extra?.otherCosts;
  if (!Array.isArray(raw)) return [];
  const lines: OdometerOtherCost[] = [];
  for (const line of raw as unknown[]) {
    if (!line || typeof line !== 'object') continue;
    const { amount, content } = line as Record<string, unknown>;
    const value = typeof amount === 'string' ? Number(amount) : amount;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
    lines.push({ amount: value, content: typeof content === 'string' ? content.trim() : '' });
  }
  return lines;
}

export function missingCostHalf(line: {
  amount: number | undefined;
  content: string;
}): 'amount' | 'content' | null {
  const hasAmount = line.amount !== undefined && line.amount > 0;
  const hasContent = line.content.trim() !== '';
  if (hasAmount && !hasContent) return 'content';
  if (hasContent && !hasAmount) return 'amount';
  return null;
}

export function otherCostsTotal(log: OdometerLog | undefined): number {
  return readOtherCosts(log).reduce((sum, line) => sum + line.amount, 0);
}

export function readEmployeeId(log: OdometerLog | undefined): string {
  const raw: unknown = log?.extra?.employeeId;
  return typeof raw === 'string' ? raw : '';
}

export function findEntry(
  logs: OdometerLog[],
  employeeId: string,
  date: string,
): OdometerLog | undefined {
  return liveLogs(logs).find(
    (log) => log.recordDate === date && readEmployeeId(log) === employeeId,
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

  spentTotal: number;
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
    const id = readEmployeeId(log);
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
      missingCount: cells.filter((cell) => !hasKm(cell.log)).length,
      spentTotal: cells.reduce(
        (sum, cell) => sum + (readFuelCost(cell.log) ?? 0) + otherCostsTotal(cell.log),
        0,
      ),
    };
  });
}

export function previousReading(logs: OdometerLog[], log: OdometerLog): OdometerLog | undefined {
  const owner = readEmployeeId(log);
  return liveLogs(logs)
    .filter(
      (l) =>
        readEmployeeId(l) === owner && l.recordDate < log.recordDate && readKm(l) !== undefined,
    )
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
  const km = readKm(log);
  const previousKm = readKm(previousReading(logs, log));
  if (km === undefined || previousKm === undefined) return undefined;
  return km - previousKm;
}
