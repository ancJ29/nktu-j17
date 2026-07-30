import { useMemo } from 'react';
import { IconPlant2 } from '@tabler/icons-react';
import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Greenhouse } from '@/types';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';
import { CropLink } from '@/components/CropLink';
import { CodeLabel } from '@credo/base-ui/components';
import { FREE_OCCUPANCY, type GreenhouseOccupancy } from '@/utils/greenhouseOccupancy';
import { GreenhouseOccupancyBadge } from './GreenhouseOccupancyBadge';
import { freeFromDate, occupancyDetail } from './occupancyPresentation';
import { formatPlannedDate } from '@/utils/cropSchedule';

type GreenhouseDataTableProps = {
  readonly greenhouses: Greenhouse[];
  readonly isLoading?: boolean;

  readonly occupancyByGreenhouse?: Map<string, GreenhouseOccupancy>;

  readonly activeCropCounts?: Map<string, number>;

  readonly onAddCrop?: (greenhouse: Greenhouse) => void;
};

export function GreenhouseDataTable({
  greenhouses,
  isLoading,
  occupancyByGreenhouse,
  activeCropCounts,
  onAddCrop,
}: GreenhouseDataTableProps) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.labels.name'),
        width: '250px',
        render: (item: Greenhouse) => (
          <Stack gap={2}>
            <Text fz="md" fw={600} lh={1.25}>
              {item.name}
            </Text>
            <CodeLabel code={item.code} size="sm" />
            {item.description && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.description}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'area',
        header: t('greenhouses.columns.area'),

        render: (item: Greenhouse) => {
          const capacity = item.extra?.plantCapacity;
          if (item.area <= 0 && !capacity) {
            return (
              <Text size="sm" c="dimmed">
                —
              </Text>
            );
          }
          return (
            <Stack gap={2}>
              {item.area > 0 && (
                <Text size="sm">{t('greenhouses.areaValue', { value: item.area })}</Text>
              )}
              {!!capacity && (
                <Text size="xs" c="dimmed">
                  {t('greenhouses.capacityValue', { value: capacity.toLocaleString() })}
                </Text>
              )}
            </Stack>
          );
        },
      },

      ...(occupancyByGreenhouse
        ? [
            {
              key: 'occupancy',
              header: t('greenhouses.columns.occupancy'),
              render: (item: Greenhouse) => {
                const occupancy = occupancyByGreenhouse.get(item.code) ?? FREE_OCCUPANCY;
                const detail = occupancyDetail(occupancy);
                const freeFrom = freeFromDate(occupancy);
                const extra = (activeCropCounts?.get(item.code) ?? 0) - 1;
                return (
                  <Stack gap={2}>
                    <Group gap={6} wrap="nowrap">
                      <GreenhouseOccupancyBadge occupancy={occupancy} />
                      {detail && (
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                          {t(detail.key, detail.values)}
                        </Text>
                      )}
                      {freeFrom && (
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                          ·{' '}
                          {t('greenhouses.occupancy.freeFrom', {
                            date: formatPlannedDate(freeFrom),
                          })}
                        </Text>
                      )}
                    </Group>
                    {occupancy.crop && (
                      <Group gap={4} wrap="nowrap">
                        <CropLink code={occupancy.crop.code} size="sm" />
                        {extra > 0 && (
                          <Text size="xs" c="dimmed">
                            {t('greenhouses.occupancy.moreCrops', { n: extra })}
                          </Text>
                        )}
                      </Group>
                    )}
                  </Stack>
                );
              },
            },
          ]
        : []),
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        ta: 'right' as const,
        render: (item: Greenhouse) => (
          <Group justify="flex-end" wrap="nowrap" pr="sm">
            <ActiveBadge
              isActive={item.isActive}
              activeLabel={t('__new__.01-common.labels.active')}
              inactiveLabel={t('__new__.01-common.labels.inactive')}
              size="sm"
            />
          </Group>
        ),
      },

      ...(onAddCrop
        ? [
            {
              key: '__cropActions',
              header: '',
              width: '56px',
              render: (item: Greenhouse) => (
                <Group gap={2} wrap="nowrap" justify="flex-end">
                  <Tooltip label={t('greenhouses.rowAddCrop')} withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={t('greenhouses.rowAddCrop')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCrop(item);
                      }}
                    >
                      <IconPlant2 size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]
        : []),
    ],
    [t, occupancyByGreenhouse, activeCropCounts, onAddCrop],
  );

  return (
    <ListDataTable
      data={greenhouses}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('greenhouses.noItems')}
      detailRoute={ROUTES.GREENHOUSES.DETAIL}
    />
  );
}
