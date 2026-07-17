

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Loader, Stack, Text } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { activityLoggerConnector } from '@credo/connectors/connector';
import type { ActivityLoggerActivityEntity } from '@credo/connectors/types';
import { device } from '@credo/base-ui/utils';
import { resolveClientCode } from '@/config/client-code';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { SectionCard } from '@/components/SectionCard';

const isMobile = device.isMobile;
const PAGE_SIZE = 50;

export type ActivityPanelI18nNamespace =
  | 'products.detail'
  | 'materials.detail'
  | 'customers.detail'
  | 'vendors.detail'
  | 'assets.truck.detail'
  | 'salesOrders.detail'
  | 'deliveryRequests.detail'
  | 'goodsReceipts.detail'
  | 'transportOrders.detail';

type Props = {
  readonly targetId: string;
  readonly i18nNamespace: ActivityPanelI18nNamespace;
};

export function ActivityByTargetPanel({ targetId, i18nNamespace }: Props) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityLoggerActivityEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    
    setLoading(true);
    setError(false);
    setActivities([]);
    setNextCursor(undefined);
    activityLoggerConnector
      .getByTarget({ targetId, clientId: resolveClientCode(), limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setActivities(res.activities);
        setNextCursor(res.nextCursor);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    activityLoggerConnector
      .getByTarget({
        targetId,
        clientId: resolveClientCode(),
        limit: PAGE_SIZE,
        cursor: nextCursor,
      })
      .then((res) => {
        setActivities((prev) => [...prev, ...res.activities]);
        setNextCursor(res.nextCursor);
      })
      .catch(() => {
        
        
        setError(true);
      })
      .finally(() => setLoadingMore(false));
  }, [targetId, nextCursor, loadingMore]);

  return (
    <SectionCard
      icon={<IconHistory size={14} />}
      title={t(`${i18nNamespace}.recentActivities` as const)}
      padding={isMobile ? 'sm' : 'lg'}
    >
      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : error && activities.length === 0 ? (
        <Text c="red" size="sm" ta="center" py="xl">
          {t(`${i18nNamespace}.activitiesError` as const)}
        </Text>
      ) : activities.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          {t(`${i18nNamespace}.activitiesNoEntries` as const)}
        </Text>
      ) : (
        <Stack gap="sm">
          {activities.map((entry) => (
            <ActivityCard key={entry.id} entry={entry} targetLabel={null} showActor />
          ))}
          {nextCursor && (
            <Group justify="center" pt="xs">
              <Button variant="default" size="sm" onClick={handleLoadMore} loading={loadingMore}>
                {t(`${i18nNamespace}.activitiesLoadMore` as const)}
              </Button>
            </Group>
          )}
          {error && activities.length > 0 && (
            <Text c="red" size="xs" ta="center">
              {t(`${i18nNamespace}.activitiesError` as const)}
            </Text>
          )}
        </Stack>
      )}
    </SectionCard>
  );
}
