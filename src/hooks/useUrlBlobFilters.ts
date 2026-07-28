import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { createListFilterCache } from '@/utils/listFilterCache';
import { URL_KEY, decodeFilterBlob, encodeFilterBlob, urlUpdate } from '@/hooks/useUrlFilterState';

export type UrlBlobFiltersOptions<TState extends object> = {
  cacheKey: string;

  compactState: (state: TState) => TState;
};

export type UrlBlobFilters<TState extends object> = {
  state: TState;

  updateState: (patch: Partial<TState>) => void;

  clearFilters: () => void;
};

export function useUrlBlobFilters<TState extends object>(
  opts: UrlBlobFiltersOptions<TState>,
): UrlBlobFilters<TState> {
  const { cacheKey, compactState } = opts;
  const [params, setParams] = useSearchParams();

  const [resetCount, setResetCount] = useState(0);

  const filterCache = useMemo(() => createListFilterCache<TState>(cacheKey), [cacheKey]);

  const state = useMemo<TState>(() => {
    const fromUrl = decodeFilterBlob<TState>(params.get(URL_KEY));
    if (fromUrl) return fromUrl;
    return filterCache.read() ?? ({} as TState);
    // `resetCount` forces a re-read after a cache-only clear (see clearFilters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, filterCache, resetCount]);

  const updateState = useCallback(
    (patch: Partial<TState>) => {
      const urlHadBlob = params.has(URL_KEY);
      let clearedToEmpty = false;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const fromUrl = decodeFilterBlob<TState>(next.get(URL_KEY));
          const current = fromUrl ?? filterCache.read() ?? ({} as TState);
          const merged = compactState({ ...current, ...patch });
          if (Object.keys(merged).length === 0) {
            next.delete(URL_KEY);
            filterCache.clear();
            clearedToEmpty = true;
          } else {
            next.set(URL_KEY, encodeFilterBlob(merged));
          }
          return next;
        },
        { replace: true },
      );
      if (clearedToEmpty && !urlHadBlob) {
        setResetCount((c) => c + 1);
      }
    },
    [setParams, filterCache, compactState, params],
  );

  useEffect(() => {
    filterCache.write(compactState(state));
  }, [state, filterCache, compactState]);

  const clearFilters = useCallback(() => {
    const urlHadBlob = params.has(URL_KEY);
    urlUpdate(setParams, (next) => {
      next.delete(URL_KEY);
    });
    filterCache.clear();
    if (!urlHadBlob) {
      setResetCount((c) => c + 1);
    }
  }, [setParams, filterCache, params]);

  return { state, updateState, clearFilters };
}
