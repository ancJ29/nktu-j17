import { appConfig, featureFlags, forceRefreshConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useCurrentEmployee, useLanguageSync, useNavbarSync } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  getDisplayIconWhenCollapsed,
  getHeaderVariant,
  getNavbarVariant,
  getNavbarWidth,
  hasAvatarForEmployees,
} from '@/utils/permission';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { cacheFlush } from '@/utils/appCache';
import { EmployeeReadyGate } from './EmployeeReadyGate';
import { LoadingFallback, PCAppLayout as PCAppLayoutUI } from '@credo/base-ui/components';
import type { CredoNavigationItem } from '@credo/base-ui/types';
import type { NavigationItem } from '@/types';
import { stripRootOnlyNavItems } from '@/config/navigation';
import { Container, Indicator } from '@mantine/core';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { reloadPage } from '@credo/base-ui/utils';
import { showRefreshConfig } from '@/config/menu-access';
import { useClearCacheConfirm } from '@/hooks/useClearCacheConfirm';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';

const hasAvatar = hasAvatarForEmployees();

const headerVariant = getHeaderVariant();
const logoSrc =
  headerVariant === 'light'
    ? appConfig.app.logoUrl || '/logo.svg'
    : appConfig.app.logoDarkBgUrl || appConfig.app.logoUrl || '/logo-white.svg';

export function PCAppLayout() {
  const { t, i18n } = useTranslation();
  const { token, user, loadProfile, saveProfile, isProfileLoaded } = useAuthStore();
  const employees = useEmployeeStore((s) => s.items);

  
  
  

  const { name, profileImage } = useMemo(() => {
    const employee = findEmployeeByLoginEmail(employees, user?.email);
    return {
      name: employee?.name || user?.name || '',
      profileImage: hasAvatar ? employee?.extra?.profileImage : undefined,
    };
  }, [employees, user]);

  
  
  useLanguageSync({ isProfileLoaded });
  const { isRoot } = useCurrentEmployee({ isProfileLoaded, email: user?.email, token });
  const { navbarOpened, toggleNavbar } = useNavbarSync({ isProfileLoaded });

  
  
  const pcNavigation = useMemo(
    () => stripRootOnlyNavItems(appConfig.navigation.pc, isRoot),
    [isRoot],
  );

  
  
  
  const avatarNode = useMemo(() => {
    const inner = <EmployeeAvatar name={name} imageUrl={profileImage} />;
    if (!isRoot) return inner;
    return (
      <Indicator label="Root" size={16} color="red" position="bottom-end" offset={2} withBorder>
        {inner}
      </Indicator>
    );
  }, [isRoot, name, profileImage]);

  
  
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

  const handleMount = useCallback(() => {
    if (token && !isProfileLoaded) {
      loadProfile();
    }
  }, [token, isProfileLoaded, loadProfile]);

  
  
  
  const handleRefresh = useCallback(() => {
    cacheFlush();
    reloadPage('manual refresh');
  }, []);

  
  const showInstallApp = useMemo(
    () => !window.matchMedia('(display-mode: standalone)').matches,
    [],
  );

  const handleInstallApp = useCallback(() => {
    window.dispatchEvent(new Event('toggle-pwa-guide'));
  }, []);

  
  
  const clearCache = useClearCacheConfirm();

  return (
    <PCAppLayoutUI
      
      
      
      navigation={pcNavigation as CredoNavigationItem[]}
      getNavLabel={getNavLabel}
      appName={appConfig.app.name}
      logoSrc={logoSrc}
      user={user ? { name: user.name } : undefined}
      mainColor={themeConfig.mainColor}
      languageSwitcher={{
        languages: appConfig.languages,
        currentLanguage: i18n.language,
        onLanguageChange: handleLanguageChange,
      }}
      showLanguageSwitcher={featureFlags.common.languageSwitcher}
      onRefresh={handleRefresh}
      showRefreshConfig={showRefreshConfig}
      onRefreshConfig={() => {
        forceRefreshConfig().catch(console.error);
      }}
      showInstallApp={showInstallApp}
      onInstallApp={handleInstallApp}
      onClearCache={clearCache.open}
      labels={{
        languageTooltip: t('common.labels.language'),
        menuProfile: t('menu.profile'),
        menuSettings: t('menu.settings'),
        menuLogout: t('menu.logout'),
        menuReloadPage: t('menu.reloadPage'),
        menuRefreshConfig: t('menu.refreshConfig'),
        menuInstallApp: t('menu.installApp'),
        menuClearCache: t('menu.clearCache'),
      }}
      buildInfo={appConfig.build ?? { version: '0.0.0', buildHash: '0000', buildTimestamp: '0000' }}
      logoutPath={ROUTES.AUTH.LOGOUT}
      profilePath={ROUTES.PROFILE}
      avatar={avatarNode}
      isAuthenticated={!!token}
      isProfileLoaded={isProfileLoaded}
      loginPath={ROUTES.AUTH.LOGIN}
      onMount={handleMount}
      navbarWidth={getNavbarWidth()}
      navbarVariant={getNavbarVariant()}
      headerVariant={headerVariant}
      displayIconWhenCollapsed={getDisplayIconWhenCollapsed()}
      navbarOpenedProp={navbarOpened}
      onNavbarToggle={toggleNavbar}
    >
      <Suspense fallback={<LoadingFallback fullScreen />}>
        <Container fluid p="sm">
          <EmployeeReadyGate>
            <Outlet />
          </EmployeeReadyGate>
        </Container>
      </Suspense>
      {clearCache.modal}
    </PCAppLayoutUI>
  );
}
