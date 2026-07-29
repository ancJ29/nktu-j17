import { useMemo } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Greenhouse } from '@/types';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';
import { CropLinks } from '@/components/CropLink';
import { CodeLabel } from '@credo/base-ui/components';

type GreenhouseDataTableProps = {
  readonly greenhouses: Greenhouse[];
  readonly isLoading?: boolean;

  readonly cropCodesByGreenhouse?: Map<string, string[]>;
};

export function GreenhouseDataTable({
  greenhouses,
  isLoading,
  cropCodesByGreenhouse,
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
        render: (item: Greenhouse) =>
          item.area > 0 ? (
            <Text size="sm">{t('greenhouses.areaValue', { value: item.area })}</Text>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          ),
      },
      ...(cropCodesByGreenhouse
        ? [
            {
              key: 'crops',
              header: t('greenhouses.columns.crops'),
              render: (item: Greenhouse) => (
                <CropLinks codes={cropCodesByGreenhouse.get(item.code) ?? []} size="sm" />
              ),
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
    ],
    [t, cropCodesByGreenhouse],
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
