

import type { ReactNode } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { IconTruck } from '@tabler/icons-react';
import type { DataTableColumn } from '@credo/base-ui/components';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import type { TruckAssetExtra, TruckAssetRow } from '@/types';

type T = (key: string) => string;

export type TruckColumnsContext = {
  t: T;
  typeLabels: Map<string, string>;
  formatDate: (iso: string) => string;
  todayIso: string;
};

export type TruckConfig = {
  routes: { LIST: string; NEW: string; DETAIL: string; EDIT: string };
  
  i18nKey: string;
  Icon: typeof IconTruck;
  columns: (ctx: TruckColumnsContext) => DataTableColumn<TruckAssetRow>[];
  cardSubtitle: (item: TruckAssetRow) => ReactNode;
  searchFields: (item: TruckAssetRow) => (string | undefined)[];
};

type ExpiryInfo = { date: string; kindKey: string; daysLeft: number; expired: boolean };

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function nearestExpiry(
  extra: TruckAssetExtra | undefined,
  todayIso: string,
): ExpiryInfo | null {
  if (!extra) return null;
  const candidates: { date?: string; kindKey: string }[] = [
    { date: extra.inspectionExpiry, kindKey: 'assets.truck.expiry.inspection' },
    { date: extra.badgeExpiry, kindKey: 'assets.truck.expiry.badge' },
    ...(extra.registrationType === 'copy'
      ? [{ date: extra.registrationCopyExpiry, kindKey: 'assets.truck.expiry.registration' }]
      : []),
    ...(extra.insurances ?? []).map((i) => ({
      date: i.expiry,
      kindKey: 'assets.truck.expiry.insurance',
    })),
  ];
  const dated = candidates.filter((c): c is { date: string; kindKey: string } => !!c.date);
  if (dated.length === 0) return null;
  
  dated.sort((a, b) => a.date.localeCompare(b.date));
  const soonest = dated[0];
  const daysLeft = daysBetween(todayIso, soonest.date);
  return { date: soonest.date, kindKey: soonest.kindKey, daysLeft, expired: daysLeft < 0 };
}

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
  columns: ({ t, typeLabels, formatDate, todayIso }) => [
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
      header: t('assets.truck.columns.compliance'),
      render: (i) => {
        const info = nearestExpiry(i.extra, todayIso);
        if (!info) return dimmed(undefined);
        const color = info.expired ? 'red' : info.daysLeft <= 30 ? 'orange' : undefined;
        return (
          <Stack gap={0}>
            <Text size="sm" c={color} fw={color ? 600 : undefined}>
              {formatDate(info.date)}
            </Text>
            <Text size="xs" c="dimmed">
              {t(info.kindKey)}
              {info.expired ? ` · ${t('assets.truck.expiry.expired')}` : ''}
            </Text>
          </Stack>
        );
      },
    },
    {
      key: 'status',
      header: t('__new__.01-common.labels.status'),
      ta: 'right',
      render: (item) => (
        <Group justify="flex-end" wrap="nowrap" pr="sm">
          <ActiveBadge
            isActive={item.isActive}
            activeLabel={t('common.status.active')}
            inactiveLabel={t('common.status.inactive')}
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
