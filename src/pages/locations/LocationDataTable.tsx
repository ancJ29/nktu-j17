import { useMemo } from 'react';
import { Badge, Group, Stack, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Location } from '@/types';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';

type LocationDataTableProps = {
  readonly locations: Location[];
  readonly isLoading?: boolean;
};

export function LocationDataTable({ locations, isLoading }: LocationDataTableProps) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.labels.name'),
        width: '250px',
        render: (item: Location) => (
          <Stack gap={2}>
            <Text fz="md" fw={600} lh={1.25}>
              {item.name}
            </Text>
            {item.description && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.description}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'code',
        header: t('common.labels.code'),
        render: (item: Location) => (
          <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" fw={500}>
            {item.code}
          </Text>
        ),
      },
      {
        key: 'kind',
        header: t('locations.columns.kind'),
        render: (item: Location) =>
          item.extra?.kind ? (
            <Badge variant="default" size="sm" radius="sm" tt="none">
              {item.extra.kind}
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          ),
      },
      {
        key: 'address',
        header: t('common.labels.address'),
        render: (item: Location) =>
          item.address ? (
            <Group gap={4} wrap="nowrap">
              <IconMapPin size={14} color="var(--mantine-color-dimmed)" />
              <Text size="sm" lineClamp={1}>
                {item.address}
              </Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          ),
      },
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        render: (item: Location) => (
          <ActiveBadge
            isActive={item.isActive}
            activeLabel={t('__new__.01-common.labels.active')}
            inactiveLabel={t('common.status.inactive')}
            size="sm"
          />
        ),
      },
    ],
    [t],
  );

  return (
    <ListDataTable
      data={locations}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('locations.noItems')}
      detailRoute={ROUTES.LOCATIONS.DETAIL}
    />
  );
}
