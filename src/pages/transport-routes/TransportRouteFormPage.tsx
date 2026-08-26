import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCashBanknote,
  IconInfoCircle,
  IconMapPin,
  IconPercentage,
  IconRoute,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { cMngtConnector } from '@credo/connectors/connector';
import { device, logger } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { appConfig } from '@/config';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { Form } from '@/components/Form';
import { SectionCard } from '@/components/SectionCard';
import { useInitFormFromFetch } from '@/hooks';
import { EntityConflictError } from '@/stores/createEntityStore';
import {
  TRANSPORT_ROUTE_RECORD_TARGET,
  useTransportRouteStore,
} from '@/stores/useTransportRouteStore';
import { useTransportOrderStore } from '@/stores/useTransportOrderStore';
import { buildNextSequentialCode, isDuplicateUniqueFieldError } from '@/utils/code';
import { perms } from '@/utils/permission';
import type { TransportRouteExtra, TransportRouteRow } from '@/types';
import { usePlaceSuggestions } from '../transport-orders/usePlaceSuggestions';
import { useContainerSizeOptions } from '../transport-orders/containerSize';
import { truckTypeCarriesContainer } from '../transport-orders/containerTruckType';
import { useTruckTypeOptions } from './truckType';
import { buildTransportRouteWrite, deriveSegmentsFromLegs } from './transportRouteWrite';
import {
  blankCostItem,
  blankLeg,
  blankRouteFormValues,
  blankSegment,
  type RouteFormValues,
} from './routeFormValues';
import { RouteLegsCard } from './RouteLegsCard';
import { RouteSegmentsCard } from './RouteSegmentsCard';
import { RouteCostItemsCard } from './RouteCostItemsCard';
import { RoutePlaceInput } from './RouteFormRow';
import { computeRouteCosting } from './routeCosting';
import { useRouteCosting } from './useRouteCosting';
import { RouteCostingSummary } from './RouteCostingSummary';

const isMobile = device.isMobile;

const NON_CONTAINER_TRUCK_TYPES = appConfig.features.transportOrders.nonContainerTruckTypes ?? [];

const MAX_CODE_RETRIES = 20;

function buildNextRouteCode(alsoTaken: readonly string[] = []): string {
  const { routeCodePrefix, codePadLength } = appConfig.features.transportOrders;
  const codes = useTransportRouteStore.getState().items.map((r) => r.code);
  return buildNextSequentialCode(
    routeCodePrefix ?? 'TUYEN-',
    [...codes, ...alsoTaken],
    codePadLength,
  );
}

export function TransportRouteFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (isMobile) {
      notifications.show({
        color: 'yellow',
        message: t('transportRoutes.notifications.mobileFormBlocked'),
        autoClose: 4000,
      });
      navigate(ROUTES.TRANSPORT_ROUTES.LIST, { replace: true });
      return;
    }
    if (
      (isEdit && !perms.transportRoute.canEdit()) ||
      (!isEdit && !perms.transportRoute.canCreate())
    ) {
      navigate(ROUTES.TRANSPORT_ROUTES.LIST, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const snapshotRef = useRef<TransportRouteRow | null>(null);

  const routesInit = useTransportRouteStore((s) => s.initialized);
  const loadRoutes = useTransportRouteStore((s) => s.loadAll);
  const routeCount = useTransportRouteStore((s) => s.items.length);
  const createSafely = useTransportRouteStore((s) => s.createSafely);
  const updateSafely = useTransportRouteStore((s) => s.updateSafely);

  const ordersInit = useTransportOrderStore((s) => s.initialized);
  const loadOrders = useTransportOrderStore((s) => s.loadAll);
  const placeSuggestions = usePlaceSuggestions();

  useEffect(() => {
    if (isMobile) return;
    if (!routesInit) loadRoutes();
    if (!ordersInit) loadOrders();
  }, [routesInit, loadRoutes, ordersInit, loadOrders]);

  const truckTypeOptions = useTruckTypeOptions();
  const containerSizeOptions = useContainerSizeOptions();

  const { norms, fuelPricePerLiter } = useRouteCosting();

  const form = useForm<RouteFormValues>({
    initialValues: blankRouteFormValues(),
    validate: {
      name: (v) => (v.trim() ? null : t('transportRoutes.validation.nameRequired')),
      truckType: (v) => (v.trim() ? null : t('transportRoutes.validation.truckTypeRequired')),

      containerSize: (v, values) =>
        values.truckType.trim() &&
        truckTypeCarriesContainer(values.truckType, NON_CONTAINER_TRUCK_TYPES) &&
        !v.trim()
          ? t('transportRoutes.validation.containerSizeRequired')
          : null,

      pickup: (v, values) =>
        !values.isMultiTrip && !v.trim() ? t('transportRoutes.validation.pickupRequired') : null,
      dropoff: (v, values) =>
        !values.isMultiTrip && !v.trim() ? t('transportRoutes.validation.dropoffRequired') : null,
      trips: {
        departure: (v: string, values: RouteFormValues) =>
          values.isMultiTrip && !v.trim()
            ? t('transportRoutes.validation.departureRequired')
            : null,
        destination: (v: string, values: RouteFormValues) =>
          values.isMultiTrip && !v.trim()
            ? t('transportRoutes.validation.destinationRequired')
            : null,
      },
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (fetchId) => {
      const res = await cMngtConnector.getSingleRecordById(TRANSPORT_ROUTE_RECORD_TARGET, {
        id: fetchId,
      });
      const r = res.item as TransportRouteRow;
      snapshotRef.current = r;
      if (r.extra?.isDeleted) {
        navigate(ROUTES.TRANSPORT_ROUTES.LIST, { replace: true });
        return null;
      }
      return {
        code: r.code,
        name: r.name || '',
        isMultiTrip: !!r.isMultiTrip,

        trips: (r.trips ?? []).map((leg, i) => ({
          departure: leg.departure || '',
          destination: leg.destination || '',
          laborCost: leg.laborCost || 0,
          distanceKm: r.segments?.[i]?.distanceKm ?? 0,
        })),
        pickup: r.route?.pickup || '',
        stuffing: r.route?.stuffing || '',
        dropoff: r.route?.dropoff || '',
        truckType: r.truckType || '',
        containerSize: r.containerSize || '',
        freightAmount: r.freightAmount || 0,

        basePay: r.basePay ?? r.laborCost ?? 0,
        allowance: r.allowance ?? 0,

        segments: r.segments?.length ? r.segments.map((seg) => ({ ...seg })) : [blankSegment()],
        costItems: r.costItems?.length
          ? r.costItems.map((item) => ({ note: '', ...item }))
          : [blankCostItem()],
        markupPercent: r.markupPercent || 0,
        isActive: r.isActive,
        notes: r.extra?.notes || '',
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('transportRoutes.notifications.loadError') });
      navigate(ROUTES.TRANSPORT_ROUTES.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: RouteFormValues) => {
      setLoading(true);
      try {
        const prevExtra = snapshotRef.current?.extra ?? {};
        const extra: TransportRouteExtra = { ...prevExtra };

        if (values.notes.trim()) extra.notes = values.notes.trim();
        else delete extra.notes;

        const write = buildTransportRouteWrite({
          name: values.name,
          isMultiTrip: values.isMultiTrip,
          route: { pickup: values.pickup, stuffing: values.stuffing, dropoff: values.dropoff },
          trips: values.trips,
          truckType: values.truckType,

          containerSize: truckTypeCarriesContainer(values.truckType, NON_CONTAINER_TRUCK_TYPES)
            ? values.containerSize
            : '',
          freightAmount: values.freightAmount,
          basePay: values.basePay,
          allowance: values.allowance,
          segments: values.segments,
          costItems: values.costItems,
          markupPercent: values.markupPercent,
          isActive: values.isActive,
          extra,
        });

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Transport route snapshot missing');
          await updateSafely({ id, version: snapshot.version, patch: write });
          notifications.show({
            color: 'green',
            message: t('transportRoutes.notifications.updated'),
          });
        } else {
          const attempted: string[] = [];
          let created: TransportRouteRow | null = null;
          for (let attempt = 0; attempt <= MAX_CODE_RETRIES; attempt++) {
            const code = buildNextRouteCode(attempted);
            attempted.push(code);
            try {
              created = await createSafely({ patch: { ...write, code } });
              break;
            } catch (err) {
              if (isDuplicateUniqueFieldError(err, 'code') && attempt < MAX_CODE_RETRIES) continue;
              throw err;
            }
          }
          if (!created) throw new Error('Transport route create exhausted code retries');
          notifications.show({
            color: 'green',
            message: t('transportRoutes.notifications.created'),
          });
        }
        navigate(ROUTES.TRANSPORT_ROUTES.LIST);
      } catch (err) {
        logger.error('Transport route submit failed:', err);
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as TransportRouteRow;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('transportRoutes.notifications.updateError')
              : t('transportRoutes.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate, createSafely, updateSafely],
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    setConfirmDelete(false);
    setLoading(true);
    try {
      await updateSafely({
        id,
        version: snapshot.version,
        patch: { isActive: false, extra: { ...snapshot.extra, isDeleted: true } },
      });
      notifications.show({ color: 'green', message: t('transportRoutes.notifications.deleted') });
      navigate(ROUTES.TRANSPORT_ROUTES.LIST);
    } catch (err) {
      logger.error('Transport route delete failed:', err);
      notifications.show({
        color: 'red',
        message: t('transportRoutes.notifications.deleteError'),
      });
    } finally {
      setLoading(false);
    }
  }, [id, t, navigate, updateSafely]);

  const suggestedCode = useMemo(
    () => (isEdit ? '' : buildNextRouteCode()),

    [isEdit, routesInit, routeCount],
  );

  if (fetching) return null;
  if (isMobile) return null;

  const handleMultiTripToggle = (checked: boolean) => {
    form.setFieldValue('isMultiTrip', checked);
    if (checked && form.values.trips.length === 0) form.setFieldValue('trips', [blankLeg()]);
  };

  const draftNorm = form.values.truckType ? norms.get(form.values.truckType) : undefined;

  const draftCosting = computeRouteCosting(
    {
      segments: form.values.isMultiTrip
        ? deriveSegmentsFromLegs(form.values.trips)
        : form.values.segments,
      costItems: form.values.costItems,
      markupPercent: form.values.markupPercent,
      isMultiTrip: form.values.isMultiTrip,
      trips: form.values.trips,

      laborCost: (form.values.basePay || 0) + (form.values.allowance || 0),
    },
    { litersPer100km: draftNorm, fuelPricePerLiter },
  );

  const withCurrent = (options: { value: string; label: string }[], current: string) =>
    current && !options.some((o) => o.value === current)
      ? [...options, { value: current, label: current }]
      : options;

  const showContainerSize = truckTypeCarriesContainer(
    form.values.truckType,
    NON_CONTAINER_TRUCK_TYPES,
  );

  const containerSizeData = withCurrent(containerSizeOptions, form.values.containerSize);

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <Button
          onClick={() => window.history.back()}
          variant="subtle"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('__new__.01-common.actions.back')}
        </Button>
      </Group>

      <Title order={3}>{isEdit ? t('transportRoutes.edit') : t('transportRoutes.new')}</Title>

      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="lg">
          <SectionCard
            icon={<IconRoute size={14} />}
            title={t('transportRoutes.form.infoSection')}

            actions={
              <Switch
                label={t('transportRoutes.form.multiTrip')}
                description={t('transportRoutes.form.multiTripHint')}
                checked={form.values.isMultiTrip}
                onChange={(e) => handleMultiTripToggle(e.currentTarget.checked)}
              />
            }
          >
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
              <TextInput
                label={t('transportRoutes.form.code')}
                value={isEdit ? form.values.code : suggestedCode}
                description={
                  isEdit ? t('transportRoutes.form.codeLocked') : t('transportRoutes.form.codeAuto')
                }
                readOnly
              />
              {/* Next to the code, because the two together are how a route is
                  identified everywhere else: the register stacks them in one
                  cell and the order form's picker lists them on one line. */}
              <TextInput
                withAsterisk
                label={t('transportRoutes.form.name')}
                description={t('transportRoutes.form.nameHint')}
                {...form.getInputProps('name')}
              />
              <Select
                withAsterisk
                label={t('transportRoutes.form.truckType')}
                data={withCurrent(truckTypeOptions, form.values.truckType)}
                value={form.values.truckType || null}
                onChange={(v) => {
                  const next = v ?? '';
                  form.setFieldValue('truckType', next);

                  if (!truckTypeCarriesContainer(next, NON_CONTAINER_TRUCK_TYPES)) {
                    form.setFieldValue('containerSize', '');
                  }
                }}
                error={form.errors.truckType}
                searchable
                clearable
              />
              {showContainerSize && (
                <Select
                  withAsterisk
                  label={t('transportRoutes.form.containerSize')}
                  data={containerSizeData}
                  value={form.values.containerSize || null}
                  onChange={(v) => form.setFieldValue('containerSize', v ?? '')}
                  error={form.errors.containerSize}
                  searchable
                  allowDeselect={false}
                />
              )}
              <Switch
                mt="md"
                label={
                  form.values.isActive
                    ? t('transportRoutes.status.active')
                    : t('transportRoutes.status.inactive')
                }
                description={t('transportRoutes.form.statusHint')}
                checked={form.values.isActive}
                onChange={(e) => form.setFieldValue('isActive', e.currentTarget.checked)}
              />
            </SimpleGrid>

            {truckTypeOptions.length === 0 && (
              <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />} mt="sm">
                {t('transportRoutes.form.noTruckTypes')}
              </Alert>
            )}

            <Textarea
              mt="sm"
              label={t('transportRoutes.form.notes')}
              autosize
              minRows={2}
              {...form.getInputProps('notes')}
            />
          </SectionCard>

          {form.values.isMultiTrip ? (
            <RouteLegsCard form={form} suggestions={placeSuggestions} />
          ) : (
            <SectionCard icon={<IconMapPin size={14} />} title={t('transportOrders.route.title')}>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <RoutePlaceInput
                  withAsterisk
                  label={t('transportOrders.route.pickup')}
                  suggestions={placeSuggestions}
                  {...form.getInputProps('pickup')}
                />
                <RoutePlaceInput
                  label={t('transportOrders.route.stuffing')}
                  suggestions={placeSuggestions}
                  {...form.getInputProps('stuffing')}
                />
                <RoutePlaceInput
                  withAsterisk
                  label={t('transportOrders.route.dropoff')}
                  suggestions={placeSuggestions}
                  {...form.getInputProps('dropoff')}
                />
              </SimpleGrid>
            </SectionCard>
          )}

          <SectionCard
            icon={<IconCashBanknote size={14} />}
            title={t('transportRoutes.form.pricingSection')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
              <NumberInput
                label={t('transportRoutes.form.freightAmount')}
                thousandSeparator=","
                min={0}
                {...form.getInputProps('freightAmount')}
              />
              {/* Driver pay is per leg on a multi-leg route — a flat figure
                  would be a second, contradictory answer to the same question.
                  The two halves are authored; their sum is mirrored onto
                  `laborCost` at write time, which is the figure orders and the
                  giá vốn read. */}
              {!form.values.isMultiTrip && (
                <>
                  <NumberInput
                    label={t('transportRoutes.form.basePay')}
                    thousandSeparator=","
                    min={0}
                    {...form.getInputProps('basePay')}
                  />
                  <NumberInput
                    label={t('transportRoutes.form.allowance')}
                    thousandSeparator=","
                    min={0}
                    {...form.getInputProps('allowance')}
                  />
                </>
              )}
            </SimpleGrid>
          </SectionCard>

          {/* ── CẤU TRÚC CHI PHÍ ───────────────────────────────────────────
              Sits AFTER the default-price card, not before it: the freight fee
              is what the order form applies and the operator came here to set;
              the cost structure is what justifies it. Reading it in that order
              is also how the giá vốn card below can be the last word.

              **Single-leg only.** On a multi-leg route the legs already ARE the
              measured stretches, so the distance is a column of DANH SÁCH CHẶNG
              and this card would be the same two places asked for twice — which
              is exactly the bug product filed (a typo left the two lists
              disagreeing; forgetting produced a zero-fuel giá vốn on a route
              that plainly had legs). A one-leg run has no legs to mirror and
              genuinely has more measured stretches than its three named stops,
              so it keeps the free-form table. */}
          {!form.values.isMultiTrip && (
            <RouteSegmentsCard form={form} suggestions={placeSuggestions} />
          )}

          <RouteCostItemsCard form={form} />

          <SectionCard
            icon={<IconPercentage size={14} />}
            title={t('transportRoutes.costing.title')}
          >
            <NumberInput
              w={220}
              mb="sm"
              label={t('transportRoutes.form.markupPercent')}
              description={t('transportRoutes.form.markupHint')}
              suffix="%"
              min={0}
              max={1000}
              {...form.getInputProps('markupPercent')}
            />
            <RouteCostingSummary
              costing={draftCosting}
              litersPer100km={draftNorm}
              fuelPricePerLiter={fuelPricePerLiter}
            />
          </SectionCard>

          {isEdit && perms.transportRoute.canDelete() && (
            <DangerZoneCard title={t('transportRoutes.dangerZone.title')}>
              <DangerAction
                title={t('transportRoutes.confirmDelete.title')}
                description={t('transportRoutes.dangerZone.deleteHint')}
                buttonLabel={t('__new__.01-common.actions.remove')}
                buttonColor="red"
                buttonIcon={<IconTrash size={14} />}
                onClick={() => setConfirmDelete(true)}
              />
            </DangerZoneCard>
          )}

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="sm"
              disabled={loading}
              onClick={() => navigate(ROUTES.TRANSPORT_ROUTES.LIST)}
            >
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {t('__new__.01-common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Form>

      <ConfirmModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('transportRoutes.confirmDelete.title')}
        message={t('transportRoutes.confirmDelete.message', { code: form.values.code })}
        confirmColor="red"
      />
    </Stack>
  );
}
