import { Card, Group, Progress, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import { CropLink } from '@/components/CropLink';
import { ListCardList } from '@/components/ListCardList';
import { CodeLabel } from '@credo/base-ui/components';
import type { Greenhouse } from '@/types';
import { FREE_OCCUPANCY, type GreenhouseOccupancy } from '@/utils/greenhouseOccupancy';
import { GreenhouseOccupancyBadge } from './GreenhouseOccupancyBadge';
import { freeFromDate, occupancyDetail, occupancyTone } from './occupancyPresentation';
import { formatPlannedDate } from '@/utils/cropSchedule';

type GreenhouseCardListProps = {
  readonly greenhouses: Greenhouse[];
  readonly isLoading?: boolean;

  readonly occupancyByGreenhouse?: Map<string, GreenhouseOccupancy>;

  readonly activeCropCounts?: Map<string, number>;
};

function GreenhouseCardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Skeleton h={44} w={44} radius={10} />
        <Stack gap={8} style={{ flex: 1 }}>
          <Skeleton h={14} w="55%" />
          <Skeleton h={10} w="40%" />
          <Skeleton h={16} w={72} radius="sm" />
        </Stack>
      </Group>
    </Card>
  );
}

export function GreenhouseCardList({
  greenhouses,
  isLoading,
  occupancyByGreenhouse,
  activeCropCounts,
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
      renderCard={(item) => {
        const occupancy = occupancyByGreenhouse?.get(item.code) ?? FREE_OCCUPANCY;
        const detail = occupancyDetail(occupancy);
        const extraCrops = (activeCropCounts?.get(item.code) ?? 0) - 1;
        const tone = occupancyTone(occupancy);
        const freeFrom = freeFromDate(occupancy);

        const progress =
          occupancy.state === 'growing' && occupancy.dayOfCycle && occupancy.totalDays
            ? Math.min(100, (occupancy.dayOfCycle / occupancy.totalDays) * 100)
            : null;
        return (
          <Group gap="sm" wrap="nowrap" align="flex-start">
            {/* The thumbnail slot the product card uses for an image. A greenhouse
                has none, so it carries the occupancy colour instead — the list's
                whole job is "which houses are free", and colour answers that
                before any text is read. */}
            <ThemeIcon size={44} radius={10} variant="light" color={tone}>
              <IconBuildingWarehouse size={22} stroke={1.6} />
            </ThemeIcon>

            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
                <Text fw={700} size="sm" lh={1.3} truncate style={{ flex: 1, minWidth: 0 }}>
                  {item.name}
                </Text>
                {/* Only the exception is badged. The list defaults to `active`, so
                    a green "HOẠT ĐỘNG" on every card is a constant — it spent the
                    card's loudest element on the one fact that never varies, while
                    the occupancy badge that does vary sat below it in xs. An
                    inactive house is genuinely worth flagging; an active one isn't. */}
                {!item.isActive && (
                  <ActiveBadge
                    isActive={false}
                    activeLabel={t('__new__.01-common.labels.active')}
                    inactiveLabel={t('__new__.01-common.labels.inactive')}
                    size="sm"
                    style={{ flexShrink: 0 }}
                  />
                )}
              </Group>

              <Group gap={6} wrap="nowrap" align="baseline" style={{ minWidth: 0 }}>
                <CodeLabel code={item.code} size="xs" />
                {item.area > 0 && (
                  <Text size="xs" c="dimmed" lh={1.2}>
                    {t('greenhouses.areaValue', { value: item.area })}
                  </Text>
                )}
                {!!item.extra?.plantCapacity && (
                  <Text size="xs" c="dimmed" lh={1.2}>
                    {t('greenhouses.capacityValue', {
                      value: item.extra.plantCapacity.toLocaleString(),
                    })}
                  </Text>
                )}
              </Group>

              {occupancyByGreenhouse && (
                <Stack gap={4}>
                  <Group gap={6} wrap="wrap" align="center">
                    <GreenhouseOccupancyBadge occupancy={occupancy} size="xs" />
                    {detail && (
                      <Text size="xs" c="dimmed" fw={500}>
                        {t(detail.key, detail.values)}
                      </Text>
                    )}
                    {freeFrom && (
                      <Text size="xs" c="dimmed">
                        {t('greenhouses.occupancy.freeFrom', {
                          date: formatPlannedDate(freeFrom),
                        })}
                      </Text>
                    )}
                  </Group>
                  {progress !== null && (
                    <Progress value={progress} color={tone} size="xs" radius="xl" />
                  )}
                  {occupancy.crop && (
                    <Group gap={4} wrap="nowrap">
                      <CropLink code={occupancy.crop.code} size="xs" />
                      {extraCrops > 0 && (
                        <Text size="xs" c="dimmed">
                          {t('greenhouses.occupancy.moreCrops', { n: extraCrops })}
                        </Text>
                      )}
                    </Group>
                  )}
                </Stack>
              )}
            </Stack>
          </Group>
        );
      }}
    />
  );
}
