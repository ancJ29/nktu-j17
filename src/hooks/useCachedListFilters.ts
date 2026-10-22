

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { createListFilterCache } from '@/utils/listFilterCache';
import { URL_KEY, decodeFilterBlob, encodeFilterBlob, urlUpdate } from '@/hooks/useUrlFilterState';

function compactAgainstDefaults<T extends object>(state: T, defaults: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(state) as (keyof T)[]) {
    if (!Object.is(state[key], defaults[key])) result[key] = state[key];
  }
  return result;
}

function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export function useCachedListFilters<T extends object>(
  cacheKey: string,
  defaults: T,
): {
  state: T;
  
  updateState: (next: Partial<T>) => void;
  
  clearFilters: () => void;
  
  hasActiveFilters: boolean;
} {
  const cache = useMemo(() => createListFilterCache<Partial<T>>(cacheKey), [cacheKey]);
  const [params, setParams] = useSearchParams();

  
  
  
  
  
  
  
  
  
  
  
  const [resetCount, setResetCount] = useState(0);

  const state = useMemo<T>(() => {
    const fromUrl = decodeFilterBlob<Partial<T>>(params.get(URL_KEY));
    if (fromUrl) return { ...defaults, ...fromUrl };
    const fromCache = cache.read();
    if (fromCache) return { ...defaults, ...fromCache };
    return defaults;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, cache, defaults, resetCount]);

  const compactState = compactAgainstDefaults(state, defaults);
  const hasActiveFilters = !isEmpty(compactState);

  
  
  
  useEffect(() => {
    cache.write(compactState);
    // `compactState` is recomputed each render but the cache.write is cheap
    // and short-circuits to `removeItem` on the empty case. Depending on
    // `state` keeps the dep simple and stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, defaults, cache]);

  const updateState = useCallback(
    (next: Partial<T>) => {
      
      const urlHadBlob = params.has(URL_KEY);
      let clearedToEmpty = false;
      setParams(
        (prev) => {
          const url = new URLSearchParams(prev);
          const fromUrl = decodeFilterBlob<Partial<T>>(url.get(URL_KEY));
          const baseline: T = fromUrl
            ? { ...defaults, ...fromUrl }
            : { ...defaults, ...(cache.read() ?? {}) };
          const merged = { ...baseline, ...next };
          const compact = compactAgainstDefaults(merged, defaults);
          if (isEmpty(compact)) {
            url.delete(URL_KEY);
            cache.clear();
            clearedToEmpty = true;
          } else {
            url.set(URL_KEY, encodeFilterBlob(compact));
          }
          return url;
        },
        { replace: true },
      );
      if (clearedToEmpty && !urlHadBlob) {
        
        
        
        
        
        
        
        
        
        setResetCount((c) => c + 1);
      }
    },
    [setParams, defaults, cache, params],
  );

  const clearFilters = useCallback(() => {
    
    
    const urlHadBlob = params.has(URL_KEY);
    cache.clear();
    urlUpdate(setParams, (url) => url.delete(URL_KEY));
    if (!urlHadBlob) {
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      setResetCount((c) => c + 1);
    }
  }, [setParams, cache, params]);

  return { state, updateState, clearFilters, hasActiveFilters };
}
