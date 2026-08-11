import type { MaintenanceItem, MaintenanceLogExtra } from '@/types';

export function readMaintenanceItems(e: MaintenanceLogExtra | undefined): MaintenanceItem[] {
  if (e?.items?.length) return e.items;
  const legacyName = e?.item?.trim();
  const legacyPrice = e?.totalAmount ?? e?.unitPrice;
  if (!legacyName && legacyPrice == null) return [];

  return [{ name: legacyName ?? '', unitPrice: legacyPrice ?? 0 }];
}

export function itemQuantity(item: Pick<MaintenanceItem, 'quantity'>): number {
  const value = Number(item.quantity);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function maintenanceLineTotal(item: MaintenanceItem): number {
  return (Number(item.unitPrice) || 0) * itemQuantity(item);
}

export function maintenanceItemsTotal(items: MaintenanceItem[]): number {
  return items.reduce((sum, it) => sum + maintenanceLineTotal(it), 0);
}

export function maintenanceVatBase(e: MaintenanceLogExtra | undefined): number {
  return (Number(e?.totalAmount) || 0) + (Number(e?.laborCost) || 0);
}

export function maintenanceVatAmount(base: number, rate: number | undefined): number {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round((Number(base) || 0) * value);
}

export function maintenanceVat(e: MaintenanceLogExtra | undefined): number {
  return maintenanceVatAmount(maintenanceVatBase(e), e?.vatRate);
}

export function maintenanceOutstanding(e: MaintenanceLogExtra | undefined): number | undefined {
  const total = e?.grandTotal ?? e?.cost;
  if (total == null) return undefined;
  return total - (e?.accountsReceived ?? 0);
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
