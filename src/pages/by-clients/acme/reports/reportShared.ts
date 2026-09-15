import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { goodsReceiptFlow } from '@/pages/v2/goods-receipts/statusFlow';
import { REVENUE_STAGES, addDays, todayUtc7 } from '@/pages/v2/reports/buildRevenueReport';
import { detailLink, listWindowFits, transactionalListLink } from '@/pages/v2/reports/reportLinks';
import { salesOrderFlow } from '@/pages/v2/sales-orders/statusFlow';

// The non-component half of acme's report kit — split from reportKit.tsx so
// that file exports only components (react-refresh's fast-refresh rule).

/**
 * How far past the display range the FETCH reaches back: an order is stored
 * under its creation day but buckets under `orderDate`, and a backdated order
 * entered this much later still lands. Created further out is the documented
 * blind spot. No forward widening — the windows end today, and a creation day
 * cannot postdate the clock.
 */
export const WIDEN_BACK_DAYS = 45;

/** The breakdown reports' window presets; the hash param carries the value. */
export const WINDOW_PRESETS: ReadonlyArray<{ value: string; label: string; days: number }> = [
  { value: '30', label: '30 ngày', days: 30 },
  { value: '90', label: '90 ngày', days: 90 },
  { value: '365', label: '12 tháng', days: 365 },
];

export function windowPresetOf(param?: string): { value: string; label: string; days: number } {
  return WINDOW_PRESETS.find((p) => p.value === param) ?? WINDOW_PRESETS[0]!;
}

/** A preset's inclusive display range, ending today (UTC+7). */
export function presetRange(days: number): { fromDay: string; toDay: string } {
  const today = todayUtc7();
  return { fromDay: addDays(today, -(days - 1)), toDay: today };
}

/** Monday of the ISO week containing `dateStr` — the dashboard's "this week". */
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return addDays(dateStr, -((d.getUTCDay() + 6) % 7));
}

export const formatVnd = (n: number): string => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

// ── Links out of a report ─────────────────────────────────────────────────
// Which cell links where is acme's own decision; the blob and the clamp gate
// are the shared kit's (`pages/v2/reports/reportLinks.ts`).

type DayRange = { fromDay: string; toDay: string };

/** The client's status values that a revenue report counts — the list's `s`. */
const revenueStatuses = salesOrderFlow.statuses
  .filter((s) => REVENUE_STAGES.includes(s.stage))
  .map((s) => s.value);
const receivedStatuses = goodsReceiptFlow.statuses
  .filter((s) => s.stage === 'received')
  .map((s) => s.value);

/** Undefined when the list could not show the whole window (the clamp gate). */
const scoped = (range: DayRange, build: () => string): string | undefined =>
  listWindowFits(range.fromDay, range.toDay) ? build() : undefined;

/** The SO list over `range`, on the report's own statuses, optionally one customer or one item. */
export function salesOrdersLink(
  range: DayRange,
  narrow: { customerId?: string; itemId?: string } = {},
): string | undefined {
  const multi = {
    ...(narrow.customerId ? { customerIds: [narrow.customerId] } : {}),
    ...(narrow.itemId ? { itemIds: [narrow.itemId] } : {}),
  };
  return scoped(range, () =>
    transactionalListLink(ROUTES.SALES_ORDERS_V2.LIST, {
      ...range,
      widenBackDays: WIDEN_BACK_DAYS,
      statuses: revenueStatuses,
      ...(Object.keys(multi).length > 0 ? { multi } : {}),
    }),
  );
}

/** The DN list over `range`, every status (the report counts them all), optionally one assignee. */
export function deliveryNotesLink(range: DayRange, assigneeId?: string): string | undefined {
  return scoped(range, () =>
    transactionalListLink(ROUTES.DELIVERY_NOTES_V2.LIST, {
      ...range,
      widenBackDays: WIDEN_BACK_DAYS,
      statuses: [],
      ...(assigneeId ? { multi: { assigneeIds: [assigneeId] } } : {}),
    }),
  );
}

/** The GR list over `range`, received stage only, optionally one vendor. */
export function goodsReceiptsLink(range: DayRange, vendorId?: string): string | undefined {
  return scoped(range, () =>
    transactionalListLink(ROUTES.GOODS_RECEIPTS_V2.LIST, {
      ...range,
      widenBackDays: WIDEN_BACK_DAYS,
      statuses: receivedStatuses,
      ...(vendorId ? { multi: { vendorIds: [vendorId] } } : {}),
    }),
  );
}

/**
 * A register page answers a phone only if its spec carries a `mobile` card
 * (`MasterDataSpec.mobile`); without one it renders "use a desktop". So on a
 * phone those names are TEXT, not a link into that message — the row's own
 * count still opens the transactional list, which has no such gate. Products
 * opted in, so its link holds on both. The real fix is a phone card for the
 * other registers, which is a product decision, not a report's to make.
 */
export const customerLink = (id: string): string | undefined =>
  device.isMobile ? undefined : detailLink(ROUTES.CUSTOMERS_V2.DETAIL, id);
export const vendorLink = (id: string): string | undefined =>
  device.isMobile ? undefined : detailLink(ROUTES.VENDORS_V2.DETAIL, id);

/** A product-sales entry key is `<itemType>:<itemId>` — split once, for both links below. */
export function soldItemOf(entryKey: string): { itemType: string; itemId: string } {
  const at = entryKey.indexOf(':');
  return { itemType: entryKey.slice(0, at), itemId: entryKey.slice(at + 1) };
}

/** Each item type has its own register. */
export function soldItemLink(entryKey: string): string | undefined {
  const { itemType, itemId } = soldItemOf(entryKey);
  if (!itemId) return undefined;
  if (itemType === 'product') return detailLink(ROUTES.PRODUCTS_V2.DETAIL, itemId);
  if (itemType === 'material') return detailLink(ROUTES.MATERIALS_V2.DETAIL, itemId);
  return undefined;
}
