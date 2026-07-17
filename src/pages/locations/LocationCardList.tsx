import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import { ListCardList } from '@/components/ListCardList';
import type { Location } from '@/types';

type LocationCardListProps = {
  readonly locations: Location[];
  readonly isLoading?: boolean;
};

function LocationCardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="40%" />
        <Skeleton h={10} w="50%" />
      </Stack>
    </Card>
  );
}

export function LocationCardList({ locations, isLoading }: LocationCardListProps) {
  const { t } = useTranslation();

  return (
    <ListCardList
      data={locations}
      isLoading={isLoading}
      detailRoute={ROUTES.LOCATIONS.DETAIL}
      renderSkeleton={() => <LocationCardSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconMapPin size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('locations.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('locations.emptyMessage')}
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
            <ActiveBadge
              isActive={item.isActive}
              activeLabel={t('__new__.01-common.labels.active')}
              inactiveLabel={t('common.status.inactive')}
              size="sm"
              style={{ flexShrink: 0 }}
            />
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
            {item.extra?.kind && (
              <Badge variant="default" size="xs" radius="sm" tt="none">
                {item.extra.kind}
              </Badge>
            )}
          </Group>
          {item.address && (
            <Group gap={4} wrap="nowrap">
              <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.address}
              </Text>
            </Group>
          )}
        </Stack>
      )}
    />
  );
}
