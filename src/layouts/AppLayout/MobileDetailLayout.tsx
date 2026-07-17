import { ROUTES } from '@/constants/routes';
import { themeConfig } from '@/config';
import { useCurrentEmployee, useLanguageSync } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { cacheFlush } from '@/utils/appCache';
import { reloadPage } from '@credo/base-ui/utils';
import { EmployeeReadyGate } from './EmployeeReadyGate';
import {
  LoadingFallback,
  MobileDetailLayout as MobileDetailLayoutUI,
} from '@credo/base-ui/components';
import type { DetailNavAction } from '@credo/base-ui/components';
import { Container } from '@mantine/core';
import { Suspense, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useMatches } from 'react-router';

type RouteHandle = {
  detailNav?: (t: (key: string) => string) => DetailNavAction[];
};

export function MobileDetailLayout() {
  const { t } = useTranslation();
  const { token, user, loadProfile, isProfileLoaded } = useAuthStore();
  const matches = useMatches();

  useLanguageSync({ isProfileLoaded });
  useCurrentEmployee({ isProfileLoaded, email: user?.email, token });

  const handleMount = useCallback(() => {
    if (token && !isProfileLoaded) {
      loadProfile();
    }
  }, [token, isProfileLoaded, loadProfile]);

  
  const handleRefresh = useCallback(() => {
    cacheFlush();
    reloadPage('manual refresh');
  }, []);

  
  const navActions = (() => {
    for (let i = matches.length - 1; i >= 0; i--) {
      const handle = matches[i].handle as RouteHandle | undefined;
      if (handle?.detailNav) {
        
        return handle.detailNav((key: string) => t(key as any));
      }
    }
    return undefined;
  })();

  return (
    <MobileDetailLayoutUI
      mainColor={themeConfig.mainColor}
      isAuthenticated={!!token}
      isProfileLoaded={isProfileLoaded}
      loginPath={ROUTES.AUTH.LOGIN}
      homePath={ROUTES.APP.MAIN}
      navActions={navActions}
      onMount={handleMount}
      onRefresh={handleRefresh}
    >
      <Suspense fallback={<LoadingFallback fullScreen />}>
        <Container fluid p="xs">
          <EmployeeReadyGate>
            <Outlet />
          </EmployeeReadyGate>
        </Container>
      </Suspense>
    </MobileDetailLayoutUI>
  );
}
