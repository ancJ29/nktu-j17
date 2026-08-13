import type { MantineColor } from '@mantine/core';
import {
  alpha,
  AppShell,
  Box,
  Group,
  Image,
  Menu,
  Text,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { CredoNavigationItem, Language } from '../../types';
import { getThemeColor } from '../../utils/color';
import { Icon } from '../common/Icon';
import { LoadingFallback } from '../common/LoadingFallback';
import { IconName } from '../types';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { PullToRefresh } from './PullToRefresh';
import './MobileAppLayout.css';

const classes = {
  headerButton: 'credo-mobile-headerButton',
  main: 'credo-mobile-main',
  bottomNav: 'credo-mobile-bottomNav',
  navItem: 'credo-mobile-navItem',
  navIconWrapper: 'credo-mobile-navIconWrapper',
} as const;

const HEADER_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 64;

type MobileAppLayoutLabels = {
  languageTooltip: string;

  accountTooltip?: string;
  menuReloadPage?: string;
  menuRefreshConfig?: string;
  menuClearCache?: string;
};

type MobileAppLayoutProps = {
  navigation: CredoNavigationItem[];
  getNavLabel: (item: CredoNavigationItem) => string;
  appName: string;
  logoSrc: string;
  mainColor: string;
  languageSwitcher: {
    languages: Language[];
    currentLanguage: string;
    onLanguageChange: (code: string) => void;
  };
  labels: MobileAppLayoutLabels;
  isAuthenticated: boolean;
  isProfileLoaded: boolean;
  loginPath: string;
  morePath: string;
  onMount?: () => void;

  onRefresh?: () => void | Promise<void>;
  children: ReactNode;
  showLanguageSwitcher?: boolean;

  showRefreshConfig?: boolean;
  onRefreshConfig?: () => void;
  onClearCache?: () => void;
};

export type { MobileAppLayoutLabels, MobileAppLayoutProps };

const MAX_VISIBLE_NAV = 4;

export function MobileAppLayout({
  navigation,
  appName,
  logoSrc,
  mainColor,
  languageSwitcher,
  labels,
  isAuthenticated,
  isProfileLoaded,
  loginPath,
  morePath,
  onMount,
  onRefresh,
  children,
  showLanguageSwitcher = true,
  showRefreshConfig = true,
  onRefreshConfig,
  onClearCache,
}: MobileAppLayoutProps) {
  const theme = useMantineTheme();
  const location = useLocation();

  useEffect(() => {
    onMount?.();
  }, []);

  const getColor = useCallback(
    (color: MantineColor) => {
      return getThemeColor(theme, color);
    },
    [theme],
  );

  const headerGradient = useMemo(() => {
    return `linear-gradient(135deg, ${getColor(`${mainColor}.7`)} 0%, ${getColor(`${mainColor}.9`)} 100%)`;
  }, [getColor, mainColor]);

  const visibleNav = useMemo(
    () => navigation.filter((item) => !item.hidden).slice(0, MAX_VISIBLE_NAV),
    [navigation],
  );

  if (!isAuthenticated) {
    return <Navigate to={loginPath} />;
  }

  if (!isProfileLoaded) {
    return <LoadingFallback fullScreen />;
  }

  return (
    <AppShell header={{ height: HEADER_HEIGHT }} padding="xs" pb={BOTTOM_NAV_HEIGHT}>
      {/* Header */}
      <AppShell.Header
        style={{
          background: headerGradient,
          borderBottom: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          zIndex: 100,
        }}
      >
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          {/* Logo. Shrinkable with a clamped name: a long client brand must
              truncate, never push the controls out of the viewport. */}
          <Group wrap="nowrap" style={{ minWidth: 0 }}>
            <Box component={Link} to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <Image src={logoSrc} alt={appName} height={36} />
            </Box>
            {appName && (
              <Text size="lg" fw={600} c="white" lineClamp={1}>
                {appName}
              </Text>
            )}
          </Group>

          {/* Right side. Deliberately at most two controls: the app name is
              client-branded and can be long ("NGŨ KIM TÂN UYÊN"), and a 56px
              header that also carries a logo runs out of room — a third button
              pushed the account icon off-screen entirely. Everything else lives
              in the account menu. */}
          <Group gap="xs" wrap="nowrap">
            {showLanguageSwitcher && (
              <LanguageSwitcher
                languages={languageSwitcher.languages}
                currentLanguage={languageSwitcher.currentLanguage}
                onLanguageChange={languageSwitcher.onLanguageChange}
                tooltipLabel={labels.languageTooltip}
                size={18}
                lightIcon
              />
            )}
            {(onRefresh || onClearCache || (showRefreshConfig && onRefreshConfig)) && (
              <Menu position="bottom-end" width={220} shadow="md" offset={8}>
                <Menu.Target>
                  <UnstyledButton
                    className={classes.headerButton}
                    aria-label={labels.accountTooltip}
                  >
                    <Icon name={IconName.User} size={20} color="white" />
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  {onRefresh && (
                    <Menu.Item
                      leftSection={<Icon name={IconName.Refresh} size={16} />}
                      fz="sm"
                      onClick={() => onRefresh()}
                    >
                      {labels.menuReloadPage || 'Reload Page'}
                    </Menu.Item>
                  )}
                  {showRefreshConfig && onRefreshConfig && (
                    <Menu.Item
                      leftSection={<Icon name={IconName.CloudDownload} size={16} />}
                      fz="sm"
                      onClick={onRefreshConfig}
                    >
                      {labels.menuRefreshConfig}
                    </Menu.Item>
                  )}
                  {onClearCache && (
                    <Menu.Item
                      leftSection={<Icon name={IconName.Trash} size={16} />}
                      fz="sm"
                      onClick={onClearCache}
                    >
                      {labels.menuClearCache || 'Force Clear All Cache'}
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* Main Content */}
      <AppShell.Main px={0} bg="var(--mantine-color-body)" className={classes.main}>
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh} color={mainColor} offsetTop={HEADER_HEIGHT}>
            {children}
          </PullToRefresh>
        ) : (
          children
        )}
      </AppShell.Main>

      {/* Bottom Navigation */}
      <Box
        className={classes.bottomNav}
        h={BOTTOM_NAV_HEIGHT}
        bg="var(--mantine-color-body)"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Group gap={0} justify="space-around" h="100%" px="xs">
          {visibleNav.map((item) => {
            const iconName = item.icon;
            const path = item.path || '/';
            const isActive = location.pathname === path;

            return (
              <UnstyledButton
                key={item.id}
                component={Link}
                to={path}
                className={classes.navItem}
                data-active={isActive || undefined}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                  padding: '6px 8px',
                  '--active-gradient': isActive
                    ? `linear-gradient(135deg, ${getColor(`${mainColor}.7`)} 0%, ${getColor(`${mainColor}.9`)} 100%)`
                    : undefined,
                }}
              >
                <Box
                  className={classes.navIconWrapper}
                  w={40}
                  h={40}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: isActive ? getColor(`${mainColor}.1`) : 'transparent',
                    boxShadow: isActive
                      ? `0 4px 12px ${alpha(getColor(`${mainColor}.7`), 0.25)}`
                      : undefined,
                    '--hover-bg': alpha(getColor(`${mainColor}.7`), 0.08),
                  }}
                >
                  <Icon
                    name={iconName}
                    size={22}
                    stroke={1.8}
                    style={{
                      color: isActive ? getColor(`${mainColor}.7`) : getColor('neutral.6'),
                    }}
                  />
                </Box>
              </UnstyledButton>
            );
          })}

          {/* "More" tab — always visible for profile/logout access */}
          {(() => {
            const isMoreActive = location.pathname === morePath;
            return (
              <UnstyledButton
                component={Link}
                to={morePath}
                className={classes.navItem}
                data-active={isMoreActive || undefined}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                  padding: '6px 8px',
                  '--active-gradient': isMoreActive
                    ? `linear-gradient(135deg, ${getColor(`${mainColor}.7`)} 0%, ${getColor(`${mainColor}.9`)} 100%)`
                    : undefined,
                }}
              >
                <Box
                  className={classes.navIconWrapper}
                  w={40}
                  h={40}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: isMoreActive ? getColor(`${mainColor}.1`) : 'transparent',
                    boxShadow: isMoreActive
                      ? `0 4px 12px ${alpha(getColor(`${mainColor}.7`), 0.25)}`
                      : undefined,
                    '--hover-bg': alpha(getColor(`${mainColor}.7`), 0.08),
                  }}
                >
                  <Icon
                    name={IconName.Dots}
                    size={22}
                    stroke={1.8}
                    style={{
                      color: isMoreActive ? getColor(`${mainColor}.7`) : getColor('neutral.6'),
                    }}
                  />
                </Box>
              </UnstyledButton>
            );
          })()}
        </Group>
      </Box>
    </AppShell>
  );
}
