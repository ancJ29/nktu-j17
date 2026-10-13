import type { Employee, OdometerFuelPayment, OdometerFuelReset, OdometerLog } from '@/types';
import { liveLogs, readEmployeeId, readFuelCost } from './odometerLogModel';

export const FUEL_LEDGER_FLOOR = '2026-10-08';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function readAmount(payment: OdometerFuelPayment | undefined): number | undefined {
  const raw: unknown = payment?.extra?.amount;
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
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
  for (const reset of resets) {
    const from: unknown = reset.extra?.fromDate;
    if (reset.extra?.isDeleted || typeof from !== 'string' || !DAY.test(from)) continue;
    const who = reset.extra.employeeId;
    if (who && who !== employeeId) continue;
    if (!latest || (reset.createdAt ?? 0) > (latest.createdAt ?? 0)) latest = reset;
  }
  const from = latest?.extra.fromDate;
  return from && from > FUEL_LEDGER_FLOOR ? from : FUEL_LEDGER_FLOOR;
}

const NOBODY = '\u0000';

export function ledgerWindowStart(roster: Employee[], resets: OdometerFuelReset[]): string {
  const ids = new Set([NOBODY, ...roster.map((e) => e.id)]);
  for (const reset of resets) {
    if (reset.extra?.employeeId) ids.add(reset.extra.employeeId);
  }
  let earliest = '';
  for (const id of ids) {
    const start = ledgerStart(resets, id);
    if (!earliest || start < earliest) earliest = start;
  }
  return earliest;
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
    const spent = live
      .filter((l) => readEmployeeId(l) === employeeId && l.recordDate >= from)
      .reduce((sum, l) => sum + (readFuelCost(l) ?? 0), 0);
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
  const spent = liveLogs(logs)
    .filter((l) => readEmployeeId(l) === employeeId && l.recordDate >= from && l.recordDate <= date)
    .reduce((sum, l) => sum + (readFuelCost(l) ?? 0), 0);
  const paid = livePayments(payments)
    .filter((p) => paymentEmployeeId(p) === employeeId && p.recordDate >= from)
    .reduce((sum, p) => sum + (readAmount(p) ?? 0), 0);
  return spent - paid;
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
