import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBucketDroplet,
  IconDroplet,
  IconEdit,
  IconInfoCircle,
  IconNote,
  IconRefresh,
  IconRuler2,
  IconTruckLoading,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Tabs } from '@credo/base-ui/components';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { ActiveBadge } from '@/components/badges';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { StatPill } from '@/components/StatPill';
import { NotFoundState } from '@/components/NotFoundState';
import { useOilTankStore, OIL_TANK_RECORD_TARGET } from '@/stores/useOilTankStore';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { featureFlags } from '@/utils/features';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import type { OilTankRow, TruckAssetRow } from '@/types';
import { OperationLogSection } from '@/pages/operation-logs/OperationLogSection';
import { OilTankDangerZone } from './OilTankDangerZone';
import { OIL_TANK_ISSUE_LOG_CONFIG, OIL_TANK_REFILL_LOG_CONFIG } from './oilTankLogConfigs';
import { recomputeTankLevel } from './tankMovements';
import { LEVEL_TONE_COLOR, barPercent, fillPercent, levelTone } from './oilTankLevel';

const isMobile = device.isMobile;
const canEdit = perms.oilTank.canEdit();

const TANK_LOG_PERMS = {
  canView: perms.oilTank.canView(),
  canCreate: perms.oilTank.canCreate(),
  canEdit: perms.oilTank.canEdit(),
  canDelete: perms.oilTank.canDelete(),
};

function useIssueTruckOptions() {
  const enabled = featureFlags.trucks.enabled && perms.truck.canView();
  const items = useTruckAssetStore((s) => s.items);
  const initialized = useTruckAssetStore((s) => s.initialized);
  const loadAll = useTruckAssetStore((s) => s.loadAll);
  useEffect(() => {
    if (enabled && !initialized) loadAll();
  }, [enabled, initialized, loadAll]);
  return useMemo(() => {
    if (!enabled) return undefined;
    return (items as TruckAssetRow[])
      .filter((truck) => truck.isActive && !truck.extra?.isDeleted)
      .map((truck) => ({
        value: truck.id,
        label: truck.extra?.plateNumber ? `${truck.name} · ${truck.extra.plateNumber}` : truck.name,
        code: truck.code,
        driverName: truck.extra?.driverName,
      }));
  }, [enabled, items]);
}

export function OilTankDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const truckOptions = useIssueTruckOptions();

  const [fetched, setFetched] = useState<OilTankRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [recomputing, setRecomputing] = useState(false);

  const stored = useOilTankStore((s) =>
    id ? (s.items.find((r) => r.id === id) as OilTankRow | undefined) : undefined,
  );
  const tank = stored ?? fetched;

  useEffect(() => {
    if (!id) return;
    const cached = useOilTankStore.getState().getById(id) as OilTankRow | undefined;
    if (cached) {
      setFetched(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    asyncDeduplicator.call(`oil-tank:${id}`, async () => {
      await cMngtConnector
        .getSingleRecordById(OIL_TANK_RECORD_TARGET, { id })
        .then((res) => setFetched(res.item as OilTankRow))
        .catch(() => {
          notifications.show({ color: 'red', message: t('oilTanks.notifications.fetchError') });
          setFetched(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t]);

  const handleUpdated = useCallback((next: OilTankRow) => setFetched(next), []);

  const handleRecompute = useCallback(async () => {
    if (!id) return;
    setRecomputing(true);
    try {
      const result = await recomputeTankLevel(id);
      setFetched(
        (await cMngtConnector.getSingleRecordById(OIL_TANK_RECORD_TARGET, { id }))
          .item as OilTankRow,
      );
      notifications.show({
        color: result.drift === 0 ? 'green' : 'yellow',
        message:
          result.drift === 0
            ? t('oilTanks.notifications.recomputeClean', { count: result.movementCount })
            : t('oilTanks.notifications.recomputeDrift', {
                drift: result.drift > 0 ? `+${result.drift}` : String(result.drift),
              }),
        autoClose: result.drift === 0 ? 4000 : 10000,
      });
    } catch {
      notifications.show({ color: 'red', message: t('oilTanks.notifications.recomputeError') });
    } finally {
      setRecomputing(false);
    }
  }, [id, t]);

  if (loading) return null;

  if (!tank || tank.extra?.isDeleted) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.OIL_TANKS.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const extra = tank.extra ?? {};
  const pct = fillPercent(extra);
  const barPct = barPercent(extra);
  const tone = levelTone(extra);
  const hasLevel = typeof extra.currentLevel === 'number';

  const statbook = (
    <Group gap="xs" wrap={isMobile ? 'wrap' : 'nowrap'} style={{ flexShrink: 0 }}>
      <StatPill
        icon={<IconDroplet size={isMobile ? 12 : 14} />}
        label={t('oilTanks.detail.statLevel')}
        value={hasLevel ? formatNumber(extra.currentLevel) : '—'}
        suffix={hasLevel ? t('oilTanks.unitLitre') : undefined}

        tone={tone === 'danger' || tone === 'warning' ? 'danger' : hasLevel ? 'neutral' : 'dim'}
        compact={isMobile}
      />
      <StatPill
        icon={<IconRuler2 size={isMobile ? 12 : 14} />}
        label={t('oilTanks.detail.statCapacity')}
        value={extra.capacity ? formatNumber(extra.capacity) : '—'}
        suffix={extra.capacity ? t('oilTanks.unitLitre') : undefined}
        compact={isMobile}
      />
    </Group>
  );

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
            <IconBucketDroplet size={isMobile ? 28 : 40} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={8} wrap="wrap" align="center">
              <Title order={isMobile ? 5 : 3} lh={1.2}>
                {tank.name}
              </Title>
              <ActiveBadge
                isActive={tank.isActive}
                activeLabel={t('__new__.01-common.labels.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                size="sm"
              />
            </Group>
            <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
              {tank.code}
            </Text>
          </Stack>
        </Group>
        {!isMobile && statbook}
      </Group>
      {isMobile && <Box mt="md">{statbook}</Box>}
      {/* The bar can only draw to the end of its track, so past capacity it says
          "full" and nothing more — the percentage beside it is what carries how
          far past. Printed only when over capacity: below it the bar is already
          the whole answer, and a number on every tank would be noise. */}
      {barPct !== null && tone && (
        <Group gap="sm" wrap="nowrap" align="center" mt={isMobile ? 'sm' : 'md'}>
          <Progress value={barPct} size="sm" color={LEVEL_TONE_COLOR[tone]} style={{ flex: 1 }} />
          {tone === 'overfilled' && pct !== null && (
            <Text size="sm" fw={700} c={LEVEL_TONE_COLOR.overfilled} style={{ flexShrink: 0 }}>
              {`${pct}%`}
            </Text>
          )}
        </Group>
      )}
    </Card>
  );

  const infoCard = (
    <SectionCard icon={<IconInfoCircle size={14} />} title={t('oilTanks.detail.infoTitle')}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.name')}>{tank.name}</DetailField>
        <DetailField label={t('common.labels.code')}>
          <Text span ff="monospace" fw={500} tt="uppercase">
            {tank.code}
          </Text>
        </DetailField>
        <DetailField label={t('oilTanks.form.fuelTypeLabel')}>{extra.fuelType || '—'}</DetailField>
        <DetailField label={t('oilTanks.form.locationLabel')}>{extra.location || '—'}</DetailField>
        <DetailField label={t('oilTanks.form.capacityLabel')}>
          {extra.capacity ? `${formatNumber(extra.capacity)} ${t('oilTanks.unitLitre')}` : '—'}
        </DetailField>
        <DetailField label={t('oilTanks.detail.statLevel')}>
          {hasLevel ? `${formatNumber(extra.currentLevel)} ${t('oilTanks.unitLitre')}` : '—'}
        </DetailField>
      </SimpleGrid>
    </SectionCard>
  );

  const notesCard = (
    <SectionCard icon={<IconNote size={14} />} title={t('__new__.01-common.labels.note')}>
      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} c={extra.note ? undefined : 'dimmed'}>
        {extra.note || '—'}
      </Text>
      <Divider />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('oilTanks.form.openingLevelLabel')}>
          {typeof extra.openingLevel === 'number'
            ? `${formatNumber(extra.openingLevel)} ${t('oilTanks.unitLitre')}`
            : '—'}
        </DetailField>
        <DetailField label={t('oilTanks.form.openingDateLabel')}>
          {extra.openingDate ? formatDate(extra.openingDate) : '—'}
        </DetailField>
      </SimpleGrid>
      {!isMobile && (
        <>
          <Divider />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <DetailField label={t('common.labels.createdAt')}>
              {formatDateTime(tank.createdAt)}
            </DetailField>
            <DetailField label={t('common.labels.updatedAt')}>
              {formatDateTime(tank.updatedAt)}
            </DetailField>
          </SimpleGrid>
        </>
      )}
    </SectionCard>
  );

  const infoSection = isMobile ? (
    <Stack gap="md">
      {infoCard}
      {notesCard}
      <OilTankDangerZone tank={tank} onUpdated={handleUpdated} />
    </Stack>
  ) : (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>{infoCard}</Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {notesCard}
          <OilTankDangerZone tank={tank} onUpdated={handleUpdated} />
        </Stack>
      </Grid.Col>
    </Grid>
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
            {/* The reader that makes the cached balance falsifiable. Gated on
                canEdit because it writes; desktop-only like every other repair
                affordance. */}
            {canEdit && (
              <Button
                onClick={handleRecompute}
                loading={recomputing}
                variant="subtle"
                size="compact-sm"
                leftSection={<IconRefresh size={14} />}
              >
                {t('oilTanks.detail.recompute')}
              </Button>
            )}
            {canEdit && (
              <Button
                component={Link}
                to={ROUTES.OIL_TANKS.EDIT.replace(':id', tank.id)}
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

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden' }}>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            {t('oilTanks.detail.tabs.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="refill" leftSection={<IconDroplet size={16} />}>
            {t('oilTanks.detail.tabs.refill')}
          </Tabs.Tab>
          <Tabs.Tab value="issue" leftSection={<IconTruckLoading size={16} />}>
            {t('oilTanks.detail.tabs.issue')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {infoSection}
        </Tabs.Panel>

        {/* Each ledger tab is lazy-mounted — its operation-log partition is only
            fetched when the tab is first opened, the same as the truck's. */}
        <Tabs.Panel value="refill" pt="md">
          {activeTab === 'refill' && (
            <OperationLogSection
              config={OIL_TANK_REFILL_LOG_CONFIG}
              targetId={tank.id}
              targetCode={tank.code}
              perms={TANK_LOG_PERMS}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="issue" pt="md">
          {activeTab === 'issue' && (
            <OperationLogSection
              config={OIL_TANK_ISSUE_LOG_CONFIG}
              targetId={tank.id}
              targetCode={tank.code}
              perms={TANK_LOG_PERMS}

              context={{ tankCurrentLevel: extra.currentLevel, truckOptions }}
            />
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
