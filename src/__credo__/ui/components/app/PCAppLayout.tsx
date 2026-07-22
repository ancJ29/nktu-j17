import type { MantineColor } from '@mantine/core';
import {
  AppShell,
  Avatar,
  Box,
  Collapse,
  Group,
  Image,
  Menu,
  rem,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { CredoNavigationItem, Language } from '../../types';
import { getThemeColor } from '../../utils/color';
import { BuildInformation } from '../common/BuildInformation';
import { Icon } from '../common/Icon';
import { LoadingFallback } from '../common/LoadingFallback';
import { IconName } from '../types';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import './PCAppLayout.css';

const classes = {
  activeTag: 'credo-pc-activeTag',
  navButton: 'credo-pc-navButton',
  active: 'credo-pc-active',
  navGroup: 'credo-pc-navGroup',
  navLabel: 'credo-pc-navLabel',
  chevron: 'credo-pc-chevron',
  expanded: 'credo-pc-expanded',
  subNavButton: 'credo-pc-subNavButton',
  subNavGroup: 'credo-pc-subNavGroup',
  subNavLabel: 'credo-pc-subNavLabel',
  iconOnly: 'credo-pc-iconOnly',
} as const;

const HEADER_HEIGHT = 56;
const NAVBAR_WIDTH = 250;
const NAVBAR_COLLAPSED_WIDTH = 60;

type UserInfo = {
  name?: string;
  avatar?: string;
};

type PCAppLayoutLabels = {
  languageTooltip: string;
  menuProfile: string;
  menuSettings: string;
  menuLogout: string;
  menuReloadPage?: string;
  menuRefreshConfig?: string;
  menuInstallApp?: string;
  menuClearCache?: string;
};

type PCAppLayoutProps = {
  navigation: CredoNavigationItem[];
  getNavLabel: (item: CredoNavigationItem) => string;
  appName: string;
  logoSrc: string;
  user?: UserInfo;
  mainColor: string;
  languageSwitcher: {
    languages: Language[];
    currentLanguage: string;
    onLanguageChange: (code: string) => void;
  };
  labels: PCAppLayoutLabels;
  buildInfo: { version: string; buildHash: string; buildTimestamp: string };
  logoutPath: string;
  profilePath?: string;
  settingsPath?: string;
  avatar?: ReactNode;
  isAuthenticated: boolean;
  isProfileLoaded: boolean;
  loginPath: string;
  onMount?: () => void;
  children: ReactNode;
  navbarWidth?: number;
  displayIconWhenCollapsed?: boolean;
  showLanguageSwitcher?: boolean;
  
  onRefresh?: () => void;
  showRefreshConfig?: boolean;
  onRefreshConfig?: () => void;
  showInstallApp?: boolean;
  onInstallApp?: () => void;
  
  onClearCache?: () => void;
  
  navbarOpenedProp?: boolean;
  
  onNavbarToggle?: () => void;
  
  navbarVariant?: 'dark' | 'light';
  
  headerVariant?: 'dark' | 'light';
};

export type { PCAppLayoutLabels, PCAppLayoutProps, UserInfo };

export function PCAppLayout({
  avatar,
  navigation,
  getNavLabel,
  appName,
  logoSrc,
  user,
  mainColor,
  languageSwitcher,
  labels,
  buildInfo,
  logoutPath,
  profilePath,
  settingsPath,
  isAuthenticated,
  isProfileLoaded,
  loginPath,
  onMount,
  children,
  navbarWidth = NAVBAR_WIDTH,
  displayIconWhenCollapsed = false,
  showLanguageSwitcher = true,
  onRefresh,
  showRefreshConfig = false,
  onRefreshConfig,
  showInstallApp = false,
  onInstallApp,
  onClearCache,
  navbarOpenedProp,
  onNavbarToggle,
  navbarVariant = 'dark',
  headerVariant = 'dark',
}: PCAppLayoutProps) {
  const theme = useMantineTheme();
  const location = useLocation();
  const isLightNav = navbarVariant === 'light';
  const isLightHeader = headerVariant === 'light';

  
  const [internalNavbarOpened, setInternalNavbarOpened] = useState(true);
  const navbarOpened = navbarOpenedProp !== undefined ? navbarOpenedProp : internalNavbarOpened;
  const [expandedMenuId, setExpandedMenuId] = useState<string | undefined>();

  
  const iconOnly = displayIconWhenCollapsed && !navbarOpened;
  const effectiveNavbarWidth = iconOnly ? NAVBAR_COLLAPSED_WIDTH : navbarWidth;

  const toggleNavbar = useCallback(() => {
    if (onNavbarToggle) {
      onNavbarToggle();
    } else {
      setInternalNavbarOpened((prev) => !prev);
    }
  }, [onNavbarToggle]);

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

  const navbarGradient = useMemo(() => {
    return `linear-gradient(180deg, ${getColor(`${mainColor}.9`)} 0%, ${getColor(`${mainColor}.8`)} 100%)`;
  }, [getColor, mainColor]);

  
  
  const navbarBackground = isLightNav ? getColor('neutral.0') : navbarGradient;
  const navTextColor = isLightNav ? getColor('neutral.8') : 'white';
  const navIconColor = isLightNav ? getColor('neutral.7') : 'white';
  const navActiveIconColor = isLightNav ? getColor(`${mainColor}.7`) : 'white';
  
  
  const headerBackground = isLightHeader ? getColor('neutral.0') : headerGradient;
  const headerTextColor = isLightHeader ? getColor('neutral.8') : 'white';
  const headerIconColor = isLightHeader ? getColor('neutral.7') : 'white';
  const headerButtonBg = isLightHeader ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.12)';
  const headerAvatarBorder = isLightHeader
    ? `1.5px solid ${getColor('neutral.3')}`
    : '1.5px solid rgba(255, 255, 255, 0.9)';

  
  const navCssVars = isLightNav
    ? ({
        '--credo-nav-accent': getColor(`${mainColor}.7`),
        '--credo-nav-active-bg': getColor(`${mainColor}.0`),
        '--credo-nav-active-text': getColor(`${mainColor}.9`),
        '--credo-nav-border': getColor('neutral.2'),
      } as CSSProperties)
    : undefined;

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedMenuId((prev) => (prev === id ? undefined : id));
  }, []);

  
  
  
  const handleCollapsedGroupClick = useCallback(
    (id: string) => {
      toggleNavbar();
      setExpandedMenuId(id);
    },
    [toggleNavbar],
  );

  const isActive = useCallback(
    (item: CredoNavigationItem): boolean => {
      if (item.path && location.pathname === item.path) return true;
      if (item.subs) {
        return item.subs.some((sub) => sub.path === location.pathname);
      }
      return false;
    },
    [location.pathname],
  );

  if (!isAuthenticated) {
    return <Navigate to={loginPath} />;
  }

  if (!isProfileLoaded) {
    return <LoadingFallback fullScreen />;
  }

  return (
    <AppShell
      header={{ height: HEADER_HEIGHT }}
      navbar={{
        width: `${effectiveNavbarWidth}px`,
        breakpoint: 'sm',
        collapsed: {
          desktop: !navbarOpened && !displayIconWhenCollapsed,
          mobile: !navbarOpened,
        },
      }}
      padding={0}
    >
      {/* Header */}
      <AppShell.Header
        style={{
          background: headerBackground,
          borderBottom: isLightHeader ? `1px solid ${getColor('neutral.2')}` : 'none',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          {/* Brand */}
          <Group gap="sm" align="center">
            <Link to="/">
              <Image src={logoSrc} alt={appName} height={36} />
            </Link>
            {appName && (
              <Text size="lg" fw={600} c={headerTextColor}>
                {appName}
              </Text>
            )}
            <UnstyledButton
              onClick={toggleNavbar}
              w={32}
              h={32}
              style={{
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {navbarOpened ? (
                <Icon name={IconName.X} size={18} color={headerIconColor} />
              ) : (
                <Icon name={IconName.Menu2} size={18} color={headerIconColor} />
              )}
            </UnstyledButton>
          </Group>

          {/* Right Side: Language Switcher + Theme Toggle + User Menu */}
          <Group gap="xs">
            {showLanguageSwitcher && (
              <LanguageSwitcher
                languages={languageSwitcher.languages}
                currentLanguage={languageSwitcher.currentLanguage}
                onLanguageChange={languageSwitcher.onLanguageChange}
                tooltipLabel={labels.languageTooltip}
                lightIcon={!isLightHeader}
              />
            )}
            <Menu position="bottom-end" width={200} shadow="md" offset={8}>
              <Menu.Target>
                <UnstyledButton
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: rem(8),
                    padding: `${rem(4)} ${rem(8)}`,
                    borderRadius: rem(8),
                    backgroundColor: headerButtonBg,
                  }}
                >
                  {avatar || (
                    <Avatar
                      size={28}
                      radius="md"
                      style={{
                        border: headerAvatarBorder,
                      }}
                    >
                      '?'
                    </Avatar>
                  )}
                  <Text size="sm" fw={600} c={headerTextColor} lineClamp={1}>
                    {user?.name || 'User'}
                  </Text>
                  <Icon name={IconName.ChevronDown} size={14} color={headerIconColor} />
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                {profilePath ? (
                  <Menu.Item
                    leftSection={<Icon name={IconName.User} size={16} />}
                    fz="sm"
                    component={Link}
                    to={profilePath}
                  >
                    {labels.menuProfile}
                  </Menu.Item>
                ) : (
                  <Menu.Item leftSection={<Icon name={IconName.User} size={16} />} fz="sm">
                    {labels.menuProfile}
                  </Menu.Item>
                )}
                {settingsPath ? (
                  <Menu.Item
                    leftSection={<Icon name={IconName.Settings} size={16} />}
                    fz="sm"
                    component={Link}
                    to={settingsPath}
                  >
                    {labels.menuSettings}
                  </Menu.Item>
                ) : (
                  <></>
                )}
                {onRefresh && (
                  <Menu.Item
                    leftSection={<Icon name={IconName.Refresh} size={16} />}
                    fz="sm"
                    onClick={onRefresh}
                  >
                    {labels.menuReloadPage || 'Reload Page'}
                  </Menu.Item>
                )}
                {showInstallApp && onInstallApp && (
                  <Menu.Item
                    leftSection={<Icon name={IconName.Download} size={16} />}
                    fz="sm"
                    onClick={onInstallApp}
                  >
                    {labels.menuInstallApp || 'Install App'}
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
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<Icon name={IconName.Trash} size={16} />}
                      fz="sm"
                      onClick={onClearCache}
                    >
                      {labels.menuClearCache || 'Force Clear All Cache'}
                    </Menu.Item>
                  </>
                )}
                <Menu.Divider />
                <Menu.Item
                  leftSection={<Icon name={IconName.Logout} size={16} />}
                  color="red"
                  component={Link}
                  to={logoutPath}
                  fz="sm"
                >
                  {labels.menuLogout}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar
        p={0}
        data-variant={navbarVariant}
        style={{
          background: navbarBackground,
          borderRight: isLightNav ? `1px solid ${getColor('neutral.2')}` : 'none',
          ...navCssVars,
        }}
      >
        <AppShell.Section grow component={ScrollArea} pt="sm">
          <Stack gap={0}>
            {navigation
              .filter((item) => !item.hidden)
              .map((item) => {
                const iconName = item.icon;
                const active = isActive(item);
                const expanded = expandedMenuId === item.id;
                const label = getNavLabel(item);

                if (iconOnly) {
                  const btnClass = `${classes.navButton} ${active ? classes.active : ''} ${classes.iconOnly}`;
                  return (
                    <Box key={item.id} c={navTextColor}>
                      <Tooltip label={label} position="right" withArrow>
                        {item.subs ? (
                          <UnstyledButton
                            className={btnClass}
                            onClick={() => handleCollapsedGroupClick(item.id)}
                          >
                            {active && <div className={classes.activeTag} />}
                            <Icon
                              name={iconName}
                              size={22}
                              color={active ? navActiveIconColor : navIconColor}
                            />
                          </UnstyledButton>
                        ) : (
                          <UnstyledButton
                            className={btnClass}
                            component={Link}
                            to={item.path || '/'}
                          >
                            {active && <div className={classes.activeTag} />}
                            <Icon
                              name={iconName}
                              size={22}
                              color={active ? navActiveIconColor : navIconColor}
                            />
                          </UnstyledButton>
                        )}
                      </Tooltip>
                    </Box>
                  );
                }

                return (
                  <Box key={item.id} c={navTextColor}>
                    {item.subs ? (
                      <>
                        <UnstyledButton
                          className={`${classes.navButton} ${active ? classes.active : ''}`}
                          onClick={() => handleToggleExpand(item.id)}
                        >
                          <Group className={classes.navGroup}>
                            <Group gap="sm">
                              <Icon
                                name={iconName}
                                size={20}
                                color={active ? navActiveIconColor : navIconColor}
                              />
                              <Text className={classes.navLabel}>{label}</Text>
                            </Group>
                            <Icon
                              name={IconName.CaretDownFilled}
                              size={12}
                              className={`${classes.chevron} ${expanded ? classes.expanded : ''}`}
                            />
                          </Group>
                        </UnstyledButton>
                        <Collapse in={expanded}>
                          <Stack gap={0}>
                            {item.subs
                              .filter((subItem) => !subItem.hidden)
                              .map((subItem) => {
                                const subActive = location.pathname === subItem.path;

                                return (
                                  <UnstyledButton
                                    key={subItem.id}
                                    className={`${classes.subNavButton} ${subActive ? classes.active : ''}`}
                                    component={Link}
                                    to={subItem.path || '/'}
                                  >
                                    <Group className={classes.subNavGroup}>
                                      {subActive && <div className={classes.activeTag} />}
                                      <Text className={classes.subNavLabel}>
                                        {getNavLabel(subItem)}
                                      </Text>
                                    </Group>
                                  </UnstyledButton>
                                );
                              })}
                          </Stack>
                        </Collapse>
                      </>
                    ) : (
                      <UnstyledButton
                        className={`${classes.navButton} ${active ? classes.active : ''}`}
                        component={Link}
                        to={item.path || '/'}
                      >
                        <Group className={classes.navGroup}>
                          <Group gap="sm">
                            {active && <div className={classes.activeTag} />}
                            <Icon
                              name={iconName}
                              size={20}
                              color={active ? navActiveIconColor : navIconColor}
                            />
                            <Text className={classes.navLabel}>{label}</Text>
                          </Group>
                        </Group>
                      </UnstyledButton>
                    )}
                  </Box>
                );
              })}
          </Stack>
        </AppShell.Section>

        {/* Footer - Version Info */}
        {!iconOnly && (
          <AppShell.Section p="xs">
            <BuildInformation {...buildInfo} />
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main bg="var(--mantine-color-body)">{children}</AppShell.Main>
    </AppShell>
  );
}
