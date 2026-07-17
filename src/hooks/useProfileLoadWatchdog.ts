

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { logger } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';

export const PROFILE_LOAD_WATCHDOG_MS = 20000;

export function useProfileLoadWatchdog(timeoutMs = PROFILE_LOAD_WATCHDOG_MS): void {
  const token = useAuthStore((s) => s.token);
  const isProfileLoaded = useAuthStore((s) => s.isProfileLoaded);
  const navigate = useNavigate();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!token || isProfileLoaded || firedRef.current) return;
    const id = setTimeout(() => {
      firedRef.current = true;
      logger.error('Profile load watchdog fired — profile never loaded; redirecting to logout');
      navigate(ROUTES.AUTH.LOGOUT, { replace: true });
    }, timeoutMs);
    return () => clearTimeout(id);
  }, [token, isProfileLoaded, navigate, timeoutMs]);
}
