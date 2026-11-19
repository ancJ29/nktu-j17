import type { BookEntry, BookEntryExtra } from '@/types';

export type BookValueKind = 'money' | 'quantity';

export type BookDraft = {
  recordDate: string;
  description: string;
  inValue?: number | string;
  outValue?: number | string;
  note?: string;

  pick?: string;
};

export type BookIssue =
  | 'dateMissing'
  | 'descriptionMissing'
  | 'valueNeeded'
  | 'bothValues'
  | 'notPositive'
  | 'moneyDecimals'
  | 'quantityDecimals'
  | 'pickMissing';

export type BookField = 'recordDate' | 'description' | 'inValue' | 'outValue' | 'pick';

export const BOOK_ISSUE_FIELD: Record<BookIssue, BookField> = {
  dateMissing: 'recordDate',
  descriptionMissing: 'description',
  valueNeeded: 'inValue',
  bothValues: 'outValue',
  notPositive: 'inValue',
  moneyDecimals: 'inValue',
  quantityDecimals: 'inValue',
  pickMissing: 'pick',
};

export type ValidBookDraft = {
  recordDate: string;
  description: string;
  inValue?: number;
  outValue?: number;
  note?: string;

  pickSnapshot?: Partial<BookEntryExtra>;
};

export type BookValidation =
  { ok: true; value: ValidBookDraft } | { ok: false; issue: BookIssue; field: BookField };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const QUANTITY_PLACES = 3;

const blank = (v: number | string | undefined) => v === undefined || v === '' || v === null;

function placesOf(n: number): number {
  const s = String(n);
  if (s.includes('e')) return QUANTITY_PLACES + 1;
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

export type BookPick = { key: string; label: string; snapshot: Partial<BookEntryExtra> };

export function validateBookDraft(
  draft: BookDraft,
  kind: BookValueKind,
  opts: { pickRequired?: boolean } = {},
): BookValidation {
  const fail = (issue: BookIssue): BookValidation => ({
    ok: false,
    issue,
    field: BOOK_ISSUE_FIELD[issue],
  });
  const recordDate = draft.recordDate.trim();
  if (!DATE_RE.test(recordDate)) return fail('dateMissing');
  if (opts.pickRequired && !draft.pick) return fail('pickMissing');
  const description = draft.description.trim();
  if (!description) return fail('descriptionMissing');

  const hasIn = !blank(draft.inValue);
  const hasOut = !blank(draft.outValue);
  if (!hasIn && !hasOut) return fail('valueNeeded');
  if (hasIn && hasOut) return fail('bothValues');

  const raw = Number(hasIn ? draft.inValue : draft.outValue);
  const field: BookField = hasIn ? 'inValue' : 'outValue';
  const bad = (issue: BookIssue): BookValidation => ({ ok: false, issue, field });
  if (!Number.isFinite(raw) || raw <= 0) return bad('notPositive');
  if (kind === 'money' && !Number.isInteger(raw)) return bad('moneyDecimals');
  if (kind === 'quantity' && placesOf(raw) > QUANTITY_PLACES) return bad('quantityDecimals');

  const note = draft.note?.trim();
  return {
    ok: true,
    value: {
      recordDate,
      description,
      ...(hasIn ? { inValue: raw } : { outValue: raw }),
      ...(note && { note }),
    },
  };
}

export const isVisibleBookRow = (row: BookEntry): boolean => row.extra?.isDeleted !== true;

export function sortBookRows(rows: readonly BookEntry[]): BookEntry[] {
  return [...rows].sort(
    (a, b) =>
      a.recordDate.localeCompare(b.recordDate) ||
      (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
      a.id.localeCompare(b.id),
  );
}

export type BookTotals = { inTotal: number; outTotal: number; balance: number };

const clean = (n: number) => Math.round(n * 10 ** QUANTITY_PLACES) / 10 ** QUANTITY_PLACES;

export function bookTotals(rows: readonly BookEntry[]): BookTotals {
  let inTotal = 0;
  let outTotal = 0;
  for (const row of rows) {
    if (!isVisibleBookRow(row)) continue;
    inTotal += row.extra.inValue ?? 0;
    outTotal += row.extra.outValue ?? 0;
  }
  inTotal = clean(inTotal);
  outTotal = clean(outTotal);
  return { inTotal, outTotal, balance: clean(inTotal - outTotal) };
}

export const monthKeyOf = (recordDate: string): string => recordDate.slice(0, 7);

export type BookWriteContext = {
  actor: string;

  fixedExtra?: Partial<BookEntryExtra>;
};

export function buildBookWrite(
  valid: ValidBookDraft,
  ctx: BookWriteContext,
  existing?: BookEntry,
): { recordDate: string; extra: BookEntryExtra } {
  const base: Partial<BookEntryExtra> = existing ? { ...existing.extra } : {};

  delete base.inValue;
  delete base.outValue;
  delete base.note;
  const extra: BookEntryExtra = {
    ...base,
    ...ctx.fixedExtra,
    ...valid.pickSnapshot,
    description: valid.description,
    ...(valid.inValue !== undefined && { inValue: valid.inValue }),
    ...(valid.outValue !== undefined && { outValue: valid.outValue }),
    ...(valid.note && { note: valid.note }),
    createdBy: existing?.extra.createdBy ?? ctx.actor,
    ...(existing && { updatedBy: ctx.actor }),
  };
  return { recordDate: valid.recordDate, extra };
}

export function buildBookDelete(
  existing: BookEntry,
  actor: string,
  now: number,
): { extra: BookEntryExtra } {
  return {
    extra: { ...existing.extra, isDeleted: true, deletedBy: actor, deletedAt: now },
  };
}

export const formatMonthKey = (key: string): string => key.split('-').reverse().join('/');

export type BookTotalsGroup = BookTotals & { key: string };

export function bookTotalsBy(
  rows: readonly BookEntry[],
  keyOf?: (row: BookEntry) => string,
): BookTotalsGroup[] {
  const groups = new Map<string, BookEntry[]>();
  for (const row of rows) {
    if (!isVisibleBookRow(row)) continue;
    const key = keyOf?.(row) ?? '';
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  if (groups.size === 0) groups.set('', []);
  return [...groups.entries()].map(([key, list]) => ({ key, ...bookTotals(list) }));
}

export type PickTotals = BookTotals & { pickKey: string; label: string; unit: string };

export function bookTotalsByPick(
  rows: readonly BookEntry[],
  pickOf: (row: BookEntry) => BookPick | undefined,
  unitOf: (row: BookEntry) => string,
): PickTotals[] {
  const groups = new Map<string, { pick: BookPick; unit: string; rows: BookEntry[] }>();
  for (const row of rows) {
    if (!isVisibleBookRow(row)) continue;
    const pick = pickOf(row);
    if (!pick) continue;
    const unit = unitOf(row);
    const id = `${pick.key}\u0001${unit}`;
    const g = groups.get(id);
    if (g) g.rows.push(row);
    else groups.set(id, { pick, unit, rows: [row] });
  }
  return [...groups.values()]
    .map((g) => ({ pickKey: g.pick.key, label: g.pick.label, unit: g.unit, ...bookTotals(g.rows) }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.unit.localeCompare(b.unit));
}
