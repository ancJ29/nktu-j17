import { Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBuildingWarehouse, IconCalendar, IconPlant2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ListCardList } from '@/components/ListCardList';
import { formatPlannedDate } from '@/utils/cropSchedule';
import type { Crop } from '@/types';
import { CropStatusBadge } from './CropStatusBadge';

type CropCardListProps = {
  readonly crops: Crop[];
  readonly isLoading?: boolean;
};

function CropCardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="40%" />
      </Stack>
    </Card>
  );
}

export function CropCardList({ crops, isLoading }: CropCardListProps) {
  const { t } = useTranslation();

  return (
    <ListCardList
      data={crops}
      isLoading={isLoading}
      detailRoute={ROUTES.CROPS.DETAIL}
      renderSkeleton={() => <CropCardSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconPlant2 size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('crops.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('crops.emptyMessage')}
            </Text>
          </Stack>
        </Card>
      }
      renderCard={(item) => (
        <Stack gap={4}>
          <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
            <Text fw={700} size="sm" lh={1.25} truncate style={{ flex: 1 }}>
              {item.name}
            </Text>
            <CropStatusBadge status={item.status} />
          </Group>
          <Group gap={6} wrap="wrap">
            <Text
              size="xs"
              c="dimmed"
              ff="monospace"
              tt="uppercase"
              fw={500}
              style={{ letterSpacing: 0.3 }}
            >
              {item.code}
            </Text>
            <Group gap={4} wrap="nowrap">
              <IconBuildingWarehouse size={12} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">
                {item.greenhouseCode}
              </Text>
            </Group>
            {item.extra?.fromDate && item.extra?.toDate && (
              <Group gap={4} wrap="nowrap">
                <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  {formatPlannedDate(item.extra.fromDate)} – {formatPlannedDate(item.extra.toDate)}
                </Text>
              </Group>
            )}
          </Group>
        </Stack>
      )}
    />
  );
}
