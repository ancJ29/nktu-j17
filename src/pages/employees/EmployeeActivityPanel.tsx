import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Loader, Stack, Text } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { activityLoggerConnector, activityLoggerV2Connector } from '@credo/connectors/connector';
import { device } from '@credo/base-ui/utils';
import { resolveClientCode } from '@/config/client-code';
import { appActivityLoggerV1InternalAccessKey } from '@/config/env';
import { ActivityCard } from '@/components/activity/ActivityCard';
import {
  useActivityHistory,
  type ActivityPageFetcher,
} from '@/components/activity/useActivityHistory';
import { SectionCard } from '@/components/SectionCard';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useIsRoot } from '@/hooks/useIsRoot';

const isMobile = device.isMobile;
const PAGE_SIZE = 50;

type Props = { readonly employeeId: string };

export function EmployeeActivityPanel({ employeeId }: Props) {
  const { t } = useTranslation();
  const employees = useEmployeeStore((s) => s.items);
  const isRoot = useIsRoot();

  const fetchers = useMemo<ActivityPageFetcher[]>(
    () => [
      (cursor) =>
        activityLoggerV2Connector.getByActor({
          actorId: employeeId,
          clientId: resolveClientCode(),
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        }),

      ...(appActivityLoggerV1InternalAccessKey
        ? [
            ((cursor) =>
              activityLoggerConnector.getByActor({
                actorId: employeeId,
                clientId: resolveClientCode(),
                limit: PAGE_SIZE,
                ...(cursor ? { cursor } : {}),
              })) satisfies ActivityPageFetcher,
          ]
        : []),
    ],
    [employeeId],
  );

  const {
    entries: activities,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore: handleLoadMore,
  } = useActivityHistory(fetchers);

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
          {hasMore && (
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
