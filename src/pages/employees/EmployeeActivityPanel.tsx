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
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useAuthStore } from '@/stores/useAuthStore';

const isMobile = device.isMobile;
const PAGE_SIZE = 50;

type Props = { readonly employeeId: string };

export function EmployeeActivityPanel({ employeeId }: Props) {
  const { t } = useTranslation();
  const employees = useEmployeeStore((s) => s.items);
  const isRoot = useAuthStore((state) => state.user?.isRoot ?? false);
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
      .getByActor({ actorId: employeeId, clientId: resolveClientCode(), limit: PAGE_SIZE })
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
  }, [employeeId]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    activityLoggerConnector
      .getByActor({
        actorId: employeeId,
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
  }, [employeeId, nextCursor, loadingMore]);

  const resolveTargetLabel = (targetId: string | null) => {
    if (!targetId) return null;
    const match = employees.find((e) => e.id === targetId);
    return match?.name ?? targetId;
  };

  return (
    <SectionCard
      icon={<IconHistory size={14} />}
      title={t('employees.detail.recentActivities')}
      padding={isMobile ? 'sm' : 'lg'}
    >
      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : error && activities.length === 0 ? (
        <Text c="red" size="sm" ta="center" py="xl">
          {t('employees.detail.activitiesError')}
        </Text>
      ) : activities.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          {t('employees.detail.activitiesNoEntries')}
        </Text>
      ) : (
        <Stack gap="sm">
          {activities.map((entry) => (
            <ActivityCard
              key={entry.id}
              entry={entry}
              targetLabel={resolveTargetLabel(entry.targetId)}
              isRoot={isRoot}
            />
          ))}
          {nextCursor && (
            <Group justify="center" pt="xs">
              <Button variant="default" size="sm" onClick={handleLoadMore} loading={loadingMore}>
                {t('employees.detail.activitiesLoadMore')}
              </Button>
            </Group>
          )}
          {error && activities.length > 0 && (
            <Text c="red" size="xs" ta="center">
              {t('employees.detail.activitiesError')}
            </Text>
          )}
        </Stack>
      )}
    </SectionCard>
  );
}
