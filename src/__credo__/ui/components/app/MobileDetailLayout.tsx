import type { MantineColor } from '@mantine/core';
import { Affix, Box, Group, UnstyledButton, useMantineTheme } from '@mantine/core';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { getThemeColor } from '../../utils/color';
import { LoadingFallback } from '../common/LoadingFallback';
import { Icon } from '../common/Icon';
import { IconName } from '../types';
import { PullToRefresh } from './PullToRefresh';
import './MobileDetailLayout.css';

const classes = {
  layout: 'credo-detail-layout',
  navPill: 'credo-detail-navPill',
  navBtn: 'credo-detail-navBtn',
} as const;

type DetailNavAction = {
  icon: IconName;
  label: string;
  path: string;
};

type MobileDetailLayoutProps = {
  mainColor: string;
  isAuthenticated: boolean;
  isProfileLoaded: boolean;
  loginPath: string;
  homePath: string;
  
  navActions?: DetailNavAction[];
  onMount?: () => void;
  
  onRefresh?: () => void | Promise<void>;
  children: ReactNode;
};

export type { DetailNavAction, MobileDetailLayoutProps };

export function MobileDetailLayout({
  mainColor,
  isAuthenticated,
  isProfileLoaded,
  loginPath,
  homePath,
  navActions,
  onMount,
  onRefresh,
  children,
}: MobileDetailLayoutProps) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  useEffect(() => {
    onMount?.();
  }, []); 

  const getColor = useCallback((color: MantineColor) => getThemeColor(theme, color), [theme]);

  const pillBg = useMemo(
    () =>
      `linear-gradient(135deg, ${getColor(`${mainColor}.7`)}e6 0%, ${getColor(`${mainColor}.9`)}e6 100%)`,
    [getColor, mainColor],
  );

  if (!isAuthenticated) {
    return <Navigate to={loginPath} />;
  }

  if (!isProfileLoaded) {
    return <LoadingFallback fullScreen />;
  }

  return (
    <Box className={classes.layout} bg="var(--mantine-color-body)">
      {/* Content — full viewport, padded bottom to clear floating pills */}
      <Box pb={64}>
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh} color={mainColor}>
            {children}
          </PullToRefresh>
        ) : (
          children
        )}
      </Box>

      {/* Floating nav bar — bottom */}
      <Affix position={{ bottom: 16, left: 12, right: 12 }} zIndex={200}>
        <Group justify="space-between" wrap="nowrap">
          {/* Back pill — bottom left */}
          <Box className={classes.navPill} style={{ background: pillBg }}>
            <UnstyledButton className={classes.navBtn} onClick={() => navigate(-1)}>
              <Icon name={IconName.ArrowLeft} size={20} color="white" />
            </UnstyledButton>
          </Box>

          {/* Context pill — bottom right */}
          <Box className={classes.navPill} style={{ background: pillBg }}>
            <Group gap={2}>
              {navActions?.map((action) => (
                <UnstyledButton
                  key={action.path}
                  className={classes.navBtn}
                  onClick={() => navigate(action.path)}
                >
                  <Icon name={action.icon} size={18} color="white" />
                </UnstyledButton>
              ))}
              {onRefresh && (
                <UnstyledButton className={classes.navBtn} onClick={() => onRefresh()}>
                  <Icon name={IconName.Refresh} size={18} color="white" />
                </UnstyledButton>
              )}
              <UnstyledButton className={classes.navBtn} onClick={() => navigate(homePath)}>
                <Icon name={IconName.Home} size={20} color="white" />
              </UnstyledButton>
            </Group>
          </Box>
        </Group>
      </Affix>
    </Box>
  );
}
