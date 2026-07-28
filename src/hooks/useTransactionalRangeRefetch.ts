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
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    setStoreRange(range.from, range.to);
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;

      return;
    }
    forceRefresh();
  }, [range.from, range.to, setStoreRange, forceRefresh]);
}
