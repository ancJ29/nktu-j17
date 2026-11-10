import { useCallback, useEffect, useState } from 'react';

export type WindowLoad = {
  readonly range: { readonly from: Date | null; readonly to: Date | null };
  readonly setStoreRange: (from: Date | null, to: Date | null) => void;
  readonly forceRefresh: () => Promise<void> | void;
};

export type WindowLoadState = {
  readonly ready: boolean;

  readonly rejected: boolean;

  readonly retry: () => void;
};

export function usePaymentsWindowLoad({
  range,
  setStoreRange,
  forceRefresh,
}: WindowLoad): WindowLoadState {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ attempt: number; rejected: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    setStoreRange(range.from, range.to);
    void Promise.resolve()
      .then(() => forceRefresh())
      .then(
        () => live && setSettled({ attempt, rejected: false }),
        () => live && setSettled({ attempt, rejected: true }),
      );
    return () => {
      live = false;
    };
    // The window is fixed for the life of the tab; the store functions are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((n) => n + 1);
  }, []);
  return {
    ready: settled?.attempt === attempt,
    rejected: settled?.attempt === attempt && settled.rejected,
    retry,
  };
}

export function createdInWindow<T extends { createdAt?: unknown }>(
  items: readonly T[],
  range: { readonly from: Date | null; readonly to: Date | null },
): T[] {
  const from = range.from?.getTime() ?? -Infinity;
  const to = range.to?.getTime() ?? Infinity;
  return items.filter((o) => {
    const t = typeof o.createdAt === 'string' ? Date.parse(o.createdAt) : NaN;
    return Number.isNaN(t) || (t >= from && t < to);
  });
}
