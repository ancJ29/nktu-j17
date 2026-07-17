import { ActionIcon, Button, Group, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@credo/base-ui/components';

const AUTO_REFRESH_AFTER_SECONDS = 60 * 60;

type CacheStatusProps = {
  cachedAt: number | null;
  loading?: boolean;
  onRefresh: () => void;
  
  compact?: boolean;
};

export function CacheStatus({ cachedAt, loading, onRefresh, compact }: CacheStatusProps) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);
  const [seconds, setSeconds] = useState(0);

  
  
  
  const onRefreshRef = useRef(onRefresh);
  const loadingRef = useRef(loading);
  
  
  
  const autoFiredForRef = useRef<number | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    loadingRef.current = loading;
  }, [onRefresh, loading]);

  
  useEffect(() => {
    if (!cachedAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [cachedAt]);

  useEffect(() => {
    if (!cachedAt) return;
    const compute = () => {
      const s = Math.floor((Date.now() - cachedAt) / 1000);
      setSeconds(s);
      
      
      
      if (
        s >= AUTO_REFRESH_AFTER_SECONDS &&
        !loadingRef.current &&
        autoFiredForRef.current !== cachedAt &&
        document.visibilityState === 'visible'
      ) {
        autoFiredForRef.current = cachedAt;
        onRefreshRef.current();
      }
    };
    compute();
    const id = setInterval(compute, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') compute();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cachedAt]);

  if (!cachedAt) return null;

  if (seconds < 30) return null;

  let ageLabel: string;
  if (seconds < 3600) {
    ageLabel = t('__new__.01-common.cache.minutesAgo', {
      count: Math.max(1, Math.floor(seconds / 60)),
    });
  } else {
    ageLabel = t('__new__.01-common.cache.hoursAgo', { count: Math.floor(seconds / 3600) });
  }

  if (compact) {
    return (
      <Button
        variant="subtle"
        size="compact-xs"
        color="gray"
        leftSection={<IconRefresh size={14} />}
        onClick={onRefresh}
        loading={loading}
      >
        {ageLabel}
      </Button>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Text size="xs" c="dimmed">
        {ageLabel}
      </Text>
      <Tooltip label={t('__new__.01-common.cache.refresh')}>
        <ActionIcon variant="subtle" size="xs" onClick={onRefresh} loading={loading}>
          <IconRefresh size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
