import { addDaysToDay, paymentTermDaysOf, proposeDeadline } from '@/utils/paymentTerms';
import type {
  PurchaseOrder,
  PurchaseOrderAttachment,
  PurchaseOrderCurrency,
  PurchaseOrderExtra,
  PurchaseOrderItem,
  PurchaseOrderLeadTime,
  PurchaseOrderPhoto,
  PurchaseOrderStatus,
} from '@/types';

type Loose = Partial<Record<keyof PurchaseOrder, unknown>> | null | undefined;

export function poStatus(po: Loose): PurchaseOrderStatus {
  const s = po?.status;
  return s === 'ready' || s === 'cancelled' ? s : 'draft';
}

export function poCurrency(po: Loose): PurchaseOrderCurrency {
  return po?.currency === 'CNY' ? 'CNY' : 'VND';
}

export function poItems(po: Loose): PurchaseOrderItem[] {
  const items = po?.items;
  if (!Array.isArray(items)) return [];
  return items.filter((i): i is PurchaseOrderItem => !!i && typeof i === 'object');
}

export function poReceiptIds(po: Loose): string[] {
  const ids = po?.receiptIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((i): i is string => typeof i === 'string' && i !== '');
}

export function poExtra(po: Loose): PurchaseOrderExtra {
  const e = po?.extra;
  return e && typeof e === 'object' ? (e as PurchaseOrderExtra) : {};
}

export function poIsPaid(po: Loose): boolean {
  return po?.isPaid === true;
}

export function vnDayOf(iso: unknown): string {
  if (typeof iso !== 'string' || iso === '') return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(t + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function poOrderDay(po: Loose): string {
  return vnDayOf(po?.orderDate) || vnDayOf(po?.createdAt);
}

export function poOrderDateIso(po: Loose): string {
  const day = poOrderDay(po);
  return day ? new Date(`${day}T00:00:00+07:00`).toISOString() : '';
}

export function poCustomer(po: Loose): { code: string; name: string } | null {
  const code = typeof po?.customerCode === 'string' ? po.customerCode.trim() : '';
  const name = typeof po?.customerName === 'string' ? po.customerName.trim() : '';
  return code || name ? { code, name } : null;
}

function urlEntries<T extends { url: string }>(v: unknown): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (e): e is T =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as { url?: unknown }).url === 'string' &&
      (e as { url: string }).url !== '',
  );
}

export function poPhotos(po: Loose): PurchaseOrderPhoto[] {
  return urlEntries<PurchaseOrderPhoto>(po?.photos);
}

export function poAttachments(po: Loose): PurchaseOrderAttachment[] {
  return urlEntries<PurchaseOrderAttachment>(po?.attachments);
}

const isDay = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 365;

export function asLeadTime(v: unknown): PurchaseOrderLeadTime | null {
  if (!v || typeof v !== 'object') return null;
  const { minDays, maxDays } = v as Record<string, unknown>;
  return isDay(minDays) && isDay(maxDays) && minDays <= maxDays ? { minDays, maxDays } : null;
}

export function poLeadTime(po: Loose): PurchaseOrderLeadTime | null {
  return asLeadTime(po?.leadTime);
}

export function parseLeadTimeTag(tag: string): PurchaseOrderLeadTime | null {
  const m = /^\s*(\d{1,3})\s*[-~–]\s*(\d{1,3})\s*$/.exec(tag);
  return m ? asLeadTime({ minDays: Number(m[1]), maxDays: Number(m[2]) }) : null;
}

export function leadTimeTag(lt: PurchaseOrderLeadTime): string {
  return `${lt.minDays}-${lt.maxDays}`;
}

export function leadTimeLabel(
  lt: PurchaseOrderLeadTime,
  range: (min: number, max: number) => string,
): string {
  return range(lt.minDays, lt.maxDays);
}

export function plannedArrivalDay(po: Loose): string {
  const lt = poLeadTime(po);
  const day = poOrderDay(po);
  if (lt && day) return addDaysToDay(day, lt.maxDays);
  return vnDayOf(po?.expectedDate);
}

export function plannedArrivalIso(po: Loose): string {
  const day = plannedArrivalDay(po);
  return day ? new Date(`${day}T00:00:00+07:00`).toISOString() : '';
}

export function poPaymentDeadlineDay(po: Loose): string {
  return vnDayOf(po?.paymentDeadline);
}

export function currencyDecimals(currency: PurchaseOrderCurrency): number {
  return currency === 'CNY' ? 2 : 0;
}

export function unitPriceDecimals(currency: PurchaseOrderCurrency): number {
  return currency === 'CNY' ? 4 : 0;
}

export function roundMoney(value: number, currency: PurchaseOrderCurrency): number {
  const f = 10 ** currencyDecimals(currency);

  return Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function lineAmount(item: Partial<PurchaseOrderItem>, currency: PurchaseOrderCurrency) {
  return roundMoney(num(item.quantity) * num(item.unitPrice), currency);
}

export function lineTax(item: Partial<PurchaseOrderItem>, currency: PurchaseOrderCurrency) {
  const v = num(item.taxAmount);
  return v > 0 ? roundMoney(v, currency) : 0;
}

export function lineTotal(item: Partial<PurchaseOrderItem>, currency: PurchaseOrderCurrency) {
  return roundMoney(lineAmount(item, currency) + lineTax(item, currency), currency);
}

export function orderSubtotal(po: Loose): number {
  const currency = poCurrency(po);
  return roundMoney(
    poItems(po).reduce((sum, i) => sum + lineAmount(i, currency), 0),
    currency,
  );
}

export function orderTax(po: Loose): number {
  const currency = poCurrency(po);
  return roundMoney(
    poItems(po).reduce((sum, i) => sum + lineTax(i, currency), 0),
    currency,
  );
}

export function orderTotal(po: Loose): number {
  return roundMoney(orderSubtotal(po) + orderTax(po), poCurrency(po));
}

export function hasPrice(item: Partial<PurchaseOrderItem>): boolean {
  return (
    typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) && item.unitPrice >= 0
  );
}

export function proposePurchaseOrderDeadline(
  orderDay: string,
  vendorExtra: unknown,
  defaultDays: number,
): string {
  return proposeDeadline(orderDay, paymentTermDaysOf(vendorExtra, defaultDays));
}

export type PoPaymentState = 'paid' | 'partial' | 'unpaid';

export function poPaidAmount(po: Loose): number {
  const v = po?.paidAmount;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

export function poPayment(po: Loose): {
  state: PoPaymentState;
  paid: number;

  remaining: number;
} {
  if (poIsPaid(po)) return { state: 'paid', paid: 0, remaining: 0 };
  const paid = poPaidAmount(po);
  const total = orderTotal(po);
  return {
    state: paid > 0 ? 'partial' : 'unpaid',
    paid,
    remaining: roundMoney(Math.max(total - paid, 0), poCurrency(po)),
  };
}

export function poPaymentUntracked(po: Loose): boolean {
  return po?.paymentUntracked === true;
}

export function isOverdue(po: Loose, todayVn: string): boolean {
  if (poIsPaid(po) || poStatus(po) === 'cancelled' || poPaymentUntracked(po)) return false;
  const d = poPaymentDeadlineDay(po);
  return d !== '' && d < todayVn;
}

export type ReadyBlocker = 'noLines' | 'badQuantity' | 'missingPrice' | 'noVendor';

export function readyBlockers(po: Loose, opts: { requirePrice: boolean }): ReadyBlocker[] {
  const out: ReadyBlocker[] = [];
  const items = poItems(po);
  if (items.length === 0) out.push('noLines');
  if (items.some((i) => !(num(i.quantity) > 0))) out.push('badQuantity');
  if (opts.requirePrice && items.some((i) => !hasPrice(i))) out.push('missingPrice');
  if (!po?.vendorCode) out.push('noVendor');
  return out;
}

export function formatMoney(value: number, currency: PurchaseOrderCurrency): string {
  const d = currencyDecimals(currency);
  return value.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
