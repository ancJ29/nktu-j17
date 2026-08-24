import { useCallback, useEffect, useState } from 'react';
import type { ActivityLoggerActivityEntity } from '@credo/connectors/types';

type ActivityPage = {
  activities: ActivityLoggerActivityEntity[];
  nextCursor?: string | undefined;
};

export type ActivityPageFetcher = (cursor?: string) => Promise<ActivityPage>;

type Position = { source: number; cursor?: string | undefined };

function merge(
  prev: ActivityLoggerActivityEntity[],
  incoming: ActivityLoggerActivityEntity[],
): ActivityLoggerActivityEntity[] {
  const seen = new Set(prev.map((entry) => entry.id));
  const merged = [...prev, ...incoming.filter((entry) => !seen.has(entry.id))];
  return merged.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));
}

export function useActivityHistory(fetchers: ActivityPageFetcher[]) {
  const [entries, setEntries] = useState<ActivityLoggerActivityEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState<Position>({ source: 0 });

  const hasMore = position.source < fetchers.length;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);
    setEntries([]);
    setPosition({ source: 0 });

    (async () => {
      let pos: Position = { source: 0 };
      let acc: ActivityLoggerActivityEntity[] = [];

      while (pos.source < fetchers.length && acc.length === 0) {
        const fetch = fetchers[pos.source];
        if (!fetch) break;
        try {
          const page = await fetch(pos.cursor);
          acc = merge(acc, page.activities);
          pos = page.nextCursor
            ? { source: pos.source, cursor: page.nextCursor }
            : { source: pos.source + 1 };
        } catch {
          if (!cancelled) setError(true);
          pos = { source: pos.source + 1 };
        }
      }
      if (cancelled) return;
      setEntries(acc);
      setPosition(pos);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchers]);

  const loadMore = useCallback(() => {
    const fetch = fetchers[position.source];
    if (!fetch || loading || loadingMore) return;
    setLoadingMore(true);
    fetch(position.cursor)
      .then((page) => {
        setEntries((prev) => merge(prev, page.activities));
        setPosition(
          page.nextCursor
            ? { source: position.source, cursor: page.nextCursor }
            : { source: position.source + 1 },
        );
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoadingMore(false));
  }, [fetchers, position, loading, loadingMore]);

  return { entries, loading, loadingMore, error, hasMore, loadMore };
}
