import type {
  Employee,
  OdometerFuelPayment,
  OdometerFuelPaymentMethod,
  OdometerFuelReset,
  OdometerLog,
} from '@/types';
import {
  liveLogs,
  otherCostsTotal,
  readEmployeeId,
  readFuelCost,
  readOtherCosts,
  shiftDate,
} from './odometerLogModel';

export const FUEL_LEDGER_FLOOR = '2026-10-08';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function readAmount(payment: OdometerFuelPayment | undefined): number | undefined {
  const raw: unknown = payment?.extra?.amount;
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function readMethod(payment: OdometerFuelPayment): OdometerFuelPaymentMethod {
  return payment.extra?.method === 'advance' ? 'advance' : 'payment';
}

function paymentEmployeeId(payment: OdometerFuelPayment): string {
  const raw: unknown = payment.extra?.employeeId;
  return typeof raw === 'string' ? raw : '';
}

export function livePayments(payments: OdometerFuelPayment[]): OdometerFuelPayment[] {
  return payments.filter((p) => !p.extra?.isDeleted);
}

export function ledgerStart(resets: OdometerFuelReset[], employeeId: string): string {
  let latest: OdometerFuelReset | undefined;
  for (const reset of clearsFor(resets, employeeId)) {
    if (!latest || (reset.createdAt ?? 0) > (latest.createdAt ?? 0)) latest = reset;
  }
  const from = latest?.extra.fromDate;
  return from && from > FUEL_LEDGER_FLOOR ? from : FUEL_LEDGER_FLOOR;
}

function clearsFor(resets: OdometerFuelReset[], employeeId: string): OdometerFuelReset[] {
  return resets.filter((reset) => {
    const from: unknown = reset.extra?.fromDate;
    if (reset.extra?.isDeleted || typeof from !== 'string' || !DAY.test(from)) return false;
    const who = reset.extra.employeeId;
    return !who || who === employeeId;
  });
}

export type FuelLedgerRow = {
  employeeId: string;
  employeeName: string;

  from: string;

  spent: number;

  paid: number;

  remaining: number;

  paidThrough?: string;
};

type LedgerInput = {
  logs: OdometerLog[];
  payments: OdometerFuelPayment[];
  resets: OdometerFuelReset[];
};

function spentBetween(
  live: OdometerLog[],
  employeeId: string,
  from: string,
  through?: string,
): number {
  let spent = 0;
  for (const l of live) {
    if (readEmployeeId(l) !== employeeId || l.recordDate < from) continue;
    if (through && l.recordDate > through) continue;
    spent += (readFuelCost(l) ?? 0) + otherCostsTotal(l);
  }
  return spent;
}

export function buildFuelLedger({
  roster,
  logs,
  payments,
  resets,
}: LedgerInput & { roster: Employee[] }): FuelLedgerRow[] {
  const live = liveLogs(logs);
  const paidRows = livePayments(payments);

  const rowFor = (employeeId: string, employeeName: string): FuelLedgerRow => {
    const from = ledgerStart(resets, employeeId);
    const spent = spentBetween(live, employeeId, from);
    const own = paidRows.filter(
      (p) => paymentEmployeeId(p) === employeeId && p.recordDate >= from && readAmount(p),
    );
    const paid = own.reduce((sum, p) => sum + (readAmount(p) ?? 0), 0);
    const paidThrough = own.reduce<string | undefined>(
      (max, p) => (!max || p.recordDate > max ? p.recordDate : max),
      undefined,
    );
    return {
      employeeId,
      employeeName,
      from,
      spent,
      paid,
      remaining: spent - paid,
      ...(paidThrough && { paidThrough }),
    };
  };

  const rows = roster.map((e) => rowFor(e.id, e.name));
  const known = new Set(roster.map((e) => e.id));
  const strays = new Map<string, string>();
  for (const l of live) {
    const id = readEmployeeId(l);
    if (id && !known.has(id)) strays.set(id, l.extra?.employeeName ?? '');
  }
  for (const p of paidRows) {
    const id = paymentEmployeeId(p);
    if (id && !known.has(id)) strays.set(id, p.extra?.employeeName ?? '');
  }
  for (const [id, name] of strays) {
    const row = rowFor(id, name);
    if (row.spent !== 0 || row.paid !== 0) rows.push(row);
  }
  return rows;
}

export function owedThrough({
  logs,
  payments,
  resets,
  employeeId,
  date,
}: LedgerInput & { employeeId: string; date: string }): number {
  const from = ledgerStart(resets, employeeId);
  const spent = spentBetween(liveLogs(logs), employeeId, from, date);
  const paid = livePayments(payments)
    .filter((p) => paymentEmployeeId(p) === employeeId && p.recordDate >= from)
    .reduce((sum, p) => sum + (readAmount(p) ?? 0), 0);
  return spent - paid;
}

export type PaybackLine = { date: string; amount: number; balance: number } & (
  | { kind: 'carry' }
  | { kind: 'fuel' }
  | { kind: 'other'; content: string }
  | { kind: 'payment'; payment: OdometerFuelPayment }
);

export type PaybackPeriod = {
  from: string;

  through?: string;

  to?: string;

  carryIn: number;

  spent: number;

  paid: number;

  balance: number;

  lines: PaybackLine[];
};

export type EarlierCount = {
  from: string;

  to: string;

  clear: OdometerFuelReset;

  dropped: number;

  periods: PaybackPeriod[];
};

export type PaybackHistory = {
  row: FuelLedgerRow;

  periods: PaybackPeriod[];

  earlier: EarlierCount[];
};

export type DayRange = { from: string; to: string };

const touches = (from: string, to: string | undefined, range: DayRange) =>
  from <= range.to && (to === undefined || to >= range.from);

export function historyInRange(history: PaybackHistory, range: DayRange): PaybackHistory {
  const shown = (periods: PaybackPeriod[]) => periods.filter((p) => touches(p.from, p.to, range));
  return {
    row: history.row,
    periods: shown(history.periods),
    earlier: history.earlier
      .filter((count) => touches(count.from, count.to, range))
      .map((count) => ({ ...count, periods: shown(count.periods) })),
  };
}

export function buildPaybackHistory(input: LedgerInput & { roster: Employee[] }): PaybackHistory[] {
  const live = liveLogs(input.logs);
  const paidRows = livePayments(input.payments);
  return buildFuelLedger(input).map((row) => ({
    row,
    periods: periodsFor(row.employeeId, row.from, undefined, live, paidRows),
    earlier: earlierCounts(row, input.resets, live, paidRows),
  }));
}

function earlierCounts(
  row: FuelLedgerRow,
  resets: OdometerFuelReset[],
  live: OdometerLog[],
  paidRows: OdometerFuelPayment[],
): EarlierCount[] {
  const cutBy = new Map<string, OdometerFuelReset>();
  for (const clear of clearsFor(resets, row.employeeId)) {
    const day = clear.extra.fromDate;
    if (day <= FUEL_LEDGER_FLOOR || day > row.from) continue;
    const seen = cutBy.get(day);
    if (!seen || clear.createdAt > seen.createdAt) cutBy.set(day, clear);
  }
  const starts = [FUEL_LEDGER_FLOOR, ...[...cutBy.keys()].filter((d) => d < row.from).sort()];
  const counts: EarlierCount[] = [];
  starts.forEach((from, i) => {
    const next = starts[i + 1] ?? row.from;
    const clear = cutBy.get(next);
    if (!clear) return;
    const to = shiftDate(next, -1);
    const periods = periodsFor(row.employeeId, from, to, live, paidRows);
    if (periods.length > 0) {
      counts.push({ from, to, clear, dropped: periods[0]!.balance, periods });
    }
  });
  return counts.reverse();
}

type Cost = { date: string; amount: number } & (
  { kind: 'fuel' } | { kind: 'other'; content: string }
);

function periodsFor(
  employeeId: string,
  from: string,
  until: string | undefined,
  live: OdometerLog[],
  paidRows: OdometerFuelPayment[],
): PaybackPeriod[] {
  const within = (day: string) => day >= from && (until === undefined || day <= until);
  const costs: Cost[] = [];
  const own = live
    .filter((l) => readEmployeeId(l) === employeeId && within(l.recordDate))
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  for (const l of own) {
    const fuel = readFuelCost(l);
    if (fuel !== undefined) costs.push({ kind: 'fuel', date: l.recordDate, amount: fuel });
    for (const line of readOtherCosts(l)) {
      costs.push({ kind: 'other', date: l.recordDate, amount: line.amount, content: line.content });
    }
  }
  const payments = paidRows
    .filter(
      (p) =>
        paymentEmployeeId(p) === employeeId && within(p.recordDate) && readAmount(p) !== undefined,
    )
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate) || a.createdAt - b.createdAt);

  const periods: PaybackPeriod[] = [];
  let balance = 0;
  let start = from;
  let next = 0;
  const close = (through: string | undefined, settled: OdometerFuelPayment[]) => {
    const carryIn = balance;
    const lines: PaybackLine[] = [];
    if (carryIn !== 0) lines.push({ kind: 'carry', date: start, amount: carryIn, balance });
    let spent = 0;
    while (next < costs.length && (through === undefined || costs[next]!.date <= through)) {
      const cost = costs[next++]!;
      spent += cost.amount;
      balance += cost.amount;
      lines.push({ ...cost, balance });
    }
    let paid = 0;
    for (const payment of settled) {
      const amount = readAmount(payment) ?? 0;
      paid += amount;
      balance -= amount;
      lines.push({ kind: 'payment', date: payment.recordDate, amount, payment, balance });
    }
    const to = through ?? until;
    periods.push({
      from: start,
      ...(through && { through }),
      ...(to && { to }),
      carryIn,
      spent,
      paid,
      balance,
      lines,
    });
    if (through) start = shiftDate(through, 1);
  };

  for (const through of new Set(payments.map((p) => p.recordDate))) {
    close(
      through,
      payments.filter((p) => p.recordDate === through),
    );
  }
  if (next < costs.length) close(undefined, []);
  return periods.reverse();
}

export type DayStatement = {
  spent: number;
  fuel: number;
  other: number;

  paid: number;

  paidThrough?: string;

  balance: number;

  closed?: { clear: OdometerFuelReset; dropped: number; nextFrom: string };
};

export const dayKey = (employeeId: string, day: string) => `${employeeId}|${day}`;

export function buildDayStatements(
  histories: PaybackHistory[],
  logs: OdometerLog[],
): Map<string, DayStatement> {
  const live = liveLogs(logs);
  const out = new Map<string, DayStatement>();

  const countInto = (
    employeeId: string,
    from: string,
    until: string | undefined,
    periods: PaybackPeriod[],
    closing?: { clear: OdometerFuelReset; dropped: number },
  ) => {
    const days = [
      ...new Set(
        live
          .filter(
            (l) =>
              readEmployeeId(l) === employeeId &&
              l.recordDate >= from &&
              (until === undefined || l.recordDate <= until),
          )
          .map((l) => l.recordDate),
      ),
    ].sort();
    if (days.length === 0) return;
    const byDay = new Map<string, DayStatement>(
      days.map((day) => [day, { spent: 0, fuel: 0, other: 0, paid: 0, balance: 0 }]),
    );
    const touched = new Set<string>();
    const lines = [...periods].reverse().flatMap((period) => period.lines);
    for (const line of lines) {
      if (line.kind === 'carry') continue;
      const landed =
        line.kind === 'payment'
          ? ([...days].reverse().find((d) => d <= line.date) ?? days[0]!)
          : line.date;
      const day = byDay.get(landed);
      if (!day) continue;
      touched.add(landed);
      if (line.kind === 'payment') {
        day.paid += line.amount;
        if (line.date !== landed && (!day.paidThrough || line.date > day.paidThrough)) {
          day.paidThrough = line.date;
        }
      } else {
        day.spent += line.amount;
        day[line.kind === 'fuel' ? 'fuel' : 'other'] += line.amount;
      }
      day.balance = line.balance;
    }
    let carried = 0;
    for (const d of days) {
      const day = byDay.get(d)!;

      if (!touched.has(d)) day.balance = carried;
      carried = day.balance;
      out.set(dayKey(employeeId, d), day);
    }
    if (closing) {
      out.get(dayKey(employeeId, days[days.length - 1]!))!.closed = {
        ...closing,
        nextFrom: closing.clear.extra.fromDate,
      };
    }
  };

  for (const { row, periods, earlier } of histories) {
    countInto(row.employeeId, row.from, undefined, periods);
    for (const count of earlier) {
      countInto(row.employeeId, count.from, count.to, count.periods, {
        clear: count.clear,
        dropped: count.dropped,
      });
    }
  }
  return out;
}

export function withPendingReset(
  resets: OdometerFuelReset[],
  fromDate: string,
  employeeId: string,
): OdometerFuelReset[] {
  return [
    ...resets,
    {
      id: 'pending',
      version: '0',
      createdAt: Number.MAX_SAFE_INTEGER,
      updatedAt: Number.MAX_SAFE_INTEGER,
      extra: { fromDate, ...(employeeId && { employeeId }) },
    },
  ];
}

export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00`);
}
