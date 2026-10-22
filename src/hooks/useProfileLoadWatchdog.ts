import { useEffect, useRef } from 'react';
import { logger } from '@credo/base-ui/utils';
import { isSignedIn, useAuthStore } from '@/stores/useAuthStore';

export const PROFILE_LOAD_WATCHDOG_MS = 20000;

export function useProfileLoadWatchdog(timeoutMs = PROFILE_LOAD_WATCHDOG_MS): void {
  const signedIn = isSignedIn();
  const isProfileLoaded = useAuthStore((s) => s.isProfileLoaded);
  const retriedRef = useRef(false);
  const releasedRef = useRef(false);

  useEffect(() => {
    if (!signedIn || isProfileLoaded || releasedRef.current) return;

    const retryId = retriedRef.current
      ? undefined
      : setTimeout(() => {
          retriedRef.current = true;
          logger.warn('Profile load watchdog: retrying loadProfile');
          void useAuthStore
            .getState()
            .loadProfile()
            .catch((error: unknown) => {
              logger.warn('Profile load watchdog: retry failed', error);
            });
        }, timeoutMs);

    const releaseId = setTimeout(() => {
      if (useAuthStore.getState().isProfileLoaded) return;
      releasedRef.current = true;
      logger.error(
        'Profile load watchdog: profile never loaded; releasing the boot gate and ' +
          'continuing on the persisted/JWT identity',
      );
      useAuthStore.setState({ isProfileLoaded: true });
    }, timeoutMs * 2);

    return () => {
      if (retryId !== undefined) clearTimeout(retryId);
      clearTimeout(releaseId);
    };
  }, [signedIn, isProfileLoaded, timeoutMs]);
}
