import { Box, Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCopy, IconEdit } from '@tabler/icons-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { cMngtConnector } from '@credo/connectors/connector';
import { ActiveBadge } from '@/components/badges';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { NotFoundState } from '@/components/NotFoundState';
import { useTruckAssetStore, TRUCK_ASSET_RECORD_TARGET } from '@/stores/useTruckAssetStore';
import { perms } from '@/utils/permission';
import type { TruckAssetCopyFrom, TruckAssetRow } from '@/types';
import { TRUCK_CONFIG } from '../truckConfig';
import { TruckDangerZone } from '../TruckDangerZone';

const isMobile = device.isMobile;
const canEdit = perms.truck.canEdit();
const canCreate = perms.truck.canCreate();

type TruckDetailShellProps = {
  headerStats?: (truck: TruckAssetRow) => ReactNode;

  children: (truck: TruckAssetRow, dangerZone: ReactNode) => ReactNode;
};

export function TruckDetailShell({ headerStats, children }: TruckDetailShellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { Icon, routes } = TRUCK_CONFIG;

  const [truck, setTruck] = useState<TruckAssetRow | null>(null);
  const [loading, setLoading] = useState(true);

  const handleCopy = useCallback(() => {
    if (!truck) return;
    const e = truck.extra ?? {};
    const copyFrom: TruckAssetCopyFrom = {
      copyFromId: truck.id,
      name: truck.name,
      description: truck.description,
      truckType: e.truckType,
      makeModel: e.makeModel,
      model: e.model,
      year: e.year,
      capacityTons: e.capacityTons,
      boxType: e.boxType,
      boxLengthMm: e.boxLengthMm,
      boxWidthMm: e.boxWidthMm,
      boxHeightMm: e.boxHeightMm,
      boxVolumeM3: e.boxVolumeM3,
      tireSize: e.tireSize,
      baseLocation: e.baseLocation,
      region: e.region,
      notes: e.notes,
    };
    navigate(routes.NEW, { state: { copyFrom } });
  }, [truck, navigate, routes.NEW]);

  useEffect(() => {
    if (!id) return;
    const cached = useTruckAssetStore.getState().getById(id) as TruckAssetRow | undefined;
    if (cached && !cached.extra?.isDeleted) {
      setTruck(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    asyncDeduplicator.call(`truck-asset:${id}`, async () => {
      await cMngtConnector
        .getSingleRecordById(TRUCK_ASSET_RECORD_TARGET, { id })
        .then((res) => {
          const row = res.item as TruckAssetRow;
          setTruck(row.extra?.isDeleted ? null : row);
        })
        .catch(() => {
          notifications.show({ color: 'red', message: t('assets.notifications.fetchError') });
          setTruck(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t]);

  if (loading) return null;
  if (!truck) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={routes.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const headerCard = (
    <Card
      withBorder
      radius="md"
      padding={isMobile ? 'md' : 'lg'}
      style={{
        background:
          'linear-gradient(180deg, var(--mantine-color-body), var(--mantine-color-default-hover))',
      }}
    >
      <Group gap={isMobile ? 'sm' : 'lg'} wrap="nowrap" align="flex-start" justify="space-between">
        <Group
          gap={isMobile ? 'sm' : 'lg'}
          wrap="nowrap"
          align="flex-start"
          style={{ minWidth: 0 }}
        >
          <ThemeIcon size={isMobile ? 56 : 80} radius={12} variant="light" color="primary">
            <Icon size={isMobile ? 28 : 40} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={8} wrap="wrap" align="center">
              <Title order={isMobile ? 5 : 3} lh={1.2}>
                {truck.name}
              </Title>
              <ActiveBadge
                isActive={truck.isActive}
                activeLabel={t('__new__.01-common.labels.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                size="sm"
              />
            </Group>
            <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
              {truck.code}
            </Text>
          </Stack>
        </Group>
        {!isMobile && headerStats?.(truck)}
      </Group>
      {isMobile && headerStats && <Box mt="md">{headerStats(truck)}</Box>}
    </Card>
  );

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {!isMobile && (
        <Group justify="space-between">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
          <Group gap="xs">
            {canCreate && (
              <Button
                onClick={handleCopy}
                variant="default"
                size="compact-sm"
                leftSection={<IconCopy size={14} />}
              >
                {t('__new__.01-common.actions.copy')}
              </Button>
            )}
            {canEdit && (
              <Button
                component={Link}
                to={routes.EDIT.replace(':id', truck.id)}
                variant="light"
                size="compact-sm"
                leftSection={<IconEdit size={14} />}
              >
                {t('__new__.01-common.actions.edit')}
              </Button>
            )}
          </Group>
        </Group>
      )}

      {headerCard}

      {/* No mobile Edit affordance, deliberately: the truck form redirects every
          mobile visitor back to the list (`TruckAssetFormPage`), so a phone-width
          Edit button navigated to a page that immediately bounced. Editing a
          truck is desktop-only, like the danger zone and every other form. */}
      {children(truck, <TruckDangerZone truck={truck} onUpdated={setTruck} />)}
    </Stack>
  );
}
