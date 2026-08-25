import { useEffect, useMemo } from 'react';

import { useProductStore } from '@/stores/useProductStore';
import { hasImagesForProducts } from '@/utils/permission';

const imagesEnabled = hasImagesForProducts();

export function useProductPhotoByCode(): ReadonlyMap<string, string> {
  const products = useProductStore((s) => s.items);
  const initialized = useProductStore((s) => s.initialized);
  const loadProducts = useProductStore((s) => s.loadAll);

  useEffect(() => {
    if (imagesEnabled && !initialized) loadProducts();
  }, [initialized, loadProducts]);

  return useMemo(() => {
    const m = new Map<string, string>();
    if (!imagesEnabled) return m;
    for (const p of products) {
      const url = p.extra?.images?.[0]?.url?.trim();
      if (url) m.set(p.code, url);
    }
    return m;
  }, [products]);
}
