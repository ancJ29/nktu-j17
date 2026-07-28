import {
  Box,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCopy, IconEdit, IconNote } from '@tabler/icons-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { cMngtConnector } from '@credo/connectors/connector';
import { ActiveBadge } from '@/components/badges';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { NotFoundState } from '@/components/NotFoundState';
import { useTruckAssetStore, TRUCK_ASSET_RECORD_TARGET } from '@/stores/useTruckAssetStore';
import { formatDateTime } from '@/utils/dateFormat';
import { perms } from '@/utils/permission';
import type { TruckAssetCopyFrom, TruckAssetRow } from '@/types';
import { TRUCK_CONFIG } from '../truckConfig';
import { TruckDangerZone } from '../TruckDangerZone';

const isMobile = device.isMobile;
const canEdit = perms.truck.canEdit();
const canCreate = perms.truck.canCreate();

type TruckDetailShellProps = {
  headerStats?: (truck: TruckAssetRow) => ReactNode;

  showNotes?: boolean;

  children: (truck: TruckAssetRow, dangerZone: ReactNode) => ReactNode;
};

export function TruckDetailShell({
  headerStats,
  showNotes = true,
  children,
}: TruckDetailShellProps) {
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

  const extra = truck.extra ?? {};

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
                activeLabel={t('common.status.active')}
                inactiveLabel={t('common.status.inactive')}
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

  const notesCard = (
    <SectionCard icon={<IconNote size={14} />} title={t('__new__.01-common.labels.note')}>
      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} c={extra.notes ? undefined : 'dimmed'}>
        {extra.notes || '—'}
      </Text>
      {!isMobile && (
        <>
          <Divider />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <DetailField label={t('common.labels.createdAt')}>
              {formatDateTime(truck.createdAt)}
            </DetailField>
            <DetailField label={t('common.labels.updatedAt')}>
              {formatDateTime(truck.updatedAt)}
            </DetailField>
          </SimpleGrid>
        </>
      )}
    </SectionCard>
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

      {isMobile && canEdit && (
        <Button
          component={Link}
          to={routes.EDIT.replace(':id', truck.id)}
          variant="light"
          size="sm"
          leftSection={<IconEdit size={16} />}
          fullWidth
        >
          {t('__new__.01-common.actions.edit')}
        </Button>
      )}

      {children(truck, <TruckDangerZone truck={truck} onUpdated={setTruck} />)}

      {showNotes && notesCard}
    </Stack>
  );
}
