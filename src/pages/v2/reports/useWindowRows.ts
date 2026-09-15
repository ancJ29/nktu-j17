import { useCallback, useEffect, useRef, useState } from 'react';

export type ReportReloadMode = 'update' | 'regenerate';

export function useWindowRows<T>(
  fetchWindow: (fromDay: string, toDay: string, options?: { fresh?: boolean }) => Promise<T[]>,
  fromDay: string,
  toDay: string,
): {
  rows?: T[];
  error?: boolean;

  loadedAt?: number;

  refreshing: boolean;
  reload: (mode: ReportReloadMode) => void;
} {
  const [state, setState] = useState<{
    key: string;
    run: number;
    rows?: T[];
    error?: true;
    loadedAt: number;
  } | null>(null);
  const [run, setRun] = useState(0);

  const freshRef = useRef(false);

  const reload = useCallback((mode: ReportReloadMode) => {
    freshRef.current = mode === 'regenerate';
    if (mode === 'regenerate') setState(null);
    setRun((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    const fresh = freshRef.current;
    freshRef.current = false;
    const key = `${fromDay}:${toDay}`;
    void (async () => {
      try {
        const rows = await fetchWindow(fromDay, toDay, fresh ? { fresh: true } : undefined);
        if (alive) setState({ key, run, rows, loadedAt: Date.now() });
      } catch {
        if (alive) setState({ key, run, error: true, loadedAt: Date.now() });
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchWindow, fromDay, toDay, run]);

  if (!state || state.key !== `${fromDay}:${toDay}`) return { refreshing: false, reload };
  const refreshing = state.run !== run;
  return state.error
    ? { error: true, loadedAt: state.loadedAt, refreshing, reload }
    : { rows: state.rows, loadedAt: state.loadedAt, refreshing, reload };
}
