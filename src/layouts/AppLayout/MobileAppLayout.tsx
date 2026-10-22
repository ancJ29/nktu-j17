import { appBrand, appConfig, featureFlags, forceRefreshConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useCurrentEmployee, useLanguageSync } from '@/hooks';
import { isSignedIn, useAuthStore } from '@/stores/useAuthStore';
import { useIsRoot } from '@/hooks/useIsRoot';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { cacheFlush } from '@/utils/appCache';
import { EmployeeReadyGate } from './EmployeeReadyGate';
import { LoadingFallback, MobileAppLayout as MobileAppLayoutUI } from '@credo/base-ui/components';
import type { CredoNavigationItem } from '@credo/base-ui/types';
import type { NavigationItem } from '@/types';
import { stripRootOnlyNavItems } from '@/config/navigation';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { Container } from '@mantine/core';
import { Suspense, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { reloadPage } from '@credo/base-ui/utils';
import { showRefreshConfig } from '@/config/menu-access';
import { useClearCacheConfirm } from '@/hooks/useClearCacheConfirm';
import { getHeaderVariant } from '@/utils/permission';

const headerVariant = getHeaderVariant();
const logoSrc =
  headerVariant === 'light'
    ? appConfig.app.logoUrl || '/logo.svg'
    : appConfig.app.logoDarkBgUrl || appConfig.app.logoUrl || '/logo-white.svg';

export function MobileAppLayout() {
  const { t, i18n } = useTranslation();
  const { user, loadProfile, isProfileLoaded } = useAuthStore();

  const signedIn = isSignedIn();

  useLanguageSync({ isProfileLoaded });
  useCurrentEmployee({ isProfileLoaded, email: user?.email });

  const handleLanguageChange = useCallback(
    async (languageCode: string) => {
      sharedUserStorage.set(SharedStorageKey.LANGUAGE, languageCode);
      await i18n.changeLanguage(languageCode);
      cacheFlush();
      reloadPage('language change');
    },
    [i18n],
  );

  const getNavLabel = useCallback(
    (item: NavigationItem) => (item.labelKey ? t(item.labelKey, item.label) : item.label),
    [t],
  );

  const isRoot = useIsRoot();
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
    if (signedIn && !isProfileLoaded) {
      loadProfile();
    }
  }, [signedIn, isProfileLoaded, loadProfile]);

  const handleRefresh = useCallback(() => {
    cacheFlush();
    reloadPage('manual refresh');
  }, []);

  const clearCache = useClearCacheConfirm();

  return (
    <MobileAppLayoutUI
      navigation={navbarItems as CredoNavigationItem[]}
      getNavLabel={getNavLabel}
      appName={appBrand.name}
      appNameHtml={appBrand.nameHtml}
      logoSrc={logoSrc}
      mainColor={themeConfig.mainColor}
      headerVariant={headerVariant}
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
      isAuthenticated={signedIn}
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
      {/* Outside the Suspense boundary + portaled by `Affix`, so it survives a
          lazy route swap and escapes PullToRefresh's transform. Every mobile
          page gets it; it reveals itself only once there's something to scroll
          back from. */}
      <ScrollToTopButton />
      {clearCache.modal}
    </MobileAppLayoutUI>
  );
}
