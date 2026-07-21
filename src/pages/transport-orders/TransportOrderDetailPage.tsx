import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCopy,
  IconEdit,
  IconFileText,
  IconHistory,
  IconInfoCircle,
  IconLock,
  IconReceipt,
  IconRoute,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import {
  InlineEditField,
  InlineSelectField,
  InlineTextField,
  InlineTextareaField,
} from '@credo/base-ui/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SectionCard } from '@/components/SectionCard';
import { StatusChangeModal } from '@/components/StatusChangeModal';
import { DateField } from '@/components/DateField';
import { DateTimeField } from '@/components/DateTimeField';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { EmployeeLink } from '@/components/EmployeeLink';
import { CustomerLink } from '@/components/CustomerLink';
import { TruckLink } from '@/components/TruckLink';
import { transportOrderBundle } from '@/stores/useTransportOrderStore';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { getCurrentActorId, getCurrentEmployeeId, getCurrentEmployeeStamp } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import {
  isActivityLoggingEnabled,
  isDriverDepartment,
  perms,
  type ResolvedStatusOption,
} from '@/utils/permission';
import {
  dateTimeStringToIso,
  isoToDateTimeString,
  isoToVnDateString,
  vnDateStringToIso,
} from '@/utils/dateTimeField';
import { appConfig } from '@/config';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type {
  Employee,
  TransportOrder,
  TransportOrderCancellation,
  TransportOrderExtra,
} from '@/types';
import {
  findStatus,
  getNextStatuses,
  getTransportOrderStatusFlow,
  isTransportOrderLocked,
  resolveTransportOrderStatus,
  statusFlowIndex,
} from './transportOrderStatuses';
import {
  formatMoney,
  isBillableFee,
  orderTotals,
  orderTripLaborTotal,
  readFeeLines,
} from './transportOrderPricing';
import { appendTimelineEntry, diffTransportOrder, isEmptyDiff } from './activityMemo';
import { useContainerSizeLabel } from './containerSize';
import { truckNameWithPlate } from './truckDisplay';
import { isValidContainerNumber, normalizeContainerNumber } from './containerNumber';

const isMobile = device.isMobile;
const canCreate = perms.transportOrder.canCreate();
const canEdit = perms.transportOrder.canEdit();
const canDelete = perms.transportOrder.canDelete();
const canTransition = perms.transportOrder.canTransitionStatus();
const canCancel = perms.transportOrder.canCancel();
const canViewPrice = perms.transportOrder.canViewPrice();

const activityLogTabVisible = !isMobile && isActivityLoggingEnabled();

const toDriverDepartments = appConfig.features.transportOrders.driverDepartments ?? [];
const driverEmployeeFilter = (e: Employee) => {
  if (!e.isActive || e.extra?.isDeleted) return false;
  return toDriverDepartments.length > 0
    ? toDriverDepartments.includes(e.department)
    : isDriverDepartment(e.department);
};

export function TransportOrderDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  
  
  
  const getCached = transportOrderBundle.useStore.getState().getById;
  const [order, setOrder] = useState<TransportOrder | null>(() =>
    id ? (getCached(id) ?? null) : null,
  );
  const [loading, setLoading] = useState(!order);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  
  
  const [statusTarget, setStatusTarget] = useState<ResolvedStatusOption | null>(null);
  const [statusNote, setStatusNote] = useState('');
  
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  
  const trucks = useTruckAssetStore((s) => s.items);
  const trucksInit = useTruckAssetStore((s) => s.initialized);
  const loadTrucks = useTruckAssetStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  
  
  const containerSizeLabel = useContainerSizeLabel();

  useEffect(() => {
    if (!trucksInit) loadTrucks();
    if (!employeesInit) loadEmployees();
  }, [trucksInit, loadTrucks, employeesInit, loadEmployees]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      
      
      const { item: o } = await asyncDeduplicator.call(`transportOrder:${id}`, () =>
        transportOrderBundle.fetchById(id),
      );
      if (o.extra?.isDeleted) {
        navigate(ROUTES.TRANSPORT_ORDERS.LIST, { replace: true });
        return;
      }
      setOrder(o);
    } catch {
      if (!getCached(id)) {
        notifications.show({ color: 'red', message: t('transportOrders.notifications.loadError') });
        navigate(ROUTES.TRANSPORT_ORDERS.LIST);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, t]);

  useEffect(() => {
    
    void load();
  }, [load]);

  const patchOrder = useCallback(
    async (patch: Record<string, unknown>, successMsg: string) => {
      if (!order) return;
      setActionLoading(true);
      try {
        
        
        
        const updated = await transportOrderBundle.updateSafely({
          id: order.id,
          version: order.version,
          patch,
        });
        setOrder(updated);
        notifications.show({ color: 'green', message: successMsg });
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as TransportOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('transportOrders.notifications.saveError'),
          });
        }
      } finally {
        setActionLoading(false);
      }
    },
    [order, t],
  );

  
  const handleMetaPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!order) return;
      try {
        const updated = await transportOrderBundle.updateSafely({
          id: order.id,
          version: order.version,
          patch,
        });
        setOrder(updated);
        const fields = diffTransportOrder(order, updated);
        if (!isEmptyDiff(fields)) {
          logActivity('transportOrder.update', order.id, {
            orderNumber: updated.orderNumber,
            inlineEdit: true,
            fields,
          });
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setOrder(err.latest as TransportOrder);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('transportOrders.notifications.saveError'),
          });
        }
        throw err;
      }
    },
    [order, t],
  );

  const handleTransition = useCallback(
    (toStatus: string, note?: string) => {
      if (!order || isTransportOrderLocked(order.status)) return;
      const fromStatus = order.status;
      const trimmedNote = note?.trim();
      
      
      const nextExtra: TransportOrderExtra = {
        ...order.extra,
        activityLog: appendTimelineEntry(order.extra, {
          action: 'status_change',
          fromStatus,
          toStatus,
          ...getCurrentEmployeeStamp(),
          ...(trimmedNote ? { note: trimmedNote } : {}),
        }),
      };
      void patchOrder(
        { status: toStatus, extra: nextExtra },
        t('transportOrders.notifications.updated'),
      ).then(() => {
        logActivity('transportOrder.statusChange', order.id, {
          orderNumber: order.orderNumber,
          fromStatus,
          toStatus,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        });
      });
    },
    [order, patchOrder, t],
  );

  const handleCancel = useCallback(
    (reason: string) => {
      if (!order) return;
      const fromStatus = order.status;
      const trimmedReason = reason.trim();
      const cancellation: TransportOrderCancellation = {
        at: Date.now(),
        
        
        by: { id: getCurrentActorId(), name: getCurrentEmployeeStamp().userName ?? '' },
        fromStatus,
        ...(trimmedReason ? { reason: trimmedReason } : {}),
      };
      const nextExtra: TransportOrderExtra = {
        ...order.extra,
        cancellation,
        activityLog: appendTimelineEntry(order.extra, {
          action: 'cancellation_set',
          fromStatus,
          ...getCurrentEmployeeStamp(),
          ...(trimmedReason ? { note: trimmedReason } : {}),
        }),
      };
      void patchOrder({ extra: nextExtra }, t('transportOrders.notifications.cancelled')).then(
        () => {
          logActivity('transportOrder.cancel', order.id, {
            orderNumber: order.orderNumber,
            fromStatus,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
          });
        },
      );
    },
    [order, patchOrder, t],
  );

  
  const handleCopy = useCallback(() => {
    if (!order) return;
    navigate(ROUTES.TRANSPORT_ORDERS.NEW, { state: { copyFrom: order } });
  }, [order, navigate]);

  
  const activityByStatus = useMemo(() => {
    const map = new Map<string, NonNullable<TransportOrderExtra['activityLog']>[number]>();
    for (const entry of order?.extra?.activityLog ?? []) {
      if (!entry.toStatus) continue;
      const prev = map.get(entry.toStatus);
      if (!prev || Number(entry.timestamp) >= Number(prev.timestamp)) {
        map.set(entry.toStatus, entry);
      }
    }
    return map;
  }, [order?.extra?.activityLog]);

  
  
  const resolveStatus = useCallback(
    (value: string | undefined | null) => resolveTransportOrderStatus(value),
    
    [i18n.language],
  );

  
  
  const myDepartment = employees.find((e) => e.id === getCurrentEmployeeId())?.department ?? null;

  const handleDelete = useCallback(() => {
    if (!order || isTransportOrderLocked(order.status)) return;
    setActionLoading(true);
    
    
    void transportOrderBundle
      .updateSafely({
        id: order.id,
        version: order.version,
        patch: { extra: { ...order.extra, isDeleted: true } },
      })
      .then(() => {
        logActivity('transportOrder.delete', order.id, {
          orderNumber: order.orderNumber,
          fromStatus: order.status,
        });
        notifications.show({ color: 'green', message: t('transportOrders.notifications.deleted') });
        navigate(ROUTES.TRANSPORT_ORDERS.LIST);
      })
      .catch(() => {
        notifications.show({ color: 'red', message: t('transportOrders.notifications.saveError') });
      })
      .finally(() => setActionLoading(false));
  }, [order, navigate, t]);

  if (loading && !order) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }
  if (!order) return null;

  const status = findStatus(order.status);
  const statusText = status.label;
  const isCancelled = !!order.extra?.cancellation;
  const locked = isTransportOrderLocked(order.status);
  const totals = orderTotals(order);
  
  const feeLines = readFeeLines(order);
  
  
  const tripLaborTotal = orderTripLaborTotal(order);
  
  
  
  
  const nextStatuses = isCancelled ? [] : getNextStatuses(order.status, myDepartment);
  const statusFlowOrder = getTransportOrderStatusFlow();
  const currentFlowIndex = statusFlowIndex(order.status);

  const infoRow = (label: string, value: React.ReactNode) => (
    <Group justify="space-between" gap="sm" wrap="nowrap">
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text size="sm" ta="right" component="div">
        {value || '—'}
      </Text>
    </Group>
  );

  
  
  const canEditMeta = canEdit && !locked && !isCancelled;

  const inlineEditLabels = {
    edit: t('__new__.01-common.actions.edit'),
    save: t('__new__.01-common.actions.save'),
    cancel: t('__new__.01-common.actions.cancel'),
  };

  const truckSelectData = trucks
    .filter((tr) => tr.isActive && !tr.extra?.isDeleted)
    .map((tr) => ({
      value: tr.id,
      label: `${truckNameWithPlate(tr.name, tr.extra?.plateNumber)}${tr.code ? ` (${tr.code})` : ''}`,
    }));
  const driverSelectData = employees
    .filter(driverEmployeeFilter)
    .map((e) => ({ value: e.id, label: e.name }));

  
  const truckField = (
    <InlineSelectField
      canEdit={canEditMeta}
      value={order.truckId ?? ''}
      onSave={async (next) => {
        const picked = trucks.find((tr) => tr.id === next);
        await handleMetaPatch({ truckId: next, truckPlate: picked?.name ?? '' });
      }}
      data={truckSelectData}
      placeholder={t('transportOrders.columns.truck')}
      labels={inlineEditLabels}
      renderValueDisplay={(v) => <TruckLink id={v} fallbackLabel={order.truckPlate} showPlate />}
    />
  );

  const driverField = (
    <InlineSelectField
      canEdit={canEditMeta}
      value={order.driverId ?? ''}
      onSave={async (next) => {
        const picked = employees.find((e) => e.id === next);
        await handleMetaPatch({ driverId: next, driverName: picked?.name ?? '' });
      }}
      data={driverSelectData}
      placeholder={t('transportOrders.form.driver')}
      labels={inlineEditLabels}
      renderValueDisplay={(v) => <EmployeeLink id={v} />}
    />
  );

  
  
  const entryDateField = (
    <InlineEditField<string | null>
      canEdit={canEditMeta}
      value={order.entryDate ? isoToVnDateString(order.entryDate) : null}
      onSave={async (next) => handleMetaPatch({ entryDate: vnDateStringToIso(next) })}
      labels={inlineEditLabels}
      renderDisplay={(v) =>
        v ? (
          <Text size="sm">{formatDate(order.entryDate)}</Text>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">
            —
          </Text>
        )
      }
      renderEditor={({ value: v, onChange }) => (
        <DateField
          value={v}
          onChange={(next) => onChange(next || null)}
          placeholder={t('transportOrders.columns.date')}
          autoFocus
        />
      )}
    />
  );

  const billNumberField = (
    <InlineTextField
      canEdit={canEditMeta}
      value={order.billNumber ?? ''}
      onSave={async (next) => handleMetaPatch({ billNumber: next.trim() })}
      labels={inlineEditLabels}
    />
  );

  
  
  
  
  
  const containerNumberField = (
    <InlineEditField<string>
      canEdit={canEditMeta}
      value={order.containerNumber ?? ''}
      labels={inlineEditLabels}
      submitOnEnter
      onSave={async (next) => {
        const normalized = normalizeContainerNumber(next);
        if (!isValidContainerNumber(normalized)) {
          notifications.show({
            color: 'red',
            message: t('transportOrders.validation.containerNumberPattern'),
          });
          throw new Error('invalid container number');
        }
        await handleMetaPatch({ containerNumber: normalized });
      }}
      renderDisplay={(v) =>
        v ? (
          <Text size="sm">{v}</Text>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">
            —
          </Text>
        )
      }
      renderEditor={({ value: v, onChange }) => (
        <TextInput
          value={v}
          onChange={(e) => onChange(e.currentTarget.value.toUpperCase())}
          error={
            isValidContainerNumber(v)
              ? undefined
              : t('transportOrders.validation.containerNumberPattern')
          }
          placeholder="RFCU9876543"
          data-autofocus
          autoFocus
        />
      )}
    />
  );

  const contractNoField = (
    <InlineTextField
      canEdit={canEditMeta}
      value={order.transportContractNo ?? ''}
      onSave={async (next) => handleMetaPatch({ transportContractNo: next.trim() })}
      labels={inlineEditLabels}
    />
  );

  
  const patchRoute = (partial: Partial<typeof order.route>) =>
    handleMetaPatch({
      route: {
        pickup: order.route?.pickup ?? '',
        stuffing: order.route?.stuffing ?? '',
        dropoff: order.route?.dropoff ?? '',
        ...(order.route?.pickupAt ? { pickupAt: order.route.pickupAt } : {}),
        ...(order.route?.stuffingAt ? { stuffingAt: order.route.stuffingAt } : {}),
        ...(order.route?.dropoffAt ? { dropoffAt: order.route.dropoffAt } : {}),
        ...partial,
      },
    });

  const routeField = (leg: 'pickup' | 'stuffing' | 'dropoff') => (
    <InlineTextField
      canEdit={canEditMeta}
      value={order.route?.[leg] ?? ''}
      onSave={async (next) => patchRoute({ [leg]: next.trim() })}
      labels={inlineEditLabels}
    />
  );

  
  const routeTimeField = (leg: 'pickupAt' | 'stuffingAt' | 'dropoffAt') => (
    <InlineEditField<string | null>
      canEdit={canEditMeta}
      value={isoToDateTimeString(order.route?.[leg])}
      
      
      onSave={async (next) => patchRoute({ [leg]: next ? dateTimeStringToIso(next) : undefined })}
      labels={inlineEditLabels}
      renderDisplay={(v) => (
        <Text size="sm" c="dimmed" fs={v ? undefined : 'italic'}>
          {v ? formatDateTime(order.route?.[leg]) : '—'}
        </Text>
      )}
      renderEditor={({ value: v, onChange }) => (
        <DateTimeField
          value={v}
          onChange={(next) => onChange((next as string | null) || null)}
          placeholder={t(`transportOrders.route.${leg}`)}
          autoFocus
        />
      )}
    />
  );

  
  const routeStopRow = (leg: 'pickup' | 'stuffing' | 'dropoff') =>
    infoRow(
      t(`transportOrders.route.${leg}`),
      <Stack gap={0} align="flex-end">
        {routeField(leg)}
        {routeTimeField(`${leg}At` as 'pickupAt' | 'stuffingAt' | 'dropoffAt')}
      </Stack>,
    );

  
  const tripsCard = order.isMultiTrip && (
    <SectionCard icon={<IconRoute size={14} />} title={t('transportOrders.trips.title')}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('transportOrders.trips.departure')}</Table.Th>
            <Table.Th>{t('transportOrders.trips.destination')}</Table.Th>
            {/* No NGÀY column — the loading estimate carries the leg's day, and
                the leg's stored `date` is derived from it on the form. A leg with
                no estimate falls back to showing that date, so a pre-2026-07-21
                multi-trip order still reads its per-leg day here. */}
            <Table.Th>{t('transportOrders.trips.loadingAt')}</Table.Th>
            <Table.Th>{t('transportOrders.trips.unloadingAt')}</Table.Th>
            <Table.Th>{t('transportOrders.columns.truck')}</Table.Th>
            <Table.Th>{t('transportOrders.form.driver')}</Table.Th>
            <Table.Th ta="right">{t('transportOrders.trips.laborCost')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(order.trips ?? []).map((trip, i) => (
            <Table.Tr key={i}>
              <Table.Td>{trip.departure || '—'}</Table.Td>
              <Table.Td>{trip.destination || '—'}</Table.Td>
              {/* Estimates, so they read dimmed — the plan, not what happened.
                  Read-only like the rest of the leg: `trips` is the source the
                  order-level mirror derives from, so it is edited on the form. */}
              <Table.Td c="dimmed">
                {trip.loadingAt
                  ? formatDateTime(trip.loadingAt)
                  : trip.date
                    ? formatDate(trip.date)
                    : '—'}
              </Table.Td>
              <Table.Td c="dimmed">
                {trip.unloadingAt ? formatDateTime(trip.unloadingAt) : '—'}
              </Table.Td>
              {/* Linked, not printed — same rule as the order-level truck/driver,
                  and each leg carries its own plate/name snapshot to fall back on. */}
              <Table.Td>
                <TruckLink id={trip.truckId} fallbackLabel={trip.truckPlate} showPlate />
              </Table.Td>
              <Table.Td>{trip.driverId ? <EmployeeLink id={trip.driverId} /> : '—'}</Table.Td>
              <Table.Td ta="right">{canViewPrice ? formatMoney(trip.laborCost) : '—'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {/* Σ driver pay — money, so `canViewPrice` gates it like every other figure.
          It sits here rather than in the fee card because it's what the operator
          pays out, not part of what the customer is billed. */}
      {canViewPrice && (
        <>
          <Divider />
          <Group justify="space-between">
            <Text fw={700}>{t('transportOrders.trips.laborTotal')}</Text>
            <Text fw={700}>{formatMoney(tripLaborTotal)}</Text>
          </Group>
        </>
      )}
    </SectionCard>
  );

  const overviewContent = (
    <Stack gap="lg">
      {tripsCard}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <SectionCard icon={<IconInfoCircle size={14} />} title={t('transportOrders.detail.info')}>
          <Box>
            <Stack gap={6}>
              {/* Inline-editable: the fields that arrive or change AFTER the job is
              booked. Money (fees / disbursements / vatRate) is deliberately NOT
              here — `totalAmount` is FE-derived and only the form's
              `buildTransportOrderWrite` recomputes it.
              On a multi-trip job the date / truck / driver are derived from leg 1
              by that same builder, which puts them in the same bucket as money:
              an inline patch would desync them from `trips`. So they drop off
              here entirely and the Trips card below carries them per leg —
              showing leg 1's truck as though it were *the* truck would misread a
              3-leg job anyway. */}
              {!order.isMultiTrip && (
                <>
                  {infoRow(t('transportOrders.columns.date'), entryDateField)}
                  {/* Truck / driver are stored as ids and customer as its registry
                  `code`, each with a denormalized snapshot; link through to the live
                  record, falling back to the snapshot when the register is off or
                  still loading. */}
                  {infoRow(t('transportOrders.columns.truck'), truckField)}
                  {infoRow(t('transportOrders.form.driver'), driverField)}
                </>
              )}
              {infoRow(t('transportOrders.columns.bill'), billNumberField)}
              {infoRow(t('transportOrders.columns.container'), containerNumberField)}
              {infoRow(
                t('transportOrders.form.containerSize'),
                containerSizeLabel(order.containerSize),
              )}
              {infoRow(
                t('transportOrders.form.shipmentType'),
                order.shipmentType ? t(`transportOrders.shipmentType.${order.shipmentType}`) : '',
              )}
              {/* Customer stays read-only — it's the billing party, and changing it
              belongs with the fee review on the form (SO does the same). */}
              {(order.customerCode || order.customerName) &&
                infoRow(
                  t('transportOrders.form.customer'),
                  <CustomerLink code={order.customerCode} fallbackLabel={order.customerName} />,
                )}
              {infoRow(t('transportOrders.billing.contractNo'), contractNoField)}
            </Stack>
            {/* Same rule as above: a multi-trip job's `route` is derived from the legs
            (first departure → last destination), so it isn't editable here — and
            the leg list states it better than a collapsed 3-field triple. */}
            {!order.isMultiTrip && (
              <>
                <Divider my="sm" />
                <Text fw={600} mb="sm">
                  {t('transportOrders.route.title')}
                </Text>
                <Stack gap={6}>
                  {routeStopRow('pickup')}
                  {routeStopRow('stuffing')}
                  {routeStopRow('dropoff')}
                </Stack>
              </>
            )}
            <Divider my="sm" />
            <Text c="dimmed" size="sm" mb={4}>
              {t('__new__.01-common.labels.note')}
            </Text>
            <InlineTextareaField
              canEdit={canEditMeta}
              value={order.notes ?? ''}
              onSave={async (next) => handleMetaPatch({ notes: next.trim() })}
              labels={inlineEditLabels}
              minRows={2}
            />
            <Divider my="sm" />
            {/* Provenance — `extra.createdBy` was written since day one and never shown. */}
            <Stack gap={6}>
              {order.extra?.createdBy &&
                infoRow(
                  t('transportOrders.detail.createdBy'),
                  <EmployeeLink id={order.extra.createdBy} />,
                )}
              {infoRow(t('common.labels.createdAt'), formatDateTime(order.createdAt))}
              {infoRow(t('common.labels.updatedAt'), formatDateTime(order.updatedAt))}
            </Stack>
          </Box>
        </SectionCard>

        <Stack gap="lg">
          {/* One fee card since the 2026-07-16 merge — the old PHÍ CHI HỘ card is
              gone, its rows are `prepaid` + non-vatable lines in here. Read through
              `readFeeLines` so a pre-merge order shows them without a migration. */}
          <SectionCard icon={<IconReceipt size={14} />} title={t('transportOrders.fees.title')}>
            <Table>
              <Table.Tbody>
                {feeLines.map((f, i) => {
                  const billed = isBillableFee(f);
                  return (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Group gap={6} wrap="wrap">
                          {/* A line the customer settled reads dimmed — it's on the
                              record, but it is not part of what they're charged, and
                              nothing below adds it up. */}
                          <Text size="sm" c={billed ? undefined : 'dimmed'}>
                            {f.label}
                          </Text>
                          {/* Operator note on the line — free text, only when set. */}
                          {f.memo && (
                            <Text size="xs" c="dimmed" fs="italic">
                              {f.memo}
                            </Text>
                          )}
                          {/* Kind first: it's what tells the reader whether this is
                              our charge or a third party's cost — the same split the
                              two subtotals below are drawn on. */}
                          {f.kind === 'passthrough' && (
                            <Badge size="xs" variant="light" color="teal">
                              {t('transportOrders.fees.kindPassthrough')}
                            </Badge>
                          )}
                          {f.vatable && (
                            <Badge size="xs" variant="light" color="blue">
                              VAT
                            </Badge>
                          )}
                          {!billed && (
                            <Badge size="xs" variant="light" color="gray">
                              {t('transportOrders.fees.notBilled')}
                            </Badge>
                          )}
                          {f.invoiceNo && (
                            <Text size="xs" c="dimmed">
                              {f.invoiceNo}
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" c={billed ? undefined : 'dimmed'}>
                          {canViewPrice ? formatMoney(f.amount) : '—'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
            {canViewPrice && (
              <Stack gap={4} mt="sm">
                <Divider />
                {/* Subtotalled per Loại — our revenue and a third party's cost we're
                    reclaiming are different money, and a freight invoice is read
                    that way. `Cộng chi hộ` hides when there is none rather than
                    printing a zero nobody asked about. */}
                {infoRow(
                  t('transportOrders.billing.serviceSubtotal'),
                  formatMoney(totals.serviceSubtotal),
                )}
                {totals.passthroughSubtotal > 0 &&
                  infoRow(
                    t('transportOrders.billing.passthroughSubtotal'),
                    formatMoney(totals.passthroughSubtotal),
                  )}
                {infoRow(
                  t('transportOrders.billing.vatAmount', {
                    rate: Math.round((order.vatRate ?? 0) * 100),
                  }),
                  formatMoney(totals.vatAmount),
                )}
                {/* Shown for reconciliation, sitting OUTSIDE the running total —
                    it's what the customer handled themselves. */}
                {totals.nonBillableTotal > 0 &&
                  infoRow(
                    t('transportOrders.billing.nonBillableTotal'),
                    <Text size="sm" c="dimmed">
                      {formatMoney(totals.nonBillableTotal)}
                    </Text>,
                  )}
                <Group justify="space-between">
                  <Text fw={totals.advanceAmount > 0 ? 600 : 700}>
                    {t('transportOrders.billing.grandTotal')}
                  </Text>
                  <Text fw={totals.advanceAmount > 0 ? 600 : 700}>
                    {formatMoney(totals.grandTotal)}
                  </Text>
                </Group>
                {/* With an advance, "còn lại" is the figure that matters — so the
                    bold moves onto it and the grand total steps back. */}
                {totals.advanceAmount > 0 && (
                  <>
                    {infoRow(
                      t('transportOrders.billing.advance'),
                      formatMoney(-totals.advanceAmount),
                    )}
                    <Group justify="space-between">
                      <Text fw={700}>{t('transportOrders.billing.balanceDue')}</Text>
                      <Text fw={700} c={totals.balanceDue < 0 ? 'green' : undefined}>
                        {formatMoney(totals.balanceDue)}
                      </Text>
                    </Group>
                  </>
                )}
              </Stack>
            )}
          </SectionCard>
        </Stack>
      </SimpleGrid>
    </Stack>
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Button
            onClick={() => navigate(ROUTES.TRANSPORT_ORDERS.LIST)}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
          <Title order={3}>{order.orderNumber}</Title>
          {isCancelled ? (
            <Badge color="red" variant="light">
              {t('transportOrders.cancel.statusBadge')}
            </Badge>
          ) : (
            <Badge color={status.color} variant="light">
              {statusText}
            </Badge>
          )}
        </Group>
        {/* Desktop-only — the form is desktop-only, so every affordance that lands
            on it is too. Copy is deliberately OUTSIDE the `!locked` guard: it
            creates a NEW order, so the source's manifest lock (or cancellation)
            is irrelevant — repeating a locked job is exactly when you want it. */}
        {!isMobile && (
          <Group gap="xs">
            {canCreate && (
              <Button variant="subtle" leftSection={<IconCopy size={16} />} onClick={handleCopy}>
                {t('__new__.01-common.actions.copy')}
              </Button>
            )}
            {!locked && canEdit && (
              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={() => navigate(ROUTES.TRANSPORT_ORDERS.EDIT.replace(':id', order.id))}
              >
                {t('__new__.01-common.actions.edit')}
              </Button>
            )}
            {!locked && canDelete && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => setConfirmDelete(true)}
              >
                {t('__new__.01-common.actions.remove')}
              </Button>
            )}
          </Group>
        )}
      </Group>

      {/* Manifest-locked: order is frozen — no edit / delete / status change. */}
      {locked && (
        <Alert color="gray" variant="light" icon={<IconLock size={16} />}>
          {t('transportOrders.locked.notice')}
        </Alert>
      )}

      {/* Status transitions — one verb button per status the matrix allows. */}
      {canTransition && !locked && (nextStatuses.length > 0 || (canCancel && !isCancelled)) && (
        <Group gap="xs">
          {nextStatuses.map((next) => (
            <Button
              key={next.value}
              color={next.color}
              variant="filled"
              loading={actionLoading}
              onClick={() => {
                setStatusNote('');
                setStatusTarget(next);
              }}
            >
              {next.actionLabel}
            </Button>
          ))}
          {canCancel && !isCancelled && (
            <Button
              color="red"
              variant="outline"
              loading={actionLoading}
              onClick={() => setCancelOpen(true)}
            >
              {t('transportOrders.actions.cancel')}
            </Button>
          )}
        </Group>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconFileText size={16} />}>
            {t('transportOrders.detail.info')}
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            {t('transportOrders.detail.tabActivity')}
          </Tabs.Tab>
          {activityLogTabVisible && (
            <Tabs.Tab value="activityLog" leftSection={<IconHistory size={16} />}>
              {t('transportOrders.detail.tabActivityLog')}
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {overviewContent}
        </Tabs.Panel>

        {/* Per-entity timeline — where is THIS order in the flow. `showNotes={false}`
            is mandatory on transactional modules; the platform log carries notes. */}
        <Tabs.Panel value="history" pt="md">
          <Card withBorder padding="md" radius="md">
            <ActivityTimeline
              statusFlowOrder={statusFlowOrder}
              currentFlowIndex={currentFlowIndex}
              currentStatusValue={order.status}
              activityByStatus={activityByStatus}
              resolveStatus={resolveStatus}
              expectedDeliveryAtStatus={null}
              showNotes={false}
            />
          </Card>
        </Tabs.Panel>

        {activityLogTabVisible && (
          <Tabs.Panel value="activityLog" pt="md">
            {/* Lazy-mount: the panel fires `getByTarget` on mount. */}
            {activeTab === 'activityLog' && (
              <ActivityByTargetPanel targetId={order.id} i18nNamespace="transportOrders.detail" />
            )}
          </Tabs.Panel>
        )}
      </Tabs>

      {/* A status flip writes the timeline entry with it — confirm before firing,
          and let the operator attach the "why" (SO's shape, same component). */}
      {statusTarget && (
        <StatusChangeModal
          opened
          onClose={() => setStatusTarget(null)}
          onConfirm={() => {
            const target = statusTarget;
            setStatusTarget(null);
            handleTransition(target.value, statusNote);
          }}
          loading={actionLoading}
          title={t('transportOrders.statusChange.confirmTitle')}
          message={t('transportOrders.statusChange.confirmMessage', {
            from: statusText,
            to: statusTarget.label,
          })}
          confirmLabel={statusTarget.actionLabel}
          confirmColor={statusTarget.color}
          
          warning={statusTarget.locked ? t('transportOrders.statusChange.lockWarning') : undefined}
          note={statusNote}
          onNoteChange={setStatusNote}
          notePlaceholder={t('transportOrders.statusChange.notePlaceholder')}
        />
      )}

      <CancelTransportOrderModal
        opened={cancelOpen}
        loading={actionLoading}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => {
          setCancelOpen(false);
          handleCancel(reason);
        }}
      />

      <ConfirmModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          handleDelete();
        }}
        title={t('transportOrders.confirmDelete.title')}
        message={t('transportOrders.confirmDelete.message')}
        confirmLabel={t('__new__.01-common.actions.remove')}
        confirmColor="red"
      />
    </Stack>
  );
}

function CancelTransportOrderModal({
  opened,
  loading,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('transportOrders.cancel.confirmTitle')}
      centered
      onEnterTransitionEnd={() => setReason('')}
    >
      <Stack gap="md">
        <Text size="sm">{t('transportOrders.cancel.confirmMessage')}</Text>
        <Textarea
          label={t('transportOrders.cancel.reasonLabel')}
          placeholder={t('transportOrders.cancel.reasonPlaceholder')}
          autosize
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button color="red" loading={loading} onClick={() => onConfirm(reason)}>
            {t('transportOrders.actions.cancel')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
