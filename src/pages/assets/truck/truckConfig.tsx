import type { ReactNode } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { IconTruck } from '@tabler/icons-react';
import type { DataTableColumn } from '@credo/base-ui/components';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import type { TruckAssetRow } from '@/types';
import { SortHeader } from '@/components/SortHeader';
import { TruckExpiryLines } from './TruckExpiryLines';

type T = (key: string) => string;

export type TruckColumnsContext = {
  t: T;
  typeLabels: Map<string, string>;
  formatDate: (iso: string) => string;
  todayIso: string;

  sortField?: string;
  onSortChange?: (field: string) => void;
};

export type TruckConfig = {
  routes: { LIST: string; NEW: string; DETAIL: string; EDIT: string };

  i18nKey: string;
  Icon: typeof IconTruck;
  columns: (ctx: TruckColumnsContext) => DataTableColumn<TruckAssetRow>[];
  cardSubtitle: (item: TruckAssetRow) => ReactNode;
  searchFields: (item: TruckAssetRow) => (string | undefined)[];
};

function dimmed(value: string | number | undefined): ReactNode {
  return value !== undefined && value !== '' ? (
    <Text size="sm">{value}</Text>
  ) : (
    <Text size="sm" c="dimmed">
      —
    </Text>
  );
}

export const TRUCK_CONFIG: TruckConfig = {
  routes: ROUTES.ASSETS.TRUCKS,
  i18nKey: 'assets.truck',
  Icon: IconTruck,
  columns: ({ t, typeLabels, formatDate, todayIso, sortField, onSortChange }) => [
    {
      key: 'name',
      header: t('common.labels.name'),
      width: '240px',
      render: (item) => {
        const typeValue = item.extra?.truckType;
        const typeLabel = typeValue ? (typeLabels.get(typeValue) ?? typeValue) : undefined;
        return (
          <Stack gap={2}>
            <Text fz="md" fw={600} lh={1.25}>
              {item.name}
            </Text>
            <Group gap={6} wrap="nowrap">
              {typeLabel && <ColorBadge size="xs" label={typeLabel} />}
              <CodeLabel code={item.code} size="sm" />
            </Group>
          </Stack>
        );
      },
    },
    {
      key: 'plate',
      header: t('assets.truck.columns.plate'),
      render: (item) => <CodeLabel code={item.extra?.plateNumber} size="sm" />,
    },
    {
      key: 'capacity',
      header: t('assets.truck.columns.capacity'),
      render: (i) =>
        i.extra?.capacityTons != null
          ? dimmed(`${i.extra.capacityTons.toLocaleString()} t`)
          : dimmed(undefined),
    },
    {
      key: 'driver',
      header: t('assets.truck.columns.driver'),
      render: (i) => {
        const name = i.extra?.driverName;
        if (!name) return dimmed(undefined);
        return (
          <Stack gap={0}>
            <Text size="sm">{name}</Text>
            {i.extra?.driverPhone && (
              <Text size="xs" c="dimmed">
                {i.extra.driverPhone}
              </Text>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'expiry',

      header: (
        <SortHeader
          label={t('assets.truck.columns.compliance')}
          field="expiry"
          current={sortField}
          onChange={onSortChange}
          firstDir="asc"
        />
      ),

      render: (i) => (
        <TruckExpiryLines extra={i.extra} todayIso={todayIso} t={t} formatDate={formatDate} />
      ),
    },
    {
      key: 'status',
      header: t('__new__.01-common.labels.status'),
      ta: 'right',
      render: (item) => (
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
  cardSubtitle: (item) => {
    const e = item.extra;
    const parts = [
      e?.plateNumber,
      e?.capacityTons != null ? `${e.capacityTons.toLocaleString()} t` : undefined,
      e?.driverName,
    ].filter((v): v is string => !!v);
    return parts.length ? parts.join(' · ') : undefined;
  },
  searchFields: (item) => [
    item.name,
    item.code,
    item.extra?.plateNumber,
    item.extra?.driverName,
    item.extra?.engineNumber,
    item.extra?.chassisNumber,
  ],
};
