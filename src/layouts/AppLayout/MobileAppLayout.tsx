import { appConfig, featureFlags, forceRefreshConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useCurrentEmployee, useLanguageSync } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { cacheFlush } from '@/utils/appCache';
import { EmployeeReadyGate } from './EmployeeReadyGate';
import { LoadingFallback, MobileAppLayout as MobileAppLayoutUI } from '@credo/base-ui/components';
import type { CredoNavigationItem } from '@credo/base-ui/types';
import type { NavigationItem } from '@/types';
import { stripRootOnlyNavItems } from '@/config/navigation';
import { Container } from '@mantine/core';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { reloadPage } from '@credo/base-ui/utils';
import { showRefreshConfig } from '@/config/menu-access';
import { useClearCacheConfirm } from '@/hooks/useClearCacheConfirm';

export function MobileAppLayout() {
  const { t, i18n } = useTranslation();
  const { token, user, loadProfile, saveProfile, isProfileLoaded } = useAuthStore();

  
  useLanguageSync({ isProfileLoaded });
  useCurrentEmployee({ isProfileLoaded, email: user?.email, token });

  
  const hasInitialSaved = useRef(false);
  useEffect(() => {
    if (!isProfileLoaded || hasInitialSaved.current) return;
    hasInitialSaved.current = true;
    saveProfile().catch(() => {});
  }, [isProfileLoaded, saveProfile]);

  const handleLanguageChange = useCallback(
    async (languageCode: string) => {
      sharedUserStorage.set(SharedStorageKey.LANGUAGE, languageCode);
      await i18n.changeLanguage(languageCode);
      await saveProfile().catch(() => {});
      cacheFlush();
      reloadPage('language change');
    },
    [i18n, saveProfile],
  );

  const getNavLabel = useCallback(
    (item: NavigationItem) => (item.labelKey ? t(item.labelKey, item.label) : item.label),
    [t],
  );

  
  
  const isRoot = user?.isRoot ?? false;
  const navbarItems = useMemo<NavigationItem[]>(() => {
    return stripRootOnlyNavItems(appConfig.navigation.mobile, isRoot)
      .filter((item) => item.navbar && !item.hidden)
      .slice(0, 4)
      .map((item) => {
        if (item.subs && item.subs.length > 0 && !item.path) {
          return { ...item, path: item.subs[0].path, subs: undefined };
        }
        return item;
      });
  }, [isRoot]);

  const handleMount = useCallback(() => {
    if (token && !isProfileLoaded) {
      loadProfile();
    }
  }, [token, isProfileLoaded, loadProfile]);

  
  
  const handleRefresh = useCallback(() => {
    cacheFlush();
    reloadPage('manual refresh');
  }, []);

  
  
  
  const clearCache = useClearCacheConfirm();

  return (
    <MobileAppLayoutUI
      
      
      
      navigation={navbarItems as CredoNavigationItem[]}
      getNavLabel={getNavLabel}
      appName={appConfig.app.name}
      logoSrc={appConfig.app.logoDarkBgUrl || appConfig.app.logoUrl || '/logo-white.svg'}
      mainColor={themeConfig.mainColor}
      languageSwitcher={{
        languages: appConfig.languages,
        currentLanguage: i18n.language,
        onLanguageChange: handleLanguageChange,
      }}
      showLanguageSwitcher={featureFlags.common.languageSwitcher}
      morePath={ROUTES.MORE}
      showRefreshConfig={showRefreshConfig}
      onRefreshConfig={() => {
        forceRefreshConfig().catch(console.error);
      }}
      onClearCache={clearCache.open}
      labels={{
        languageTooltip: t('common.labels.language'),
        accountTooltip: t('menu.profile'),
        menuReloadPage: t('menu.reloadPage'),
        menuRefreshConfig: t('menu.refreshConfig'),
        menuClearCache: t('menu.clearCache'),
      }}
      isAuthenticated={!!token}
      isProfileLoaded={isProfileLoaded}
      loginPath={ROUTES.AUTH.LOGIN}
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
      {clearCache.modal}
    </MobileAppLayoutUI>
  );
}
