import type { MaintenanceItem, MaintenanceLogExtra } from '@/types';

export function readMaintenanceItems(e: MaintenanceLogExtra | undefined): MaintenanceItem[] {
  if (e?.items?.length) return e.items;
  const legacyName = e?.item?.trim();
  const legacyPrice = e?.totalAmount ?? e?.unitPrice;
  if (!legacyName && legacyPrice == null) return [];
  return [{ name: legacyName ?? '', unitPrice: legacyPrice ?? 0 }];
}

export function maintenanceItemsTotal(items: MaintenanceItem[]): number {
  return items.reduce((sum, it) => sum + (Number(it.unitPrice) || 0), 0);
}

export function warrantyExpiry(
  logDate: string,
  warrantyMonths: number | undefined,
): string | undefined {
  if (!warrantyMonths || warrantyMonths <= 0) return undefined;
  const [y, m, d] = logDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const target = m - 1 + warrantyMonths;
  const endYear = y + Math.floor(target / 12);
  const endMonth = target % 12;
  const lastDay = new Date(Date.UTC(endYear, endMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function warrantySummary(
  items: MaintenanceItem[],
  monthsLabel: (months: number) => string,
): string {
  return items
    .filter((it) => (it.warrantyMonths ?? 0) > 0)
    .map((it) => `${it.name || '—'}: ${monthsLabel(it.warrantyMonths as number)}`)
    .join(', ');
}
