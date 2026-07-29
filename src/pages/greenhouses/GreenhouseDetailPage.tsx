import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBuildingWarehouse,
  IconEdit,
  IconInfoCircle,
  IconNote,
  IconPlant2,
  IconRuler2,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { ActiveBadge } from '@/components/badges';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { StatPill } from '@/components/StatPill';
import { NotFoundState } from '@/components/NotFoundState';
import { useGreenhouseStore, GREENHOUSE_RECORD_TARGET } from '@/stores/useGreenhouseStore';
import { useCropStore } from '@/stores/useCropStores';
import { GreenhouseCropsSection } from '@/pages/crops';
import { formatDateTime } from '@/utils/dateFormat';
import { perms } from '@/utils/permission';
import type { Greenhouse } from '@/types';

const isMobile = device.isMobile;
const canEdit = perms.greenhouse.canEdit();
const canViewCrops = perms.crop.canView();

export function GreenhouseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [greenhouse, setGreenhouse] = useState<Greenhouse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const cached = useGreenhouseStore.getState().getById(id) as Greenhouse | undefined;
    if (cached) {
      setGreenhouse(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    asyncDeduplicator.call(`greenhouse:${id}`, async () => {
      await cMngtConnector
        .getSingleRecordById(GREENHOUSE_RECORD_TARGET, { id })
        .then((res) => setGreenhouse(res.item as Greenhouse))
        .catch(() => {
          notifications.show({ color: 'red', message: t('greenhouses.notifications.fetchError') });
          setGreenhouse(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t]);

  const allCrops = useCropStore((s) => s.items);
  const cropsInitialized = useCropStore((s) => s.initialized);
  const loadCrops = useCropStore((s) => s.loadAll);
  useEffect(() => {
    if (canViewCrops && !cropsInitialized) loadCrops();
  }, [cropsInitialized, loadCrops]);
  const activeCount = useMemo(
    () =>
      greenhouse && canViewCrops
        ? allCrops.filter((c) => c.greenhouseCode === greenhouse.code).length
        : 0,
    [allCrops, greenhouse],
  );

  if (loading) return null;
  if (!greenhouse) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.GREENHOUSES.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const extra = greenhouse.extra ?? {};
  const hasArea = greenhouse.area > 0;

  const statbook = (
    <Group gap="xs" wrap={isMobile ? 'wrap' : 'nowrap'} style={{ flexShrink: 0 }}>
      <StatPill
        icon={<IconRuler2 size={isMobile ? 12 : 14} />}
        label={t('greenhouses.detail.statArea')}
        value={hasArea ? greenhouse.area.toLocaleString() : '—'}
        suffix={hasArea ? 'm²' : undefined}
        compact={isMobile}
      />
      {canViewCrops && (
        <StatPill
          icon={<IconPlant2 size={isMobile ? 12 : 14} />}
          label={t('greenhouses.detail.statActiveCrops')}
          value={activeCount.toLocaleString()}
          tone={activeCount > 0 ? 'neutral' : 'dim'}
          compact={isMobile}
        />
      )}
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
            <IconBuildingWarehouse size={isMobile ? 28 : 40} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={8} wrap="wrap" align="center">
              <Title order={isMobile ? 5 : 3} lh={1.2}>
                {greenhouse.name}
              </Title>
              <ActiveBadge
                isActive={greenhouse.isActive}
                activeLabel={t('__new__.01-common.labels.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                size="sm"
              />
            </Group>
            <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
              {greenhouse.code}
            </Text>
          </Stack>
        </Group>
        {!isMobile && statbook}
      </Group>
      {isMobile && <Box mt="md">{statbook}</Box>}
    </Card>
  );

  const infoCard = (
    <SectionCard icon={<IconInfoCircle size={14} />} title={t('greenhouses.detail.infoTitle')}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.name')}>{greenhouse.name}</DetailField>
        <DetailField label={t('common.labels.code')}>
          <Text span ff="monospace" fw={500} tt="uppercase">
            {greenhouse.code}
          </Text>
        </DetailField>
        <DetailField label={t('greenhouses.columns.area')}>
          {hasArea ? t('greenhouses.areaValue', { value: greenhouse.area }) : '—'}
        </DetailField>
      </SimpleGrid>
      <DetailField label={t('common.labels.description')}>
        {greenhouse.description ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {greenhouse.description}
          </Text>
        ) : (
          '—'
        )}
      </DetailField>
    </SectionCard>
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
              {formatDateTime(greenhouse.createdAt)}
            </DetailField>
            <DetailField label={t('common.labels.updatedAt')}>
              {formatDateTime(greenhouse.updatedAt)}
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
    </Stack>
  ) : (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>{infoCard}</Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>{notesCard}</Grid.Col>
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
          {canEdit && (
            <Button
              component={Link}
              to={ROUTES.GREENHOUSES.EDIT.replace(':id', greenhouse.id)}
              variant="light"
              size="compact-sm"
              leftSection={<IconEdit size={14} />}
            >
              {t('__new__.01-common.actions.edit')}
            </Button>
          )}
        </Group>
      )}

      {headerCard}

      {isMobile && canEdit && (
        <Button
          component={Link}
          to={ROUTES.GREENHOUSES.EDIT.replace(':id', greenhouse.id)}
          variant="light"
          size="sm"
          leftSection={<IconEdit size={16} />}
          fullWidth
        >
          {t('__new__.01-common.actions.edit')}
        </Button>
      )}

      {infoSection}

      {canViewCrops && <GreenhouseCropsSection greenhouse={greenhouse} />}
    </Stack>
  );
}
