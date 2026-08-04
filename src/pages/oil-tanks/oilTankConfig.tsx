import type { ReactNode } from 'react';
import { Group, Progress, Stack, Text } from '@mantine/core';
import { IconBucketDroplet } from '@tabler/icons-react';
import type { DataTableColumn } from '@credo/base-ui/components';
import { CodeLabel } from '@credo/base-ui/components';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import type { OilTankRow } from '@/types';
import { fillPercent, levelTone } from './oilTankLevel';

type T = (key: string, options?: Record<string, unknown>) => string;

export type OilTankColumnsContext = {
  t: T;
  formatNumber: (value: number | undefined) => string;
};

function dimmed(value: string | undefined): ReactNode {
  return value ? (
    <Text size="sm">{value}</Text>
  ) : (
    <Text size="sm" c="dimmed">
      —
    </Text>
  );
}

const TONE_COLOR = { danger: 'red', warning: 'orange', neutral: 'primary' } as const;

export function levelCell(item: OilTankRow, t: T, formatNumber: (v?: number) => string): ReactNode {
  const { currentLevel, capacity } = item.extra ?? {};
  if (typeof currentLevel !== 'number') {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  const pct = fillPercent(item.extra);
  const tone = levelTone(item.extra);
  return (
    <Stack gap={4} miw={110}>
      <Group gap={4} wrap="nowrap" justify="flex-end">
        <Text size="sm" fw={600} c={tone && tone !== 'neutral' ? TONE_COLOR[tone] : undefined}>
          {formatNumber(currentLevel)}
        </Text>
        {typeof capacity === 'number' && capacity > 0 && (
          <Text size="xs" c="dimmed">
            / {formatNumber(capacity)} {t('oilTanks.unitLitre')}
          </Text>
        )}
      </Group>
      {pct !== null && tone && <Progress value={pct} size="xs" color={TONE_COLOR[tone]} />}
    </Stack>
  );
}

export const OIL_TANK_CONFIG = {
  routes: ROUTES.OIL_TANKS,
  i18nKey: 'oilTanks',
  Icon: IconBucketDroplet,
  columns: ({ t, formatNumber }: OilTankColumnsContext): DataTableColumn<OilTankRow>[] => [
    {
      key: 'name',
      header: t('common.labels.name'),
      width: '260px',
      render: (item: OilTankRow) => (
        <Stack gap={2}>
          <Text fz="md" fw={600} lh={1.25}>
            {item.name}
          </Text>
          <CodeLabel code={item.code} size="sm" />
        </Stack>
      ),
    },
    {
      key: 'fuelType',
      header: t('oilTanks.columns.fuelType'),
      render: (item: OilTankRow) => dimmed(item.extra?.fuelType),
    },
    {
      key: 'location',
      header: t('oilTanks.columns.location'),
      render: (item: OilTankRow) => dimmed(item.extra?.location),
    },
    {
      key: 'level',
      header: t('oilTanks.columns.level'),
      ta: 'right',
      render: (item: OilTankRow) => levelCell(item, t, formatNumber),
    },
    {
      key: 'status',
      header: t('__new__.01-common.labels.status'),
      ta: 'right',
      render: (item: OilTankRow) => (
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
  cardSubtitle: (item: OilTankRow) => {
    const e = item.extra;
    const parts = [e?.fuelType, e?.location].filter((v): v is string => !!v);
    return parts.length ? parts.join(' · ') : undefined;
  },
  searchFields: (item: OilTankRow) => [
    item.name,
    item.code,
    item.extra?.fuelType,
    item.extra?.location,
  ],
};
