/**
 * Vietnam-anchored date/date-time string helpers, shared by `<DateField>`,
 * `<DateTimeTextField>` and the form pages that keep dates as strings.
 *
 * Mantine 8's `DateTimePicker` works with strings in the
 * `YYYY-MM-DD HH:mm:ss` format internally. These two helpers convert to/from
 * that format so consumers can keep ISO strings on the wire and Date objects
 * in their own logic without sprinkling `padStart` formatters everywhere.
 *
 * Lives in `utils/` (not next to the component) because the project's
 * `react-refresh` rule wants component files to export only components.
 */

import type { NullableDateTimeInput } from '@credo/kits/types';

const pad = (n: number) => String(n).padStart(2, '0');

function formatLocal(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    ` ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * Convert a backend ISO string (`2026-05-03T07:25:01Z`) to the picker's
 * `YYYY-MM-DD HH:mm:ss` display string. Returns `null` on empty/invalid
 * input so the picker shows its placeholder instead of a broken value.
 */
export function isoToDateTimeString(iso: NullableDateTimeInput): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatLocal(d);
}

/**
 * The inverse: the picker's `YYYY-MM-DD HH:mm:ss` string → an ISO timestamp for
 * the wire. Returns `''` for empty/invalid input, so a caller can spread the key
 * away rather than storing a broken value.
 *
 * Callers used to write `new Date(v).toISOString()` inline, which throws a
 * `RangeError` on an invalid date instead of degrading — this is the safe pair
 * to `isoToDateTimeString`.
 */
export function dateTimeStringToIso(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Date-only helpers (for `<DateField>` — Vietnam-anchored boundaries)
//
// Goods receipts and similar "this happened on day X" records ignore time of
// day. We anchor the day in Asia/Ho_Chi_Minh (UTC+7) so the date a Vietnamese
// operator picks matches the date their c-storage partition uses (the BFF
// partitions on UTC+7 — see partitioned-storage-refactor.md). Storing
// midnight-UTC instead would split partitions at 7AM local time.
// ---------------------------------------------------------------------------

const VN_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date as `YYYY-MM-DD` in Asia/Ho_Chi_Minh (UTC+7). */
export function todayInVnDateString(): string {
  return VN_DATE_FORMATTER.format(new Date());
}

/**
 * Convert an ISO string to `YYYY-MM-DD` in Vietnam time. Returns `null` on
 * empty/invalid input.
 */
export function isoToVnDateString(iso: NullableDateTimeInput): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return VN_DATE_FORMATTER.format(d);
}

/**
 * Convert a `YYYY-MM-DD` string back to an ISO timestamp pinned at 00:00 in
 * Vietnam time (GMT+7). Useful at form submit for "date-only" fields like
 * a receipt's `receivedDate` — the wire format stays full ISO so existing
 * BFF / display code is unchanged.
 *
 * Example: `'2026-05-03'` → `'2026-05-02T17:00:00.000Z'`
 *          (== `2026-05-03T00:00:00+07:00`).
 */
export function vnDateStringToIso(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // Parse via ISO offset so the JS engine honours the +07:00 zone regardless
  // of the host machine's timezone.
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}
