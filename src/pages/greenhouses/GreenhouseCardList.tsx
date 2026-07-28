import { Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import { CropLinks } from '@/components/CropLink';
import { ListCardList } from '@/components/ListCardList';
import type { Greenhouse } from '@/types';

type GreenhouseCardListProps = {
  readonly greenhouses: Greenhouse[];
  readonly isLoading?: boolean;

  readonly cropCodesByGreenhouse?: Map<string, string[]>;
};

function GreenhouseCardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="40%" />
      </Stack>
    </Card>
  );
}

export function GreenhouseCardList({
  greenhouses,
  isLoading,
  cropCodesByGreenhouse,
}: GreenhouseCardListProps) {
  const { t } = useTranslation();

  return (
    <ListCardList
      data={greenhouses}
      isLoading={isLoading}
      detailRoute={ROUTES.GREENHOUSES.DETAIL}
      renderSkeleton={() => <GreenhouseCardSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconBuildingWarehouse size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('greenhouses.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('greenhouses.emptyMessage')}
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
              activeLabel={t('common.status.active')}
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
            {item.area > 0 && (
              <Text size="xs" c="dimmed">
                {t('greenhouses.areaValue', { value: item.area })}
              </Text>
            )}
          </Group>
          {(() => {
            const codes = cropCodesByGreenhouse?.get(item.code);
            return codes && codes.length > 0 ? <CropLinks codes={codes} size="xs" /> : null;
          })()}
        </Stack>
      )}
    />
  );
}
