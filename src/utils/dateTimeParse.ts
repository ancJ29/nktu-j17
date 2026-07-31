const pad = (n: number) => String(n).padStart(2, '0');

export type DateOrder = 'DMY' | 'MDY' | 'YMD';

export function dateOrderFromFormat(format: string | undefined): DateOrder {
  if (!format) return 'DMY';
  if (format.startsWith('YYYY')) return 'YMD';
  if (format.startsWith('MM')) return 'MDY';
  return 'DMY';
}

export type ParseDateTimeOptions = {
  order?: DateOrder;

  now?: Date;

  fallbackDate?: string | null;
};

const TIME_RE = /^(\d{1,2})[:h](\d{1,2})?(?::(\d{1,2}))?$/i;

const DATE_RE = /^(\d{1,4})[/\-.](\d{1,4})(?:[/\-.](\d{1,4}))?$/;

const BARE_TIME_RE = /^(\d{1,4})$/;

type Ymd = { year: number; month: number; day: number };
type Hm = { hour: number; minute: number };

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function resolveYear(raw: string | undefined, now: Date): number | null {
  if (raw === undefined) return now.getFullYear();
  const n = Number(raw);
  if (raw.length <= 2) return 2000 + n;
  if (raw.length === 4) return n;
  return null;
}

function parseDateToken(token: string, order: DateOrder, now: Date): Ymd | null {
  const m = DATE_RE.exec(token);
  if (!m) return null;
  const [a, b, c] = [m[1]!, m[2]!, m[3]];

  let dayRaw: string;
  let monthRaw: string;
  let yearRaw: string | undefined;
  if (order === 'YMD') {
    if (c === undefined) {
      monthRaw = a;
      dayRaw = b;
    } else {
      yearRaw = a;
      monthRaw = b;
      dayRaw = c;
    }
  } else if (order === 'MDY') {
    monthRaw = a;
    dayRaw = b;
    yearRaw = c;
  } else {
    dayRaw = a;
    monthRaw = b;
    yearRaw = c;
  }

  const year = resolveYear(yearRaw, now);
  if (year === null) return null;
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function parseTimeToken(token: string): Hm | null {
  const m = TIME_RE.exec(token);
  if (m) {
    const hour = Number(m[1]);
    const minute = m[2] === undefined ? 0 : Number(m[2]);
    return hour <= 23 && minute <= 59 ? { hour, minute } : null;
  }
  const bare = BARE_TIME_RE.exec(token);
  if (!bare) return null;
  const digits = bare[1]!;

  if (digits.length <= 2) {
    const hour = Number(digits);
    return hour <= 23 ? { hour, minute: 0 } : null;
  }
  const hour = Number(digits.slice(0, digits.length - 2));
  const minute = Number(digits.slice(-2));
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

function dateOf(value: string | null | undefined): Ymd | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function parseDateTimeInput(
  input: string,
  { order = 'DMY', now = new Date(), fallbackDate }: ParseDateTimeOptions = {},
): string | null {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) return null;

  let date: Ymd | null = null;
  let time: Hm | null = null;

  if (tokens.length === 2) {
    const [first, second] = tokens as [string, string];
    const firstDate = parseDateToken(first, order, now);
    if (firstDate) {
      date = firstDate;
      time = parseTimeToken(second);
    } else {
      date = parseDateToken(second, order, now);
      time = parseTimeToken(first);
    }
    if (!date || !time) return null;
  } else {
    const only = tokens[0]!;
    date = parseDateToken(only, order, now);
    if (date) {
      time = { hour: 0, minute: 0 };
    } else {
      time = TIME_RE.test(only) ? parseTimeToken(only) : null;
      if (!time) return null;
      date = dateOf(fallbackDate) ?? {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      };
    }
  }

  return (
    `${date.year}-${pad(date.month)}-${pad(date.day)}` + ` ${pad(time.hour)}:${pad(time.minute)}:00`
  );
}
