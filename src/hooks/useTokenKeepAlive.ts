import { useEffect } from 'react';
import { logger } from '@credo/base-ui/utils';
import { useAuthStore } from '@/stores/useAuthStore';

export const TOKEN_KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000;

export function useTokenKeepAlive(intervalMs = TOKEN_KEEP_ALIVE_INTERVAL_MS): void {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    let disposed = false;

    const topUp = (trigger: string) => {
      void useAuthStore
        .getState()
        .checkAndRefreshToken()
        .then((outcome) => {
          if (disposed) return;

          if (outcome !== 'valid') logger.debug('Token keep-alive', { trigger, outcome });
        })
        .catch((error: unknown) => {
          logger.warn('Token keep-alive failed', { trigger, error });
        });
    };

    const id = setInterval(() => topUp('interval'), intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') topUp('visible');
    };
    const onOnline = () => topUp('online');

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      disposed = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [token, intervalMs]);
}
