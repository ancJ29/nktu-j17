import { useMemo } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { IconBuildingWarehouse, IconCalendar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Crop } from '@/types';
import { ListDataTable } from '@/components/ListDataTable';
import { formatPlannedDate } from '@/utils/cropSchedule';
import { CropStatusBadge } from './CropStatusBadge';

type CropDataTableProps = {
  readonly crops: Crop[];
  readonly isLoading?: boolean;
};

export function CropDataTable({ crops, isLoading }: CropDataTableProps) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.labels.name'),
        width: '250px',
        render: (item: Crop) => (
          <Stack gap={2}>
            <Text fz="md" fw={600} lh={1.25}>
              {item.name}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" tt="uppercase">
              {item.code}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'greenhouse',
        header: t('crops.columns.greenhouse'),
        render: (item: Crop) => (
          <Group gap={4} wrap="nowrap">
            <IconBuildingWarehouse size={14} color="var(--mantine-color-dimmed)" />
            <Text size="sm">{item.greenhouseCode}</Text>
          </Group>
        ),
      },
      {
        key: 'window',
        header: t('crops.columns.window'),
        render: (item: Crop) => {
          const { fromDate, toDate } = item.extra ?? {};
          return fromDate && toDate ? (
            <Group gap={4} wrap="nowrap">
              <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
              <Text size="sm">
                {formatPlannedDate(fromDate)} – {formatPlannedDate(toDate)}
              </Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          );
        },
      },
      {
        key: 'status',
        header: t('common.labels.status'),
        render: (item: Crop) => <CropStatusBadge status={item.status} />,
      },
    ],
    [t],
  );

  return (
    <ListDataTable
      data={crops}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('crops.noItems')}
      detailRoute={ROUTES.CROPS.DETAIL}
    />
  );
}
