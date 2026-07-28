import type { UnitConversion } from '@/types/product';
import { convertUnit, getItemBaseUnit, getItemUnits } from './unitConversion';

export type OnHandByUnit = Record<string, number>;

export type PackagingAwareItem = {
  unit: string;
  extra?: {
    units?: string[];
    unitConversions?: UnitConversion[];
  };
};

export type PackagingAwareRow = {
  onHand: number;
  extra?: { onHandByUnit?: OnHandByUnit; reservedByUnit?: OnHandByUnit };
};

export function readRowBreakdown(row: PackagingAwareRow, baseUnit: string): OnHandByUnit {
  const existing = row.extra?.onHandByUnit;
  if (existing && Object.keys(existing).length > 0) return { ...existing };
  return row.onHand ? { [baseUnit]: row.onHand } : {};
}

export function readRowReserved(row: PackagingAwareRow): OnHandByUnit {
  const existing = row.extra?.reservedByUnit;
  return existing ? { ...existing } : {};
}

export function verifyOnHandInvariant(
  item: PackagingAwareItem,
  row: PackagingAwareRow,
): number | null {
  const stored = row.extra?.onHandByUnit;
  if (!stored || Object.keys(stored).length === 0) return null;
  const recomputed = recomputeOnHand(item, stored);
  const drift = Math.abs(recomputed - row.onHand);
  return drift > REPACK_BALANCE_TOLERANCE ? drift : null;
}

export function recomputeOnHand(item: PackagingAwareItem, onHandByUnit: OnHandByUnit): number {
  const baseUnit = getItemBaseUnit(item);
  const conversions = item.extra?.unitConversions ?? [];
  let total = 0;
  for (const [unit, qty] of Object.entries(onHandByUnit)) {
    if (!qty) continue;
    const inBase = unit === baseUnit ? qty : convertUnit(qty, unit, baseUnit, conversions);
    if (inBase !== null) total += inBase;
  }
  return total;
}

export function recomputeReserved(item: PackagingAwareItem, reservedByUnit: OnHandByUnit): number {
  return recomputeOnHand(item, reservedByUnit);
}

export function availableByUnit(
  item: PackagingAwareItem,
  onHandByUnit: OnHandByUnit,
  reservedByUnit: OnHandByUnit,
): OnHandByUnit {
  const allowed = new Set(getItemUnits(item));
  const out: OnHandByUnit = {};
  for (const u of allowed) {
    const onHand = onHandByUnit[u] ?? 0;
    const reserved = reservedByUnit[u] ?? 0;
    if (onHand === 0 && reserved === 0) continue;
    out[u] = onHand - reserved;
  }

  for (const u of Object.keys(reservedByUnit)) {
    if (!allowed.has(u)) out[u] = (out[u] ?? 0) - (reservedByUnit[u] ?? 0);
  }
  return out;
}

export function recomputeAvailable(
  item: PackagingAwareItem,
  onHandByUnit: OnHandByUnit,
  reservedByUnit: OnHandByUnit,
): number {
  return recomputeOnHand(item, onHandByUnit) - recomputeReserved(item, reservedByUnit);
}

export type ApplyResult =
  | { ok: true; onHandByUnit: OnHandByUnit; onHand: number }
  | { ok: false; reason: 'unknown-unit'; unit: string }
  | { ok: false; reason: 'negative'; unit: string; wouldBe: number };

export type ApplyDeltaOptions = {
  allowNegative?: boolean;
};

export function applyDelta(
  item: PackagingAwareItem,
  current: OnHandByUnit,
  deltas: Record<string, number>,
  opts: ApplyDeltaOptions = {},
): ApplyResult {
  const allowed = new Set(getItemUnits(item));
  const next: OnHandByUnit = { ...current };

  for (const [unit, delta] of Object.entries(deltas)) {
    if (!allowed.has(unit)) return { ok: false, reason: 'unknown-unit', unit };
    if (delta === 0) continue;
    const nextQty = (next[unit] ?? 0) + delta;
    if (nextQty < 0 && !opts.allowNegative) {
      return { ok: false, reason: 'negative', unit, wouldBe: nextQty };
    }

    if (nextQty === 0) delete next[unit];
    else next[unit] = nextQty;
  }

  return { ok: true, onHandByUnit: next, onHand: recomputeOnHand(item, next) };
}

export type SnapshotResult =
  | { ok: true; onHandByUnit: OnHandByUnit; onHand: number }
  | { ok: false; reason: 'unknown-unit'; unit: string }
  | { ok: false; reason: 'negative'; unit: string; value: number };

export function applySnapshot(item: PackagingAwareItem, snapshot: OnHandByUnit): SnapshotResult {
  const allowed = new Set(getItemUnits(item));
  const next: OnHandByUnit = {};

  for (const [unit, qty] of Object.entries(snapshot)) {
    if (!allowed.has(unit)) return { ok: false, reason: 'unknown-unit', unit };
    if (qty < 0) return { ok: false, reason: 'negative', unit, value: qty };
    if (qty > 0) next[unit] = qty;
  }

  return { ok: true, onHandByUnit: next, onHand: recomputeOnHand(item, next) };
}

export function setUnitSnapshot(
  item: PackagingAwareItem,
  current: OnHandByUnit,
  unit: string,
  value: number,
): SnapshotResult {
  const allowed = new Set(getItemUnits(item));
  if (!allowed.has(unit)) return { ok: false, reason: 'unknown-unit', unit };
  if (value < 0) return { ok: false, reason: 'negative', unit, value };
  const next: OnHandByUnit = { ...current };
  if (value === 0) delete next[unit];
  else next[unit] = value;
  return { ok: true, onHandByUnit: next, onHand: recomputeOnHand(item, next) };
}

export type ReserveResult =
  | { ok: true; reservedByUnit: OnHandByUnit }
  | { ok: false; reason: 'unknown-unit'; unit: string }
  | { ok: false; reason: 'negative'; unit: string; wouldBe: number };

export function applyReserve(
  item: PackagingAwareItem,
  current: OnHandByUnit,
  deltas: OnHandByUnit,
): ReserveResult {
  const allowed = new Set(getItemUnits(item));
  const next: OnHandByUnit = { ...current };
  for (const [unit, qty] of Object.entries(deltas)) {
    if (!allowed.has(unit)) return { ok: false, reason: 'unknown-unit', unit };
    if (qty < 0) return { ok: false, reason: 'negative', unit, wouldBe: qty };
    if (qty === 0) continue;
    next[unit] = (next[unit] ?? 0) + qty;
  }
  return { ok: true, reservedByUnit: next };
}

export function applyRelease(
  item: PackagingAwareItem,
  current: OnHandByUnit,
  deltas: OnHandByUnit,
): ReserveResult {
  const allowed = new Set(getItemUnits(item));
  const next: OnHandByUnit = { ...current };
  for (const [unit, qty] of Object.entries(deltas)) {
    if (!allowed.has(unit)) return { ok: false, reason: 'unknown-unit', unit };
    if (qty < 0) return { ok: false, reason: 'negative', unit, wouldBe: qty };
    if (qty === 0) continue;
    const after = (next[unit] ?? 0) - qty;
    if (after < -REPACK_BALANCE_TOLERANCE) {
      return { ok: false, reason: 'negative', unit, wouldBe: after };
    }
    if (Math.abs(after) <= REPACK_BALANCE_TOLERANCE) delete next[unit];
    else next[unit] = after;
  }
  return { ok: true, reservedByUnit: next };
}

export type ShipResult =
  | {
      ok: true;
      onHandByUnit: OnHandByUnit;
      reservedByUnit: OnHandByUnit;
      onHand: number;
    }
  | { ok: false; reason: 'unknown-unit'; unit: string }
  | { ok: false; reason: 'negative'; unit: string; wouldBe: number }
  | { ok: false; reason: 'reservation-mismatch'; unit: string; wouldBe: number };

export function applyShip(
  item: PackagingAwareItem,
  current: { onHandByUnit: OnHandByUnit; reservedByUnit: OnHandByUnit },
  deltas: OnHandByUnit,
): ShipResult {
  const allowed = new Set(getItemUnits(item));
  const onHandNext: OnHandByUnit = { ...current.onHandByUnit };
  const reservedNext: OnHandByUnit = { ...current.reservedByUnit };
  for (const [unit, qty] of Object.entries(deltas)) {
    if (!allowed.has(unit)) return { ok: false, reason: 'unknown-unit', unit };
    if (qty < 0) return { ok: false, reason: 'negative', unit, wouldBe: qty };
    if (qty === 0) continue;
    const onHandAfter = (onHandNext[unit] ?? 0) - qty;
    const reservedAfter = (reservedNext[unit] ?? 0) - qty;
    if (reservedAfter < -REPACK_BALANCE_TOLERANCE) {
      return { ok: false, reason: 'reservation-mismatch', unit, wouldBe: reservedAfter };
    }

    if (onHandAfter === 0) delete onHandNext[unit];
    else onHandNext[unit] = onHandAfter;
    if (Math.abs(reservedAfter) <= REPACK_BALANCE_TOLERANCE) delete reservedNext[unit];
    else reservedNext[unit] = reservedAfter;
  }
  return {
    ok: true,
    onHandByUnit: onHandNext,
    reservedByUnit: reservedNext,
    onHand: recomputeOnHand(item, onHandNext),
  };
}

export function applyRepack(
  item: PackagingAwareItem,
  current: OnHandByUnit,
  op: RepackOp,
): ApplyResult {
  const deltas: Record<string, number> = {
    [op.from.unit]: -op.from.qty,
    [op.to.unit]: op.to.qty,
  };
  return applyDelta(item, current, deltas);
}

export type RepackOp = {
  from: { unit: string; qty: number };
  to: { unit: string; qty: number };

  writeOff?: { baseQty: number; reason: string };
};

export type RepackValidation = { ok: true } | { ok: false; reason: string };

export const REPACK_BALANCE_TOLERANCE = 1e-6;

export function validateRepack(item: PackagingAwareItem, op: RepackOp): RepackValidation {
  const { from, to, writeOff } = op;
  const allowed = new Set(getItemUnits(item));

  if (!allowed.has(from.unit)) {
    return { ok: false, reason: `Unit '${from.unit}' is not on this item` };
  }
  if (!allowed.has(to.unit)) {
    return { ok: false, reason: `Unit '${to.unit}' is not on this item` };
  }
  if (from.unit === to.unit) {
    return {
      ok: false,
      reason: `Source and destination units must differ — use Adjust to change quantity of '${from.unit}'`,
    };
  }
  if (from.qty <= 0) {
    return { ok: false, reason: `'From' quantity must be positive (got ${from.qty})` };
  }
  if (to.qty <= 0) {
    return { ok: false, reason: `'To' quantity must be positive (got ${to.qty})` };
  }
  if (writeOff && writeOff.baseQty < 0) {
    return { ok: false, reason: `Write-off quantity cannot be negative` };
  }

  const baseUnit = getItemBaseUnit(item);
  const conversions = item.extra?.unitConversions ?? [];
  const fromInBase = convertUnit(from.qty, from.unit, baseUnit, conversions);
  const toInBase = convertUnit(to.qty, to.unit, baseUnit, conversions);

  if (fromInBase === null) {
    return {
      ok: false,
      reason: `No conversion path from '${from.unit}' to base unit '${baseUnit}'`,
    };
  }
  if (toInBase === null) {
    return { ok: false, reason: `No conversion path from '${to.unit}' to base unit '${baseUnit}'` };
  }

  const writeOffBase = writeOff?.baseQty ?? 0;
  const imbalance = fromInBase - toInBase - writeOffBase;

  if (Math.abs(imbalance) > REPACK_BALANCE_TOLERANCE) {
    return {
      ok: false,
      reason:
        `Repack unbalanced by ${imbalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${baseUnit}. ` +
        `From: ${from.qty} ${from.unit} (= ${fromInBase} ${baseUnit}); ` +
        `To: ${to.qty} ${to.unit} (= ${toInBase} ${baseUnit})` +
        (writeOffBase ? `; Write-off: ${writeOffBase} ${baseUnit}` : ''),
    };
  }

  return { ok: true };
}
