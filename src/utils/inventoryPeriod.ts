/**
 * Begin-of-period bookkeeping for inventory rows.
 *
 * Each row carries `extra.beginOfPeriod` — a `{ [YYYYMM]: number }` map of
 * on-hand at the start of each calendar month, in **UTC+7** (the operating
 * timezone). Periods are append-only: once a month's snapshot is taken, it
 * stays put. The current period gets seeded on first load; past periods are
 * never modified by the seed sweep.
 *
 * On load each store-page calls the seed helper, which iterates rows where
 * the current period's entry is missing and calls `updateSafely` to persist
 * `{ ...existing, [periodKey]: row.onHand }`. The sweep is session-guarded
 * (one run per period), so a month rollover during a session re-triggers it
 * for the new period — but a normal page reload inside the same month skips
 * the per-row write loop.
 *
 * Excel import is current-period-only — the parser surfaces one column,
 * the bulk-upsert payload sets `extra.beginOfPeriod = { [periodKey]: value }`,
 * and past-period entries on the existing row are wiped (the documented
 * overwrite semantics of `importBatch*Inventory`). See
 * `docs/memo/modules/inventory.md` → "Begin of period".
 */

import { logger } from '@credo/base-ui/utils';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import type { ProductInventoryExtra, ProductInventoryRow } from '@/types';
import { getCurrentPeriodKey } from './periodKey';

// Re-exported so callers have a single import surface for begin-of-period
// logic. The implementation lives in `periodKey.ts` (pure, no store deps) so
// unit tests can import it without dragging in the connector layer.
export { getCurrentPeriodKey } from './periodKey';

/**
 * Read the begin-of-period value for a given period key (or the current one).
 * Returns `undefined` when the row hasn't been seeded for that period yet.
 * Zero is a valid stored value and is returned as-is.
 */
export const getBeginOfPeriodValue = (
  extra: { beginOfPeriod?: Record<string, number> } | undefined,
  periodKey: string = getCurrentPeriodKey(),
): number | undefined => extra?.beginOfPeriod?.[periodKey];

// ---------------------------------------------------------------------------
// Seed sweep
// ---------------------------------------------------------------------------

/**
 * Per-period guards. We track separately per store so a slow product-store
 * sweep doesn't gate the material-store one (or vice versa). The value is
 * the period key the sweep was last run for — re-runs are skipped within
 * the same period, and a month rollover naturally re-triggers.
 */
let lastSeededProductPeriod: string | null = null;

type Patch<TExtra> = { onHand?: number; extra?: TExtra; version?: string };

const seedRows = async <
  TRow extends {
    id: string;
    version: string;
    onHand: number;
    extra?: { beginOfPeriod?: Record<string, number> };
  },
  TExtra,
>(
  rows: ReadonlyArray<TRow>,
  periodKey: string,
  updateSafely: (args: {
    id: string;
    version: string;
    patch: Omit<Patch<TExtra>, 'version'>;
  }) => Promise<TRow>,
  kindLabel: string,
): Promise<void> => {
  // Snapshot first so a parallel updateSafely (e.g. a modal mid-flow) doesn't
  // make us double-process a row. Rows updated between snapshot + write will
  // throw `EntityConflictError`; we just log and move on.
  const targets = rows.filter((r) => r.extra?.beginOfPeriod?.[periodKey] === undefined);
  for (const row of targets) {
    try {
      const nextExtra = {
        ...(row.extra ?? {}),
        beginOfPeriod: {
          ...(row.extra?.beginOfPeriod ?? {}),
          [periodKey]: row.onHand,
        },
      } as TExtra;
      await updateSafely({
        id: row.id,
        version: row.version,
        patch: { extra: nextExtra },
      });
    } catch (err) {
      // A conflict here means another writer touched this row between
      // snapshot and write — they likely already wrote (or will write) the
      // current-period entry via the normal update path. Logging is enough.
      logger.warn(`[beginOfPeriod] ${kindLabel} seed failed for ${row.id}`, err);
    }
  }
};

/**
 * Sweep the product inventory store, persisting a `beginOfPeriod` entry for
 * the current month on every row that doesn't have one yet. Idempotent
 * within a period — safe to call multiple times. Caller must ensure the
 * store is initialized first (the list page's existing `loadAll` does this).
 */
export const seedCurrentPeriodForProductInventory = async (): Promise<void> => {
  const periodKey = getCurrentPeriodKey();
  if (lastSeededProductPeriod === periodKey) return;
  lastSeededProductPeriod = periodKey;

  const store = useProductInventoryStore.getState();
  if (!store.initialized) return;
  await seedRows<ProductInventoryRow, ProductInventoryExtra>(
    store.items,
    periodKey,
    store.updateSafely,
    'product',
  );
};

/**
 * Test-only: reset the per-period guard so a unit test can re-run the seed.
 * Production code should never call this — the guard is intentional.
 */
export const __resetSeedGuardsForTests = (): void => {
  lastSeededProductPeriod = null;
};
