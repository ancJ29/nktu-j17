import { useEffect, useRef } from 'react';
import type { DateRangeValue } from '@/types/date-range';

export type TransactionalRangeRefetchOptions = {
  range: DateRangeValue;
  setStoreRange: (from: Date | null, to: Date | null) => void;
  forceRefresh: () => void;
};

export function useTransactionalRangeRefetch({
  range,
  setStoreRange,
  forceRefresh,
}: TransactionalRangeRefetchOptions): void {
  const prevRangeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setStoreRange(range.from, range.to);

    const rangeKey = JSON.stringify([range.from?.getTime() ?? null, range.to?.getTime() ?? null]);
    const previous = prevRangeKeyRef.current;
    prevRangeKeyRef.current = rangeKey;

    if (previous === null || previous === rangeKey) return;

    forceRefresh();
  }, [range.from, range.to, setStoreRange, forceRefresh]);
}
