import { Box, Loader } from '@mantine/core';
import type { ReactNode } from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { Icon } from '../common/Icon';
import { IconName } from '../types';

const TRIGGER_THRESHOLD = 70;

type PullToRefreshProps = {
  
  onRefresh: () => void | Promise<void>;
  
  enabled?: boolean;
  
  color?: string;
  
  offsetTop?: number;
  children: ReactNode;
};

export type { PullToRefreshProps };

export function PullToRefresh({
  onRefresh,
  enabled = true,
  color,
  offsetTop = 0,
  children,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh,
    enabled,
    threshold: TRIGGER_THRESHOLD,
  });

  const active = pullDistance > 0 || isRefreshing;
  const progress = Math.min(1, pullDistance / TRIGGER_THRESHOLD);
  const indicatorColor = color ? `var(--mantine-color-${color}-6)` : 'var(--mantine-color-anchor)';

  return (
    <>
      <Box
        aria-hidden
        style={{
          position: 'fixed',
          top: offsetTop,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 90,
          
          transform: `translateY(${active ? pullDistance : 0}px)`,
          opacity: active ? Math.max(0.35, progress) : 0,
          transition: isRefreshing
            ? 'transform 0.2s ease'
            : pullDistance > 0
              ? 'none'
              : 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        <Box
          style={{
            marginTop: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'var(--mantine-color-body)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
          }}
        >
          {isRefreshing ? (
            <Loader size={18} color={color} />
          ) : (
            <Icon
              name={IconName.Refresh}
              size={20}
              color={indicatorColor}
              style={{
                transform: `rotate(${progress * 270}deg)`,
                transition: 'transform 0.05s linear',
              }}
            />
          )}
        </Box>
      </Box>
      {children}
    </>
  );
}
