import { Anchor, Divider, Grid, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  IconBox,
  IconClipboardCheck,
  IconFileCertificate,
  IconGasStation,
  IconGauge,
  IconHistory,
  IconInfoCircle,
  IconLicense,
  IconMapPin,
  IconNote,
  IconRoad,
  IconShieldCheck,
  IconTool,
  IconTruck,
  IconUser,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { StatPill } from '@/components/StatPill';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { OilTankRow, TruckAssetRow } from '@/types';
import { isActivityLoggingEnabled, perms } from '@/utils/permission';
import { featureFlags } from '@/utils/features';
import { useOilTankStore } from '@/stores/useOilTankStore';
import { TruckDetailShell } from './shared/TruckDetailShell';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { OperationLogSection } from '@/pages/operation-logs/OperationLogSection';
import { MAINTENANCE_LOG_CONFIG, REFUEL_LOG_CONFIG, TRIP_LOG_CONFIG } from './truckLogConfigs';

const isMobile = device.isMobile;

const canViewEmployee = perms.employee.canView();

const activityTabVisible = isActivityLoggingEnabled();

const TRUCK_LOG_PERMS = {
  canView: perms.truck.canView(),
  canCreate: perms.truck.canCreate(),
  canEdit: perms.truck.canEdit(),
  canDelete: perms.truck.canDelete(),
};

const tabStyle = { flexShrink: 0, whiteSpace: 'nowrap' } as const;

function useOilTankOptions() {
  const enabled = featureFlags.oilTanks.enabled && perms.oilTank.canEdit();
  const items = useOilTankStore((s) => s.items);
  const initialized = useOilTankStore((s) => s.initialized);
  const loadAll = useOilTankStore((s) => s.loadAll);
  useEffect(() => {
    if (enabled && !initialized) loadAll();
  }, [enabled, initialized, loadAll]);
  return useMemo(() => {
    if (!enabled) return undefined;
    return (items as OilTankRow[])
      .filter((tank) => tank.isActive && !tank.extra?.isDeleted)
      .map((tank) => ({
        value: tank.id,
        label: `${tank.code} — ${tank.name}`,
        code: tank.code,

        currentLevel: tank.extra?.currentLevel,
      }));
  }, [enabled, items]);
}

export function TruckAssetDetailPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  const truckTypeLabels = useLookupV2Labels('truck-type');

  const maintenanceTypeOptions = useLookupV2Options('truck-maintenance-type');

  const oilTankOptions = useOilTankOptions();

  return (
    <TruckDetailShell
      headerStats={(truck: TruckAssetRow) => {
        const e = truck.extra ?? {};
        if (!e.plateNumber && !e.capacityTons) return null;
        return (
          <Group gap="xs" wrap={isMobile ? 'wrap' : 'nowrap'} style={{ flexShrink: 0 }}>
            {e.plateNumber && (
              <StatPill
                icon={<IconTruck size={isMobile ? 12 : 14} />}
                label={t('assets.truck.detail.statPlate')}
                value={e.plateNumber}
                tone="neutral"
                compact={isMobile}
              />
            )}
            {e.capacityTons != null && (
              <StatPill
                icon={<IconGauge size={isMobile ? 12 : 14} />}
                label={t('assets.truck.detail.statCapacity')}
                value={e.capacityTons.toLocaleString()}
                suffix="t"
                compact={isMobile}
              />
            )}
          </Group>
        );
      }}
    >
      {(truck, dangerZone) => {
        const e = truck.extra ?? {};
        const targetCode = truck.extra?.plateNumber || truck.code;

        const targetId = truck.id;

        const assignedDriver = e.driverName ? { id: e.driverId, name: e.driverName } : undefined;

        const basicCard = (
          <SectionCard icon={<IconTruck size={14} />} title={t('assets.truck.detail.basicTitle')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('common.labels.name')}>{truck.name}</DetailField>
              <DetailField label={t('common.labels.code')}>
                <Text span ff="monospace" fw={500} tt="uppercase">
                  {truck.code}
                </Text>
              </DetailField>
              {e.truckType && (
                <DetailField label={t('assets.truck.form.typeLabel')}>
                  {truckTypeLabels.get(e.truckType) ?? e.truckType}
                </DetailField>
              )}
              <DetailField label={t('assets.truck.columns.plate')}>
                {e.plateNumber || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.makeModelLabel')}>
                {e.makeModel || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.modelLabel')}>{e.model || '—'}</DetailField>
              <DetailField label={t('assets.truck.form.yearLabel')}>{e.year ?? '—'}</DetailField>
              <DetailField label={t('assets.truck.detail.statCapacity')}>
                {e.capacityTons != null ? `${e.capacityTons.toLocaleString()} t` : '—'}
              </DetailField>
            </SimpleGrid>
            <DetailField label={t('common.labels.description')}>
              {truck.description ? (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {truck.description}
                </Text>
              ) : (
                '—'
              )}
            </DetailField>
          </SectionCard>
        );

        const specCard = (
          <SectionCard icon={<IconBox size={14} />} title={t('assets.truck.detail.specTitle')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('assets.truck.form.boxTypeLabel')}>
                {e.boxType || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.tireSizeLabel')}>
                {e.tireSize || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.engineNumberLabel')}>
                {e.engineNumber || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.chassisNumberLabel')}>
                {e.chassisNumber || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.boxDimensionsLabel')}>
                {e.boxLengthMm != null || e.boxWidthMm != null || e.boxHeightMm != null
                  ? `${e.boxLengthMm ?? '—'} × ${e.boxWidthMm ?? '—'} × ${e.boxHeightMm ?? '—'} mm`
                  : '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.boxVolumeLabel')}>
                {e.boxVolumeM3 != null ? `${e.boxVolumeM3.toLocaleString()} m³` : '—'}
              </DetailField>
            </SimpleGrid>
          </SectionCard>
        );

        const notesCard = (
          <SectionCard icon={<IconNote size={14} />} title={t('__new__.01-common.labels.note')}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} c={e.notes ? undefined : 'dimmed'}>
              {e.notes || '—'}
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

        const driverCard = (
          <SectionCard icon={<IconUser size={14} />} title={t('assets.truck.detail.driverTitle')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('assets.truck.form.driverNameLabel')}>
                {e.driverName ? (
                  e.driverId && canViewEmployee ? (
                    <Anchor
                      component={Link}
                      to={ROUTES.EMPLOYEES.DETAIL.replace(':id', e.driverId)}
                      size="sm"
                      fw={500}
                    >
                      {e.driverName}
                    </Anchor>
                  ) : (
                    e.driverName
                  )
                ) : (
                  '—'
                )}
              </DetailField>
              <DetailField label={t('assets.truck.form.driverPhoneLabel')}>
                {e.driverPhone || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.licenseNumberLabel')}>
                <Group gap={6} wrap="nowrap">
                  {e.licenseNumber && <IconLicense size={14} />}
                  <Text size="sm">{e.licenseNumber || '—'}</Text>
                </Group>
              </DetailField>
              <DetailField label={t('assets.truck.form.licenseClassLabel')}>
                {e.licenseClass || '—'}
              </DetailField>
            </SimpleGrid>
          </SectionCard>
        );

        const routeCard = (
          <SectionCard
            icon={<IconMapPin size={14} />}
            title={t('assets.truck.detail.operationTitle')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('assets.truck.form.baseLocationLabel')}>
                {e.baseLocation || '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.regionLabel')}>
                {e.region || '—'}
              </DetailField>
            </SimpleGrid>
          </SectionCard>
        );

        const registrationCard = (
          <SectionCard
            icon={<IconFileCertificate size={14} />}
            title={t('assets.truck.detail.registrationTitle')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('assets.truck.form.registrationTypeLabel')}>
                {e.registrationType === 'copy'
                  ? t('assets.truck.form.registrationTypeCopy')
                  : t('assets.truck.form.registrationTypeOriginal')}
              </DetailField>
              {e.registrationType === 'copy' && (
                <DetailField label={t('assets.truck.form.registrationCopyExpiryLabel')}>
                  {e.registrationCopyExpiry ? formatDate(e.registrationCopyExpiry) : '—'}
                </DetailField>
              )}
            </SimpleGrid>
          </SectionCard>
        );

        const inspectionCard = (
          <SectionCard
            icon={<IconClipboardCheck size={14} />}
            title={t('assets.truck.detail.inspectionTitle')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('assets.truck.form.inspectionExpiryLabel')}>
                {e.inspectionExpiry ? formatDate(e.inspectionExpiry) : '—'}
              </DetailField>
              <DetailField label={t('assets.truck.form.badgeExpiryLabel')}>
                {e.badgeExpiry ? formatDate(e.badgeExpiry) : '—'}
              </DetailField>
            </SimpleGrid>
          </SectionCard>
        );

        const insurances = e.insurances ?? [];
        const insuranceCard = (
          <SectionCard
            icon={<IconShieldCheck size={14} />}
            title={t('assets.truck.detail.insuranceTitle')}
          >
            {insurances.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('assets.truck.form.insuranceEmpty')}
              </Text>
            ) : (
              <Stack gap="sm">
                {insurances.map((ins, i) => (
                  <div key={i}>
                    {i > 0 && <Divider mb="sm" />}
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                      <DetailField label={t('assets.truck.form.insuranceCompanyLabel')}>
                        {ins.company || '—'}
                      </DetailField>
                      <DetailField label={t('assets.truck.form.insuranceTypeLabel')}>
                        {ins.type || '—'}
                      </DetailField>
                      <DetailField label={t('assets.truck.form.insuranceExpiryLabel')}>
                        {ins.expiry ? formatDate(ins.expiry) : '—'}
                      </DetailField>
                    </SimpleGrid>
                  </div>
                ))}
              </Stack>
            )}
          </SectionCard>
        );

        return (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden' }}>
              <Tabs.Tab
                value="overview"
                leftSection={<IconInfoCircle size={16} />}
                style={tabStyle}
              >
                {t('assets.truck.detail.tabs.overview')}
              </Tabs.Tab>
              <Tabs.Tab value="driver" leftSection={<IconUser size={16} />} style={tabStyle}>
                {t('assets.truck.detail.tabs.driverOperation')}
              </Tabs.Tab>
              <Tabs.Tab
                value="documents"
                leftSection={<IconFileCertificate size={16} />}
                style={tabStyle}
              >
                {t('assets.truck.detail.tabs.documents')}
              </Tabs.Tab>
              <Tabs.Tab value="maintenance" leftSection={<IconTool size={16} />} style={tabStyle}>
                {t('assets.truck.detail.tabs.maintenance')}
              </Tabs.Tab>
              <Tabs.Tab value="trips" leftSection={<IconRoad size={16} />} style={tabStyle}>
                {t('assets.truck.detail.tabs.trips')}
              </Tabs.Tab>
              <Tabs.Tab value="refuel" leftSection={<IconGasStation size={16} />} style={tabStyle}>
                {t('assets.truck.detail.tabs.refuel')}
              </Tabs.Tab>
              {activityTabVisible && (
                <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />} style={tabStyle}>
                  {t('assets.truck.detail.tabs.activity')}
                </Tabs.Tab>
              )}
            </Tabs.List>

            {/* 7/5 two-column body (mirrors employee / product detail): the truck
                spec sheet left, the notes + danger-zone rail right. Collapses to
                one column on mobile. */}
            <Tabs.Panel value="overview" pt="md">
              <Grid gutter={isMobile ? 'md' : 'lg'}>
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <Stack gap={isMobile ? 'md' : 'lg'}>
                    {basicCard}
                    {specCard}
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Stack gap={isMobile ? 'md' : 'lg'}>
                    {notesCard}
                    {dangerZone}
                  </Stack>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="driver" pt="md">
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing={isMobile ? 'md' : 'lg'}>
                {driverCard}
                {routeCard}
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="documents" pt="md">
              <Stack gap={isMobile ? 'md' : 'lg'}>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={isMobile ? 'md' : 'lg'}>
                  {registrationCard}
                  {inspectionCard}
                </SimpleGrid>
                {insuranceCard}
              </Stack>
            </Tabs.Panel>

            {/* Each log tab is lazy-mounted — its operation-log partition is only
                fetched when the tab is first opened. */}
            <Tabs.Panel value="maintenance" pt="md">
              {activeTab === 'maintenance' && (
                <OperationLogSection
                  config={MAINTENANCE_LOG_CONFIG}
                  targetId={targetId}
                  targetCode={targetCode}
                  perms={TRUCK_LOG_PERMS}
                  context={{ maintenanceTypeOptions }}
                />
              )}
            </Tabs.Panel>

            <Tabs.Panel value="trips" pt="md">
              {activeTab === 'trips' && (
                <OperationLogSection
                  config={TRIP_LOG_CONFIG}
                  targetId={targetId}
                  targetCode={targetCode}
                  perms={TRUCK_LOG_PERMS}
                  context={{ assignedDriver }}
                />
              )}
            </Tabs.Panel>

            <Tabs.Panel value="refuel" pt="md">
              {activeTab === 'refuel' && (
                <OperationLogSection
                  config={REFUEL_LOG_CONFIG}
                  targetId={targetId}
                  targetCode={targetCode}
                  perms={TRUCK_LOG_PERMS}
                  context={{ assignedDriver, oilTankOptions }}
                />
              )}
            </Tabs.Panel>

            {activityTabVisible && (
              <Tabs.Panel value="activity" pt="md">
                {activeTab === 'activity' && (
                  <ActivityByTargetPanel targetId={truck.id} i18nNamespace="assets.truck.detail" />
                )}
              </Tabs.Panel>
            )}
          </Tabs>
        );
      }}
    </TruckDetailShell>
  );
}
