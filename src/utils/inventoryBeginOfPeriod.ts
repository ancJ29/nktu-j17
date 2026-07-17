/**
 * Begin-of-period adjustment math (NKTU client).
 *
 * NKTU runs period-based inventory: each row carries an opening-stock figure
 * for the current month (`extra.beginOfPeriod[YYYYMM]`, see `inventoryPeriod.ts`).
 * The begin-of-period modal lets an operator restate that opening figure either
 * as an absolute value (snapshot) or a signed adjustment (delta) — and the same
 * change flows into current on-hand.
 *
 * Both modes collapse to a single base-unit `delta` applied to BOTH the
 * begin-of-period figure and current on-hand:
 *   - delta mode:    delta = value;            nextBegin = oldBegin + value
 *   - snapshot mode: delta = value − oldBegin; nextBegin = value
 *
 * `oldBegin` is the row's current begin-of-period entry, or — for an unseeded
 * row / brand-new product — its current on-hand (an unseeded row's opening
 * equals its on-hand, matching the seed sweep). So a snapshot of X sets both
 * begin and on-hand to X for a fresh row, and a delta of N moves both by N.
 *
 * Pure + dependency-free so the modal stays thin and the math is unit-tested in
 * isolation (mirrors `periodKey.ts`).
 */

export type BeginOfPeriodMode = 'snapshot' | 'delta';

/**
 * Resolve the begin-of-period change from the operator's input.
 *
 * @param mode     'snapshot' (value is the absolute new opening figure) or
 *                 'delta' (value is a signed adjustment).
 * @param value    The number the operator typed.
 * @param oldBegin The row's current begin-of-period figure for the period
 *                 (fall back to current on-hand for an unseeded/new row).
 * @returns `delta` — the base-unit change to apply to current on-hand — and
 *          `nextBegin` — the resulting begin-of-period figure.
 */
export function computeBeginOfPeriodChange(args: {
  mode: BeginOfPeriodMode;
  value: number;
  oldBegin: number;
}): { nextBegin: number; delta: number } {
  const { mode, value, oldBegin } = args;
  if (mode === 'delta') {
    return { delta: value, nextBegin: oldBegin + value };
  }
  return { delta: value - oldBegin, nextBegin: value };
}
