/**
 * One partitioned record, fetched by id — the deep-link read every v2
 * transactional detail page opens with.
 *
 * Two rules it exists to keep, both of which a hand-written copy has lost
 * before:
 *
 * **`loading` is DERIVED, never its own flag.** A `setLoading(true)` inside
 * the effect is the cascading-render pattern `react-hooks` refuses — and
 * rightly: it renders once to say "loading" before the fetch it is loading for
 * has even been issued. Comparing the id the state describes against the id
 * asked for says the same thing without the extra render, and says it
 * correctly when the id changes under a mounted page.
 *
 * **The `live` flag guards every branch.** A page navigated away from
 * mid-fetch must not write state, and `loadedId` is stamped LAST — it is what
 * turns `loading` off, so the row has to already be in state when it lands.
 */

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function useRecordById<T>(
  id: string | undefined,
  fetchById: (id: string) => Promise<{ item: T; day: string }>,
): {
  record: T | null;
  /** For a write's answer — the pages patch in place rather than refetching. */
  setRecord: Dispatch<SetStateAction<T | null>>;
  /** The partition day the record landed in; every write needs it. */
  day: string;
  loading: boolean;
} {
  const [record, setRecord] = useState<T | null>(null);
  const [day, setDay] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    fetchById(id)
      .then((found) => {
        if (!live) return;
        setRecord(found.item);
        setDay(found.day);
      })
      .catch(() => {
        if (live) setRecord(null);
      })
      .finally(() => {
        if (live) setLoadedId(id);
      });
    return () => {
      live = false;
    };
    // `fetchById` is in the deps rather than silenced: every caller passes a
    // module-level connector call, so it is stable by construction and this
    // costs nothing. A page that ever inlines one would re-fetch every render
    // — and should be told so by the rule rather than by a support ticket.
  }, [id, fetchById]);

  return { record, setRecord, day, loading: loadedId !== id };
}
