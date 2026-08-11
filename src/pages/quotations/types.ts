import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';

export type QuotationStatus = 'draft' | 'sent' | 'cancelled' | 'converted';

export type QuotationPriceTier = {
  minQuantity: number;
  unitPrice: number;
};

export type QuotationLine = {
  productCode: string;
  productName: string;

  unit?: string;
  quantity: number;
  unitPrice: number;

  priceTiers?: QuotationPriceTier[];
};

export function normalizePriceTiers(tiers: QuotationPriceTier[]): QuotationPriceTier[] {
  const byMin = new Map<number, number>();
  for (const t of tiers) {
    const min = Math.floor(Number(t.minQuantity));
    const price = Number(t.unitPrice);
    if (!Number.isFinite(min) || min < 1) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    byMin.set(min, price);
  }
  return [...byMin.entries()]
    .map(([minQuantity, unitPrice]) => ({ minQuantity, unitPrice }))
    .sort((a, b) => a.minQuantity - b.minQuantity);
}

export function resolveTierPrice(
  tiers: QuotationPriceTier[] | undefined,
  quantity: number,
): number | undefined {
  if (!tiers?.length || !Number.isFinite(quantity)) return undefined;
  let match: QuotationPriceTier | undefined;
  for (const t of normalizePriceTiers(tiers)) {
    if (quantity >= t.minQuantity) match = t;
    else break;
  }
  return match?.unitPrice;
}

export type QuotationExtra = {
  code: string;

  status: QuotationStatus;

  customerCode?: string;

  customerName?: string;

  assignedStaff?: string;
  note?: string;
  lines: QuotationLine[];
  isDeleted?: boolean;

  sentAt?: number;

  convertedAt?: number;

  generatedSalesOrderId?: string;
  generatedSalesOrderNumber?: string;
  [key: string]: unknown;
};

export type Quotation = PartitionedRecordRow & {
  createdAt: number;
  updatedAt: number;
  extra: QuotationExtra;
};

export function quotationTotal(lines: QuotationLine[]): number {
  return lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0);
}

export function quotationListDate(q: Quotation): {
  at: number;
  kind: 'created' | 'sent' | 'po';
} {
  const status = q.extra.status ?? 'draft';
  if (status === 'converted') {
    return { at: q.extra.convertedAt ?? q.updatedAt ?? q.createdAt, kind: 'po' };
  }
  if (status === 'sent') {
    return { at: q.extra.sentAt ?? q.updatedAt ?? q.createdAt, kind: 'sent' };
  }
  return { at: q.createdAt, kind: 'created' };
}

export function quotationBadgeProps(status: QuotationStatus): {
  color: string;
  variant: 'filled' | 'light';
} {
  if (status === 'sent') return { color: 'green', variant: 'filled' };
  if (status === 'converted') return { color: 'blue', variant: 'filled' };
  if (status === 'cancelled') return { color: 'red', variant: 'light' };
  return { color: 'gray', variant: 'light' };
}
