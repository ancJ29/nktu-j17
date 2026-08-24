/**
 * Seeding the single-leg QUÃNG ĐƯỜNG TỪNG ĐOẠN table from the TUYẾN DỊCH VỤ
 * stops (2026-08-24, user's ask).
 *
 * A SEED, deliberately not a mirror. On the multi-leg shape the legs ARE the
 * measured stretches, so `buildTransportRouteWrite` derives `segments` outright
 * and the standalone table is gone. On the single-leg shape that identity does
 * not hold — the client's own worked example measures the single run "Bãi xe →
 * Cảng → Bến Lức" in more stretches than its three named stops (the driving
 * starts at the yard, not at Nơi lấy) — so the table stays free-form and the
 * stops are only offered as a STARTING POINT for the common case where they are
 * the run.
 *
 * What makes the offer safe is the echo rule: the table is rewritten only while
 * it is still a pure echo of the stops — every row seed-shaped, no km typed, no
 * row added. The moment the operator authors anything there, the table is
 * theirs and no stop edit touches it again. Same only-while-untouched idiom as
 * the fee-name and shipment-type re-seeds: a lookup (here: a stop) arriving
 * later never discards something the operator said.
 *
 * Pure (no store, no React) — the same pure/bound split as `placeSuggestions`;
 * the form owns the two `setFieldValue` calls.
 */
import type { TransportRouteSegment } from '@/types';

export type RouteStopValues = {
  pickup: string;
  stuffing: string;
  dropoff: string;
};

const blankRow = (): TransportRouteSegment => ({ from: '', to: '', distanceKm: 0 });

/**
 * One segment per consecutive pair of typed stops — pickup → stuffing →
 * dropoff, skipping the ones still blank, so the table grows stop by stop as
 * the operator types. Values are echoed RAW (untrimmed): the row must read
 * exactly as the field above it does, and the write builder owns trimming.
 *
 * No stops (or one) still yields a single row, so the table keeps its
 * one-empty-row convention and clearing the stops returns it to blank.
 */
export function seedSegmentsFromStops(stops: RouteStopValues): TransportRouteSegment[] {
  const places = [stops.pickup, stops.stuffing, stops.dropoff].filter((p) => p.trim());
  if (places.length < 2) return [{ ...blankRow(), from: places[0] ?? '' }];
  return places.slice(0, -1).map((from, i) => ({ from, to: places[i + 1]!, distanceKm: 0 }));
}

/**
 * Is the table still a pure echo of these stops — the seed they produce, or the
 * pristine blank row — with no distance typed anywhere?
 *
 * `distanceKm` is read through `|| 0` because a cleared `NumberInput` holds
 * `''`, and an emptied field is not an authored measurement.
 */
export function segmentsAreStopEcho(
  segments: readonly TransportRouteSegment[],
  stops: RouteStopValues,
): boolean {
  const matches = (seed: TransportRouteSegment[]) =>
    segments.length === seed.length &&
    seed.every(
      (row, i) =>
        segments[i]!.from === row.from &&
        segments[i]!.to === row.to &&
        (segments[i]!.distanceKm || 0) === 0,
    );
  return matches(seedSegmentsFromStops(stops)) || matches([blankRow()]);
}
