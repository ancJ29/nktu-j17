import { useEffect } from 'react';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { isProductInventoryEnabled } from '@/utils/permission';

const inventoryEnabled = isProductInventoryEnabled();
const POLL_INTERVAL_MS = 30_000;

function revalidateBoth(): void {
  void useProductInventoryStore.getState().revalidate();
}

export function useInventoryAutoRevalidate(): void {
  useEffect(() => {
    if (!inventoryEnabled) {
      return;
    }

    function tick(): void {
      if (typeof document !== 'undefined' && document.hidden) return;
      revalidateBoth();
    }

    const intervalId = setInterval(tick, POLL_INTERVAL_MS);

    function onVisibilityChange(): void {
      if (typeof document !== 'undefined' && !document.hidden) {
        revalidateBoth();
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, []);
}
