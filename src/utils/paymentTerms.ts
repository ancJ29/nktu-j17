export const MAX_PAYMENT_TERM_DAYS = 365;

export function paymentTermDaysOf(extra: unknown, defaultDays: number): number {
  const raw =
    extra && typeof extra === 'object'
      ? (extra as { paymentTermDays?: unknown }).paymentTermDays
      : undefined;
  return isValidTermDays(raw) ? raw : defaultDays;
}

export function hasOwnPaymentTerm(extra: unknown): boolean {
  const raw =
    extra && typeof extra === 'object'
      ? (extra as { paymentTermDays?: unknown }).paymentTermDays
      : undefined;
  return isValidTermDays(raw);
}

function isValidTermDays(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_PAYMENT_TERM_DAYS;
}

export function parseTermDaysInput(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return isValidTermDays(n) ? n : undefined;
}

export function addDaysToDay(day: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

export function proposeDeadline(orderDay: string, termDays: number): string {
  return addDaysToDay(orderDay, termDays);
}

export function keepsFollowing(current: string | null | undefined, proposal: string): boolean {
  return !current || current === proposal;
}

export function followDeadline(
  current: string | null | undefined,
  last: string,
  proposal: string,
): { value: string; last: string } {
  if (!current || current === last) return { value: proposal, last: proposal };
  if (current === proposal) return { value: current, last: proposal };
  return { value: current, last };
}

export function withPaymentTermDays<E extends Record<string, unknown>>(
  extra: E,
  input: unknown,
  enabled: boolean,
): E {
  if (!enabled) return extra;
  const { paymentTermDays: _old, ...rest } = extra;
  const days = parseTermDaysInput(input);
  return (days === undefined ? rest : { ...rest, paymentTermDays: days }) as E;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function dateToDay(d: Date | string | null | undefined): string {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  if (!d || Number.isNaN(new Date(d).getTime())) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

export function dayToDate(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function dayToVnMidnightMs(day: string): number | undefined {
  const t = Date.parse(`${day}T00:00:00+07:00`);
  return Number.isNaN(t) ? undefined : t;
}
