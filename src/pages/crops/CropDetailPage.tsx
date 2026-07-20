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
  IconFileText,
  IconInfoCircle,
  IconListDetails,
  IconNote,
  IconPackages,
  IconPlant2,
  IconRoute,
  IconSeeding,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { StatPill } from '@/components/StatPill';
import { NotFoundState } from '@/components/NotFoundState';
import { CropOccupancyError, fetchCropById, harvestCrop, plantCrop } from '@/stores/useCropStores';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { formatDateTime } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { formatPlannedDate } from '@/utils/cropSchedule';
import { perms } from '@/utils/permission';
import type { Crop } from '@/types';
import type { CropMaterialTotal } from '@/utils/cropMaterialSummary';
import { CropDiarySection, MaterialSummaryTable } from '@/pages/crop-diaries';
import { CropStatusBadge } from './CropStatusBadge';

const isMobile = device.isMobile;
const canEdit = perms.crop.canEdit();
const canViewDiary = perms.cropDiary.canView();

export function CropDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const employees = useEmployeeStore((s) => s.items);
  const templates = useCropDiaryTemplateStore((s) => s.items);

  
  
  
  const location = useLocation();
  const navState = location.state as {
    backTo?: string;
    backLabelKey?: 'crops.backToGreenhouse';
  } | null;
  const backTo = navState?.backTo ?? ROUTES.CROPS.LIST;

  const [crop, setCrop] = useState<Crop | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  
  
  const [materialSummary, setMaterialSummary] = useState<CropMaterialTotal[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>('details');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    
    setLoading(true);
    void fetchCropById(id)
      .then((c) => {
        if (cancelled) return;
        if (!c) notifications.show({ color: 'red', message: t('crops.notifications.fetchError') });
        setCrop(c);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const runTransition = useCallback(
    async (kind: 'plant' | 'harvest') => {
      if (!crop) return;
      setTransitioning(true);
      try {
        if (kind === 'plant') {
          const updated = await plantCrop(crop);
          setCrop(updated);
          notifications.show({ color: 'green', message: t('crops.notifications.plantSuccess') });
        } else {
          const archived = await harvestCrop(crop);
          notifications.show({ color: 'green', message: t('crops.notifications.harvestSuccess') });
          
          navigate(ROUTES.CROPS.DETAIL.replace(':id', archived.id), { replace: true });
        }
      } catch (err) {
        const message =
          err instanceof CropOccupancyError
            ? t('crops.notifications.occupied', { code: err.occupantCode })
            : err instanceof EntityConflictError
              ? t('common.conflict.message')
              : '';
        notifications.show({
          color: err instanceof EntityConflictError ? 'yellow' : 'red',
          title: t(
            kind === 'plant'
              ? 'crops.notifications.plantError'
              : 'crops.notifications.harvestError',
          ),
          message,
          autoClose: 8000,
        });
      } finally {
        setTransitioning(false);
      }
    },
    [crop, t, navigate],
  );

  const handlePlant = useCallback(() => runTransition('plant'), [runTransition]);
  const handleHarvest = useCallback(() => runTransition('harvest'), [runTransition]);

  if (loading) return null;
  if (!crop) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={backTo}
        backLabel={
          navState?.backLabelKey ? t(navState.backLabelKey) : t('common.notFound.backToList')
        }
      />
    );
  }

  const extra = crop.extra ?? {};
  const canPlant = canEdit && crop.status === 'planned';
  const canHarvest = canEdit && crop.status === 'growing';

  const picEmployee = extra.picId ? employees.find((e) => e.id === extra.picId) : undefined;
  const diaryTemplate = extra.diaryTemplateCode
    ? templates.find((tpl) => tpl.code === extra.diaryTemplateCode)
    : undefined;
  const hasSeeds = typeof extra.numberOfSeeds === 'number';

  
  const statbook = (
    <Group gap="xs" wrap={isMobile ? 'wrap' : 'nowrap'} style={{ flexShrink: 0 }}>
      <StatPill
        icon={<IconSeeding size={isMobile ? 12 : 14} />}
        label={t('crops.detail.statSeeds')}
        value={hasSeeds ? formatNumber(extra.numberOfSeeds) : '—'}
        tone={hasSeeds ? 'neutral' : 'dim'}
        compact={isMobile}
      />
    </Group>
  );

  
  const infoCard = (
    <SectionCard icon={<IconInfoCircle size={14} />} title={t('crops.detail.infoTitle')}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.name')}>{crop.name}</DetailField>
        <DetailField label={t('common.labels.code')}>
          <Text span ff="monospace" fw={500} tt="uppercase">
            {crop.code}
          </Text>
        </DetailField>
        <DetailField label={t('crops.columns.greenhouse')}>
          <Group gap={4} wrap="nowrap">
            <IconBuildingWarehouse size={14} color="var(--mantine-color-dimmed)" />
            <Text size="sm">{crop.greenhouseCode}</Text>
          </Group>
        </DetailField>
      </SimpleGrid>
    </SectionCard>
  );

  const cultivationCard = (
    <SectionCard icon={<IconSeeding size={14} />} title={t('crops.detail.cultivationTitle')}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('crops.form.fromDateLabel')}>
          {formatPlannedDate(extra.fromDate)}
        </DetailField>
        <DetailField label={t('crops.form.toDateLabel')}>
          {formatPlannedDate(extra.toDate)}
        </DetailField>
        <DetailField label={t('crops.form.plantTypeLabel')}>{extra.plantType || '—'}</DetailField>
        <DetailField label={t('crops.form.numberOfSeedsLabel')}>
          {hasSeeds ? formatNumber(extra.numberOfSeeds) : '—'}
        </DetailField>
        <DetailField label={t('crops.form.growingMediumLabel')}>
          {extra.growingMedium || '—'}
        </DetailField>
        <DetailField label={t('crops.form.picLabel')}>
          {picEmployee?.name ?? (extra.picId ? extra.picId : '—')}
        </DetailField>
      </SimpleGrid>
      <DetailField label={t('crops.form.diaryTemplateLabel')}>
        {diaryTemplate?.name ?? (extra.diaryTemplateCode ? extra.diaryTemplateCode : '—')}
      </DetailField>
    </SectionCard>
  );

  const lifecycleCard = (
    <SectionCard icon={<IconRoute size={14} />} title={t('crops.detail.lifecycleTitle')}>
      <DetailField label={t('__new__.01-common.labels.status')}>
        <CropStatusBadge status={crop.status} />
      </DetailField>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('crops.columns.plantedAt')}>
          {crop.plantedAt ? formatDateTime(crop.plantedAt) : '—'}
        </DetailField>
        <DetailField label={t('crops.columns.harvestedAt')}>
          {crop.harvestedAt ? formatDateTime(crop.harvestedAt) : '—'}
        </DetailField>
      </SimpleGrid>
      {!isMobile && (
        <>
          <Divider />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <DetailField label={t('common.labels.createdAt')}>
              {formatDateTime(crop.createdAt)}
            </DetailField>
            <DetailField label={t('common.labels.updatedAt')}>
              {formatDateTime(crop.updatedAt)}
            </DetailField>
          </SimpleGrid>
        </>
      )}
    </SectionCard>
  );

  const notesCard = (
    <SectionCard icon={<IconNote size={14} />} title={t('__new__.01-common.labels.note')}>
      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} c={extra.notes ? undefined : 'dimmed'}>
        {extra.notes || '—'}
      </Text>
    </SectionCard>
  );

  const infoSection = isMobile ? (
    <Stack gap="md">
      {infoCard}
      {cultivationCard}
      {lifecycleCard}
      {notesCard}
    </Stack>
  ) : (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          {infoCard}
          {cultivationCard}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {lifecycleCard}
          {notesCard}
        </Stack>
      </Grid.Col>
    </Grid>
  );

  
  
  
  const tabbedBody = canViewDiary ? (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tabs.List>
        <Tabs.Tab value="details" leftSection={<IconListDetails size={16} />}>
          {t('crops.detail.tab.details')}
        </Tabs.Tab>
        <Tabs.Tab value="diary" leftSection={<IconFileText size={16} />}>
          {t('crops.detail.tab.diary')}
        </Tabs.Tab>
        <Tabs.Tab value="materials" leftSection={<IconPackages size={16} />}>
          {t('crops.detail.tab.materials')}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="details" pt="md">
        {infoSection}
      </Tabs.Panel>
      <Tabs.Panel value="diary" pt="md">
        <CropDiarySection
          cropId={crop.id}
          cropCode={crop.code}
          onSummaryChange={setMaterialSummary}
        />
      </Tabs.Panel>
      <Tabs.Panel value="materials" pt="md">
        <Card withBorder radius="md" padding={isMobile ? 'md' : 'lg'}>
          <MaterialSummaryTable summary={materialSummary} />
        </Card>
      </Tabs.Panel>
    </Tabs>
  ) : (
    infoSection
  );

  const lifecycleActions = (
    <>
      {canPlant && (
        <Button
          variant="light"
          color="green"
          size={isMobile ? 'sm' : 'compact-sm'}
          leftSection={<IconSeeding size={isMobile ? 16 : 14} />}
          onClick={handlePlant}
          loading={transitioning}
          fullWidth={isMobile}
        >
          {t('crops.actions.plant')}
        </Button>
      )}
      {canHarvest && (
        <Button
          variant="light"
          color="blue"
          size={isMobile ? 'sm' : 'compact-sm'}
          leftSection={<IconPlant2 size={isMobile ? 16 : 14} />}
          onClick={handleHarvest}
          loading={transitioning}
          fullWidth={isMobile}
        >
          {t('crops.actions.harvest')}
        </Button>
      )}
    </>
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
            {lifecycleActions}
            {canEdit && crop.status !== 'harvested' && (
              <Button
                component={Link}
                to={ROUTES.CROPS.EDIT.replace(':id', crop.id)}
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

      <Card
        withBorder
        radius="md"
        padding={isMobile ? 'md' : 'lg'}
        style={{
          background:
            'linear-gradient(180deg, var(--mantine-color-body), var(--mantine-color-default-hover))',
        }}
      >
        <Group
          gap={isMobile ? 'sm' : 'lg'}
          wrap="nowrap"
          align="flex-start"
          justify="space-between"
        >
          <Group
            gap={isMobile ? 'sm' : 'lg'}
            wrap="nowrap"
            align="flex-start"
            style={{ minWidth: 0 }}
          >
            <ThemeIcon size={isMobile ? 56 : 80} radius={12} variant="light" color="primary">
              <IconPlant2 size={isMobile ? 28 : 40} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={8} wrap="wrap" align="center">
                <Title order={isMobile ? 5 : 3} lh={1.2}>
                  {crop.name}
                </Title>
                <CropStatusBadge status={crop.status} />
              </Group>
              <Group gap={8} wrap="wrap">
                <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
                  {crop.code}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <IconBuildingWarehouse size={14} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {crop.greenhouseCode}
                  </Text>
                </Group>
              </Group>
            </Stack>
          </Group>
          {!isMobile && statbook}
        </Group>
        {isMobile && <Box mt="md">{statbook}</Box>}
      </Card>

      {isMobile && (canPlant || canHarvest || (canEdit && crop.status !== 'harvested')) && (
        <Stack gap="xs">
          {lifecycleActions}
          {canEdit && crop.status !== 'harvested' && (
            <Button
              component={Link}
              to={ROUTES.CROPS.EDIT.replace(':id', crop.id)}
              variant="light"
              size="sm"
              leftSection={<IconEdit size={16} />}
              fullWidth
            >
              {t('__new__.01-common.actions.edit')}
            </Button>
          )}
        </Stack>
      )}

      {tabbedBody}
    </Stack>
  );
}
