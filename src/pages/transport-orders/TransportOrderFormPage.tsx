import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCashBanknote,
  IconCopy,
  IconMapPin,
  IconNote,
  IconPlus,
  IconReceipt,
  IconReceiptTax,
  IconRoute,
  IconTrash,
  IconTruck,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { device, logger } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { SectionCard } from '@/components/SectionCard';
import { EmployeeSelector, CustomerSelector } from '@/components/selectors';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { transportOrderBundle } from '@/stores/useTransportOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { getCurrentActorId, getCurrentEmployeeStamp, useInitFormFromFetch } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { isDriverDepartment } from '@/utils/permission';
import { isoToVnDateString, todayInVnDateString, vnDateStringToIso } from '@/utils/dateTimeField';
import { buildDailySequentialCode, bumpSequentialCode, businessDateString } from '@/utils/code';
import { appConfig } from '@/config';
import type {
  Employee,
  TransportOrder,
  TransportOrderContainerSize,
  TransportOrderExtra,
  TransportOrderFee,
  TransportOrderFeeKind,
  TransportOrderFeePayer,
  TransportOrderShipmentType,
  TransportOrderTrip,
} from '@/types';
import {
  computeTransportOrderTotals,
  computeTripLaborTotal,
  formatMoney,
  readFeeLines,
} from './transportOrderPricing';
import { useContainerSizeOptions } from './containerSize';
import { truckNameWithPlate } from './truckDisplay';
import {
  getInitialTransportOrderStatus,
  isTransportOrderLocked,
  transportOrderStatuses,
} from './transportOrderStatuses';
import {
  buildTransportOrderWrite,
  isDuplicateOrderNumberError,
  MAX_ORDER_NUMBER_RETRIES,
} from './transportOrderWrite';
import { appendTimelineEntry, createMemo, diffTransportOrder, isEmptyDiff } from './activityMemo';

const isMobile = device.isMobile;
const toFeatures = appConfig.features.transportOrders;
const codePrefix = toFeatures.codePrefix;

const toDriverDepartments = toFeatures.driverDepartments ?? [];
const driverEmployeeFilter = (e: Employee) => {
  if (!e.isActive || e.extra?.isDeleted) return false;
  return toDriverDepartments.length > 0
    ? toDriverDepartments.includes(e.department)
    : isDriverDepartment(e.department);
};
const DEFAULT_VAT_PERCENT = 8;

type FeeRow = {
  label: string;
  amount: number;
  vatable: boolean;
  kind: TransportOrderFeeKind;
  payer: TransportOrderFeePayer;
  invoiceNo: string;
  memo: string;
};

type TripRow = {
  departure: string;
  destination: string;
  date: string | null;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;
  laborCost: number;
};

type FormValues = {
  
  isMultiTrip: boolean;
  trips: TripRow[];
  entryDate: string | null;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;
  billNumber: string;
  containerNumber: string;
  containerSize: TransportOrderContainerSize;
  shipmentType: TransportOrderShipmentType;
  pickup: string;
  stuffing: string;
  dropoff: string;
  fees: FeeRow[];
  
  advanceAmount: number;
  vatRatePercent: number;
  transportContractNo: string;
  customerCode: string;
  customerName: string;
  status: string;
  notes: string;
};

const DEFAULT_FEE_LABELS = ['Phí vận chuyển', 'Phụ thu VC', 'Phí neo xe'];

function blankFee(over: Partial<FeeRow> = {}): FeeRow {
  return {
    label: '',
    amount: 0,
    vatable: true,
    kind: 'service',
    payer: 'company',
    invoiceNo: '',
    memo: '',
    ...over,
  };
}

function initialFees(): FeeRow[] {
  return DEFAULT_FEE_LABELS.map((label) => blankFee({ label, vatable: label !== 'Phí neo xe' }));
}

function toFeeRows(order: Pick<TransportOrder, 'fees' | 'disbursements'>): FeeRow[] {
  return readFeeLines(order).map((f) => ({
    ...f,
    payer: f.payer ?? 'company',
    memo: f.memo ?? '',
  }));
}

function blankTrip(): TripRow {
  return {
    departure: '',
    destination: '',
    date: todayInVnDateString(),
    truckId: '',
    truckPlate: '',
    driverId: '',
    driverName: '',
    laborCost: 0,
  };
}

function blankValues(): FormValues {
  return {
    isMultiTrip: false,
    trips: [],
    entryDate: todayInVnDateString(),
    truckId: '',
    truckPlate: '',
    driverId: '',
    driverName: '',
    billNumber: '',
    containerNumber: '',
    containerSize: '20',
    shipmentType: 'import',
    pickup: '',
    stuffing: '',
    dropoff: '',
    fees: initialFees(),
    advanceAmount: 0,
    vatRatePercent: DEFAULT_VAT_PERCENT,
    transportContractNo: '',
    customerCode: '',
    customerName: '',
    status: getInitialTransportOrderStatus(),
    notes: '',
  };
}

function copiedValues(src: TransportOrder): FormValues {
  return {
    isMultiTrip: !!src.isMultiTrip,
    trips: (src.trips ?? []).map((trip) => ({
      departure: trip.departure || '',
      destination: trip.destination || '',
      date: todayInVnDateString(),
      truckId: trip.truckId,
      truckPlate: trip.truckPlate,
      driverId: trip.driverId,
      driverName: trip.driverName,
      laborCost: trip.laborCost || 0,
    })),
    entryDate: todayInVnDateString(),
    truckId: src.truckId,
    truckPlate: src.truckPlate,
    driverId: src.driverId,
    driverName: src.driverName,
    billNumber: src.billNumber || '',
    containerNumber: src.containerNumber || '',
    containerSize: src.containerSize,
    shipmentType: src.shipmentType,
    pickup: src.route?.pickup || '',
    stuffing: src.route?.stuffing || '',
    dropoff: src.route?.dropoff || '',
    
    fees: toFeeRows(src),
    advanceAmount: 0,
    vatRatePercent: Math.round((src.vatRate ?? 0) * 100),
    transportContractNo: src.transportContractNo || '',
    customerCode: src.customerCode || '',
    customerName: src.customerName || '',
    status: getInitialTransportOrderStatus(),
    notes: src.notes || '',
  };
}

function extractCopyFrom(state: unknown): TransportOrder | null {
  if (state === null || typeof state !== 'object') return null;
  const copyFrom = (state as { copyFrom?: unknown }).copyFrom;
  if (copyFrom === null || typeof copyFrom !== 'object') return null;
  return copyFrom as TransportOrder;
}

export function TransportOrderFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  
  const copyFrom = isEdit ? null : extractCopyFrom(location.state);

  useEffect(() => {
    if (!isMobile) return;
    notifications.show({
      color: 'yellow',
      message: t('transportOrders.notifications.mobileFormBlocked'),
      autoClose: 4000,
    });
    navigate(
      isEdit && id
        ? ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', id)
        : ROUTES.TRANSPORT_ORDERS.LIST,
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidateCache = transportOrderBundle.useStore((s) => s.invalidate);
  const snapshotRef = useRef<TransportOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const trucks = useTruckAssetStore((s) => s.items);
  const loadTrucks = useTruckAssetStore((s) => s.loadAll);
  const trucksInit = useTruckAssetStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const customersInit = useCustomerStore((s) => s.initialized);
  const getCustomerByCode = useCustomerStore((s) => s.getByCode);

  useEffect(() => {
    if (isMobile) return;
    if (!trucksInit) loadTrucks();
    if (!customersInit) loadCustomers();
  }, [trucksInit, loadTrucks, customersInit, loadCustomers]);

  const truckSelectData = useMemo(
    () =>
      trucks
        .filter((a) => a.isActive && !a.extra?.isDeleted)
        .map((a) => ({
          value: a.id,
          
          
          label: `${truckNameWithPlate(a.name, a.extra?.plateNumber)}${a.code ? ` (${a.code})` : ''}`,
          plate: a.name,
        })),
    [trucks],
  );

  const statusSelectData = useMemo(
    () => transportOrderStatuses().map((s) => ({ value: s.value, label: s.label })),
    
    [i18n.language],
  );

  
  
  const containerSizeOptions = useContainerSizeOptions();

  const form = useForm<FormValues>({
    
    
    initialValues: copyFrom ? copiedValues(copyFrom) : blankValues(),
    validate: {
      
      
      
      truckId: (v, values) =>
        !values.isMultiTrip && !v ? t('transportOrders.validation.truckRequired') : null,
      driverId: (v, values) =>
        !values.isMultiTrip && !v ? t('transportOrders.validation.driverRequired') : null,
      entryDate: (v, values) =>
        !values.isMultiTrip && !v ? t('transportOrders.validation.entryDateRequired') : null,
      customerCode: (v) => (!v ? t('transportOrders.validation.customerRequired') : null),
      trips: {
        truckId: (v: string, values: FormValues) =>
          values.isMultiTrip && !v ? t('transportOrders.validation.truckRequired') : null,
        driverId: (v: string, values: FormValues) =>
          values.isMultiTrip && !v ? t('transportOrders.validation.driverRequired') : null,
        date: (v: string | null, values: FormValues) =>
          values.isMultiTrip && !v ? t('transportOrders.validation.entryDateRequired') : null,
      },
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (fetchId) => {
      
      
      const { item: o } = await transportOrderBundle.fetchById(fetchId);
      snapshotRef.current = o;
      if (o.extra?.isDeleted) {
        navigate(ROUTES.TRANSPORT_ORDERS.LIST, { replace: true });
        return null;
      }
      
      if (isTransportOrderLocked(o.status)) {
        notifications.show({ color: 'yellow', message: t('transportOrders.locked.notice') });
        navigate(ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', o.id), { replace: true });
        return null;
      }
      return {
        isMultiTrip: !!o.isMultiTrip,
        trips: (o.trips ?? []).map((trip) => ({
          departure: trip.departure || '',
          destination: trip.destination || '',
          date: trip.date ? isoToVnDateString(trip.date) : null,
          truckId: trip.truckId,
          truckPlate: trip.truckPlate,
          driverId: trip.driverId,
          driverName: trip.driverName,
          laborCost: trip.laborCost || 0,
        })),
        entryDate: isoToVnDateString(o.entryDate),
        truckId: o.truckId,
        truckPlate: o.truckPlate,
        driverId: o.driverId,
        driverName: o.driverName,
        billNumber: o.billNumber || '',
        containerNumber: o.containerNumber || '',
        containerSize: o.containerSize,
        shipmentType: o.shipmentType,
        pickup: o.route?.pickup || '',
        stuffing: o.route?.stuffing || '',
        dropoff: o.route?.dropoff || '',
        
        
        fees: toFeeRows(o),
        advanceAmount: o.advanceAmount ?? 0,
        vatRatePercent: Math.round((o.vatRate ?? 0) * 100),
        transportContractNo: o.transportContractNo || '',
        customerCode: o.customerCode || '',
        customerName: o.customerName || '',
        status: o.status,
        notes: o.notes || '',
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('transportOrders.notifications.loadError') });
      navigate(ROUTES.TRANSPORT_ORDERS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      setLoading(true);
      const actor = getCurrentActorId();
      
      
      
      const fees: TransportOrderFee[] = values.fees
        .filter((f) => f.label.trim() || f.amount || f.invoiceNo.trim() || f.memo.trim())
        .map((f) => {
          const base = {
            label: f.label.trim(),
            amount: f.amount || 0,
            invoiceNo: f.invoiceNo.trim(),
            
            
            ...(f.memo.trim() ? { memo: f.memo.trim() } : {}),
          };
          return f.kind === 'passthrough'
            ? { ...base, kind: f.kind, vatable: false, payer: f.payer }
            : { ...base, kind: 'service' as const, vatable: f.vatable };
        });
      const trips: TransportOrderTrip[] = values.trips.map((trip) => ({
        departure: trip.departure.trim(),
        destination: trip.destination.trim(),
        date: vnDateStringToIso(trip.date),
        truckId: trip.truckId,
        truckPlate: trip.truckPlate.trim(),
        driverId: trip.driverId,
        driverName: trip.driverName.trim(),
        laborCost: trip.laborCost || 0,
      }));
      const route = {
        pickup: values.pickup.trim(),
        stuffing: values.stuffing.trim(),
        dropoff: values.dropoff.trim(),
      };
      const vatRate = (values.vatRatePercent || 0) / 100;

      
      
      
      
      const write = (extra: TransportOrderExtra) =>
        buildTransportOrderWrite({
          isMultiTrip: values.isMultiTrip,
          trips,
          entryDate: vnDateStringToIso(values.entryDate),
          truckId: values.truckId,
          truckPlate: values.truckPlate.trim(),
          driverId: values.driverId,
          driverName: values.driverName.trim(),
          billNumber: values.billNumber.trim(),
          containerNumber: values.containerNumber.trim(),
          containerSize: values.containerSize,
          shipmentType: values.shipmentType,
          route,
          fees,
          advanceAmount: values.advanceAmount || 0,
          vatRate,
          transportContractNo: values.transportContractNo.trim(),
          customerCode: values.customerCode || undefined,
          customerName: values.customerName.trim() || undefined,
          status: values.status,
          notes: values.notes.trim(),
          extra,
        });

      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Transport order snapshot missing');
          const updated = await transportOrderBundle.updateSafely({
            id,
            version: snapshot.version,
            patch: write({
              ...snapshot.extra,
              createdBy: snapshot.extra?.createdBy ?? actor,
            }),
          });
          
          
          
          const fields = diffTransportOrder(snapshot, updated);
          if (!isEmptyDiff(fields)) {
            logActivity('transportOrder.update', id, {
              orderNumber: updated.orderNumber,
              fields,
            });
          }
          notifications.show({
            color: 'green',
            message: t('transportOrders.notifications.updated'),
          });
          navigate(ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', id));
        } else {
          
          
          const today = businessDateString();
          const todays = await transportOrderBundle.queryPartition(today);
          const baseNumber = buildDailySequentialCode(
            codePrefix,
            todays.map((o) => o.orderNumber),
          );

          
          
          
          
          
          
          
          const createdExtra: TransportOrderExtra = { createdBy: actor };
          createdExtra.activityLog = appendTimelineEntry(createdExtra, {
            action: 'created',
            toStatus: values.status,
            ...getCurrentEmployeeStamp(),
          });

          let created: TransportOrder | null = null;
          for (let attempt = 0; attempt <= MAX_ORDER_NUMBER_RETRIES; attempt++) {
            const orderNumber = bumpSequentialCode(baseNumber, attempt);
            try {
              created = await transportOrderBundle.createSafely({
                item: { orderNumber, ...write(createdExtra) },
              });
              break;
            } catch (err) {
              if (isDuplicateOrderNumberError(err) && attempt < MAX_ORDER_NUMBER_RETRIES) continue;
              throw err;
            }
          }
          if (!created) throw new Error('Transport order create exhausted order-number retries');

          invalidateCache();
          logActivity('transportOrder.create', created.id, createMemo(created));
          notifications.show({
            color: 'green',
            message: t('transportOrders.notifications.created'),
          });
          navigate(ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        logger.error('Transport order submit failed:', err);
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as TransportOrder;
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
              ? t('transportOrders.notifications.updateError')
              : t('transportOrders.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate, invalidateCache],
  );

  if (fetching) return null;
  if (isMobile) return null;

  const pageTitle = isEdit ? t('transportOrders.edit') : t('transportOrders.new');

  
  const handleMultiTripToggle = (checked: boolean) => {
    form.setFieldValue('isMultiTrip', checked);
    if (checked && form.values.trips.length === 0) form.setFieldValue('trips', [blankTrip()]);
  };

  
  const setTripTruck = (i: number, truckId: string | null) => {
    const picked = truckSelectData.find((tr) => tr.value === truckId);
    form.setFieldValue(`trips.${i}.truckId`, truckId ?? '');
    form.setFieldValue(`trips.${i}.truckPlate`, picked?.plate ?? '');
    const truck = truckId ? trucks.find((a) => a.id === truckId) : undefined;
    if (truck?.extra?.driverId) {
      form.setFieldValue(`trips.${i}.driverId`, truck.extra.driverId);
      form.setFieldValue(`trips.${i}.driverName`, truck.extra.driverName ?? '');
    }
  };

  const setTripDriver = (
    i: number,
    sel: { id: string; name: string; employee: Employee } | null,
  ) => {
    form.setFieldValue(`trips.${i}.driverId`, sel?.id ?? '');
    form.setFieldValue(`trips.${i}.driverName`, sel?.name ?? '');
    const linkedId = sel?.employee.extra?.truckAssetId;
    const linkedTruck = linkedId ? truckSelectData.find((tr) => tr.value === linkedId) : undefined;
    if (linkedTruck) {
      form.setFieldValue(`trips.${i}.truckId`, linkedTruck.value);
      form.setFieldValue(`trips.${i}.truckPlate`, linkedTruck.plate);
    }
  };

  const tripLaborTotal = computeTripLaborTotal(form.values.trips);

  
  
  
  const currentSize = form.values.containerSize;
  const containerSizeData =
    currentSize && !containerSizeOptions.some((o) => o.value === currentSize)
      ? [...containerSizeOptions, { value: currentSize, label: `${currentSize}ft` }]
      : containerSizeOptions;

  const payerSelectData = [
    { value: 'company', label: t('transportOrders.fees.payerCompany') },
    { value: 'customer', label: t('transportOrders.fees.payerCustomer') },
  ];

  
  
  
  
  
  
  const feeRowsIndexed = form.values.fees.map((row, i) => ({ row, i }));
  const serviceFeeRows = feeRowsIndexed.filter(({ row }) => row.kind !== 'passthrough');
  const passthroughFeeRows = feeRowsIndexed.filter(({ row }) => row.kind === 'passthrough');

  
  
  const totals = computeTransportOrderTotals(
    form.values.fees,
    (form.values.vatRatePercent || 0) / 100,
    form.values.advanceAmount || 0,
  );

  const totalsRow = (label: string, value: number, dimmed = false) => (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" c={dimmed ? 'dimmed' : undefined}>
        {formatMoney(value)}
      </Text>
    </Group>
  );

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

      <Title order={3}>{pageTitle}</Title>

      {copyFrom && (
        <Alert color="blue" variant="light" icon={<IconCopy size={16} />}>
          {t('transportOrders.copiedFrom', { code: copyFrom.orderNumber })}
        </Alert>
      )}

      <form
        onSubmit={
          
          form.onSubmit(handleSubmit)
        }
      >
        <Stack gap="lg">
          {/* Job header */}
          <SectionCard
            icon={<IconTruck size={14} />}
            title={t('transportOrders.form.jobSection')}
            
            actions={
              <Switch
                label={t('transportOrders.form.multiTrip')}
                description={t('transportOrders.form.multiTripHint')}
                checked={form.values.isMultiTrip}
                onChange={(e) => handleMultiTripToggle(e.currentTarget.checked)}
              />
            }
          >
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
              {/* Derived from leg 1 on a multi-trip job — hidden rather than shown
                  authored-but-overwritten. */}
              {!form.values.isMultiTrip && (
                <>
                  <DateField
                    withAsterisk
                    label={t('transportOrders.columns.date')}
                    {...form.getInputProps('entryDate')}
                  />
                  <Select
                    withAsterisk
                    label={t('transportOrders.columns.truck')}
                    data={truckSelectData}
                    value={form.values.truckId || null}
                    onChange={(v) => {
                      const picked = truckSelectData.find((tr) => tr.value === v);
                      form.setFieldValue('truckId', v ?? '');
                      form.setFieldValue('truckPlate', picked?.plate ?? '');
                      
                      
                      const truck = v ? trucks.find((a) => a.id === v) : undefined;
                      if (truck?.extra?.driverId) {
                        form.setFieldValue('driverId', truck.extra.driverId);
                        form.setFieldValue('driverName', truck.extra.driverName ?? '');
                      }
                    }}
                    error={form.errors.truckId}
                    searchable
                    clearable
                    nothingFoundMessage={t('transportOrders.form.noTrucks')}
                  />
                  <EmployeeSelector
                    withAsterisk
                    label={t('transportOrders.form.driver')}
                    value={form.values.driverId || null}
                    onChange={(sel) => {
                      form.setFieldValue('driverId', sel?.id ?? '');
                      form.setFieldValue('driverName', sel?.name ?? '');
                      
                      
                      const linkedId = sel?.employee.extra?.truckAssetId;
                      const linkedTruck = linkedId
                        ? truckSelectData.find((tr) => tr.value === linkedId)
                        : undefined;
                      if (linkedTruck) {
                        form.setFieldValue('truckId', linkedTruck.value);
                        form.setFieldValue('truckPlate', linkedTruck.plate);
                      }
                    }}
                    error={form.errors.driverId}
                    filter={driverEmployeeFilter}
                  />
                </>
              )}
              <TextInput
                label={t('transportOrders.columns.bill')}
                {...form.getInputProps('billNumber')}
              />
              <TextInput
                label={t('transportOrders.columns.container')}
                {...form.getInputProps('containerNumber')}
              />
              <Select
                label={t('transportOrders.form.containerSize')}
                data={containerSizeData}
                value={form.values.containerSize || null}
                onChange={(v) =>
                  form.setFieldValue('containerSize', (v as TransportOrderContainerSize) ?? '20')
                }
                searchable
                allowDeselect={false}
              />
              <Select
                label={t('transportOrders.form.shipmentType')}
                data={[
                  { value: 'import', label: t('transportOrders.shipmentType.import') },
                  { value: 'export', label: t('transportOrders.shipmentType.export') },
                ]}
                value={form.values.shipmentType}
                onChange={(v) =>
                  form.setFieldValue('shipmentType', (v as TransportOrderShipmentType) ?? 'import')
                }
              />
              {/* Status is button-driven on the detail page and defaults to the
                  first status ("New") on create, so the picker only shows on edit. */}
              {isEdit && (
                <Select
                  label={t('__new__.01-common.labels.status')}
                  data={statusSelectData}
                  value={form.values.status || null}
                  onChange={(v) => form.setFieldValue('status', v ?? '')}
                />
              )}
              <CustomerSelector
                label={t('transportOrders.form.customer')}
                withAsterisk
                
                
                
                value={
                  form.values.customerCode
                    ? (getCustomerByCode(form.values.customerCode)?.id ?? null)
                    : null
                }
                onChange={(sel) => {
                  form.setFieldValue('customerCode', sel?.customer.code ?? '');
                  form.setFieldValue('customerName', sel?.name ?? '');
                }}
                error={form.errors.customerCode}
                clearable
              />
            </SimpleGrid>
          </SectionCard>

          {/* Trips — replaces the Route card on a multi-trip job: on an N-leg
              route the legs ARE the route, and the fixed pickup/stuffing/dropoff
              triple can't describe one. `buildTransportOrderWrite` folds them back
              into `route` (first departure → last destination) so the list column
              still renders. */}
          {form.values.isMultiTrip && (
            <SectionCard
              icon={<IconRoute size={14} />}
              title={t('transportOrders.trips.title')}
              actions={
                <Button
                  size="compact-sm"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => form.insertListItem('trips', blankTrip())}
                >
                  {t('transportOrders.trips.add')}
                </Button>
              }
            >
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('transportOrders.trips.departure')}</Table.Th>
                    <Table.Th>{t('transportOrders.trips.destination')}</Table.Th>
                    <Table.Th w={150}>{t('transportOrders.columns.date')}</Table.Th>
                    <Table.Th w={190}>{t('transportOrders.columns.truck')}</Table.Th>
                    <Table.Th w={190}>{t('transportOrders.form.driver')}</Table.Th>
                    <Table.Th w={150}>{t('transportOrders.trips.laborCost')}</Table.Th>
                    <Table.Th w={40} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {form.values.trips.map((_, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <TextInput {...form.getInputProps(`trips.${i}.departure`)} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput {...form.getInputProps(`trips.${i}.destination`)} />
                      </Table.Td>
                      <Table.Td>
                        <DateField {...form.getInputProps(`trips.${i}.date`)} />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={truckSelectData}
                          value={form.values.trips[i]!.truckId || null}
                          onChange={(v) => setTripTruck(i, v)}
                          error={form.errors[`trips.${i}.truckId`]}
                          searchable
                          clearable
                          nothingFoundMessage={t('transportOrders.form.noTrucks')}
                        />
                      </Table.Td>
                      <Table.Td>
                        <EmployeeSelector
                          value={form.values.trips[i]!.driverId || null}
                          onChange={(sel) => setTripDriver(i, sel)}
                          error={form.errors[`trips.${i}.driverId`]}
                          filter={driverEmployeeFilter}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          thousandSeparator=","
                          min={0}
                          {...form.getInputProps(`trips.${i}.laborCost`)}
                        />
                      </Table.Td>
                      <Table.Td>
                        {/* The last leg can't be removed — see `handleMultiTripToggle`. */}
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          disabled={form.values.trips.length === 1}
                          onClick={() => form.removeListItem('trips', i)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {/* Σ driver pay, at the foot of the list where the PO asked for it.
                  Deliberately apart from the fee card's totals — this is what the
                  operator pays out, not what the customer is billed. */}
              <Group justify="flex-end" gap="md">
                <Text fw={600}>{t('transportOrders.trips.laborTotal')}</Text>
                <Text fw={700}>{formatMoney(tripLaborTotal)}</Text>
              </Group>
            </SectionCard>
          )}

          {/* Route — single-trip only; the leg list above supersedes it. */}
          {!form.values.isMultiTrip && (
            <SectionCard icon={<IconMapPin size={14} />} title={t('transportOrders.route.title')}>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <TextInput
                  label={t('transportOrders.route.pickup')}
                  {...form.getInputProps('pickup')}
                />
                <TextInput
                  label={t('transportOrders.route.stuffing')}
                  {...form.getInputProps('stuffing')}
                />
                <TextInput
                  label={t('transportOrders.route.dropoff')}
                  {...form.getInputProps('dropoff')}
                />
              </SimpleGrid>
            </SectionCard>
          )}

          {/* Fees — TWO groups, split by `kind`, each its own card + Add button.
              The `Loại` picker is gone: a row's kind is the card it lives in.
              Both feed the one `form.values.fees` array (rendered filtered by kind,
              edited by real index), so the totals and the write path are unchanged.
              Service = our own charge (VAT-able, no payer); chi hộ = a third party's
              cost (never VAT-taxed, `payer` decides collection). */}
          <SectionCard
            icon={<IconReceipt size={14} />}
            title={t('transportOrders.fees.kindService')}
            actions={
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => form.insertListItem('fees', blankFee())}
              >
                {t('transportOrders.fees.add')}
              </Button>
            }
          >
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('transportOrders.fees.label')}</Table.Th>
                  <Table.Th w={150}>{t('transportOrders.fees.amount')}</Table.Th>
                  <Table.Th w={60} ta="center">
                    {t('transportOrders.fees.vatable')}
                  </Table.Th>
                  <Table.Th w={140}>{t('transportOrders.fees.invoiceNo')}</Table.Th>
                  <Table.Th>{t('transportOrders.fees.memo')}</Table.Th>
                  <Table.Th w={40} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {serviceFeeRows.map(({ i }) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <TextInput {...form.getInputProps(`fees.${i}.label`)} />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        thousandSeparator=","
                        min={0}
                        {...form.getInputProps(`fees.${i}.amount`)}
                      />
                    </Table.Td>
                    <Table.Td ta="center">
                      <Checkbox
                        checked={form.values.fees[i]!.vatable}
                        onChange={(e) =>
                          form.setFieldValue(`fees.${i}.vatable`, e.currentTarget.checked)
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput {...form.getInputProps(`fees.${i}.invoiceNo`)} />
                    </Table.Td>
                    <Table.Td>
                      <TextInput {...form.getInputProps(`fees.${i}.memo`)} />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => form.removeListItem('fees', i)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </SectionCard>

          {/* Chi hộ — a third party's cost. Never VAT-taxed (that VAT is on their
              invoice); `payer` decides whether we bill it. */}
          <SectionCard
            icon={<IconCashBanknote size={14} />}
            title={t('transportOrders.fees.kindPassthrough')}
            actions={
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  form.insertListItem(
                    'fees',
                    blankFee({ kind: 'passthrough', vatable: false, payer: 'company' }),
                  )
                }
              >
                {t('transportOrders.fees.add')}
              </Button>
            }
          >
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('transportOrders.fees.label')}</Table.Th>
                  <Table.Th w={150}>{t('transportOrders.fees.amount')}</Table.Th>
                  <Table.Th w={150}>{t('transportOrders.fees.payer')}</Table.Th>
                  <Table.Th w={140}>{t('transportOrders.fees.invoiceNo')}</Table.Th>
                  <Table.Th>{t('transportOrders.fees.memo')}</Table.Th>
                  <Table.Th w={40} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {passthroughFeeRows.map(({ i }) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <TextInput {...form.getInputProps(`fees.${i}.label`)} />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        thousandSeparator=","
                        min={0}
                        {...form.getInputProps(`fees.${i}.amount`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        data={payerSelectData}
                        value={form.values.fees[i]!.payer}
                        onChange={(v) =>
                          form.setFieldValue(
                            `fees.${i}.payer`,
                            (v as TransportOrderFeePayer) ?? 'company',
                          )
                        }
                        allowDeselect={false}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput {...form.getInputProps(`fees.${i}.invoiceNo`)} />
                    </Table.Td>
                    <Table.Td>
                      <TextInput {...form.getInputProps(`fees.${i}.memo`)} />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => form.removeListItem('fees', i)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </SectionCard>

          {/* Billing summary — VAT rate + advance drive the running total that
              settles over BOTH groups, so it stands alone rather than under one. */}
          <SectionCard
            icon={<IconReceiptTax size={14} />}
            title={t('transportOrders.billing.title')}
          >
            <Group gap="sm" align="flex-end">
              <NumberInput
                w={160}
                label={t('transportOrders.billing.vatRate')}
                suffix="%"
                min={0}
                max={100}
                {...form.getInputProps('vatRatePercent')}
              />
              {/* TẠM ỨNG sits with the totals it settles, not in the job header —
                  it's only legible next to the "còn lại" it produces. */}
              <NumberInput
                w={200}
                label={t('transportOrders.billing.advance')}
                thousandSeparator=","
                min={0}
                {...form.getInputProps('advanceAmount')}
              />
            </Group>

            {/* The running total. The form never showed one before, but an operator
                typing an advance with no visible balance is working blind — and it's
                the balance, not the advance, that the field exists to produce. */}
            <Divider my="sm" />
            <Stack gap={4}>
              {/* Subtotalled per Loại — the two are different money (our revenue vs
                  a third party's cost we're reclaiming), which is how a freight
                  invoice is read, and what the deferred PDF will group by. */}
              {totalsRow(t('transportOrders.billing.serviceSubtotal'), totals.serviceSubtotal)}
              {totals.passthroughSubtotal > 0 &&
                totalsRow(
                  t('transportOrders.billing.passthroughSubtotal'),
                  totals.passthroughSubtotal,
                )}
              {totalsRow(
                t('transportOrders.billing.vatAmount', { rate: form.values.vatRatePercent || 0 }),
                totals.vatAmount,
              )}
              {totals.nonBillableTotal > 0 &&
                totalsRow(
                  t('transportOrders.billing.nonBillableTotal'),
                  totals.nonBillableTotal,
                  true,
                )}
              <Group justify="space-between">
                <Text fw={600}>{t('transportOrders.billing.grandTotal')}</Text>
                <Text fw={600}>{formatMoney(totals.grandTotal)}</Text>
              </Group>
              {totals.advanceAmount > 0 && (
                <>
                  {totalsRow(t('transportOrders.billing.advance'), -totals.advanceAmount)}
                  <Group justify="space-between">
                    <Text fw={700}>{t('transportOrders.billing.balanceDue')}</Text>
                    <Text fw={700}>{formatMoney(totals.balanceDue)}</Text>
                  </Group>
                </>
              )}
            </Stack>
          </SectionCard>

          {/* Meta */}
          <SectionCard icon={<IconNote size={14} />} title={t('transportOrders.form.metaSection')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label={t('transportOrders.billing.contractNo')}
                {...form.getInputProps('transportContractNo')}
              />
            </SimpleGrid>
            <Textarea
              label={t('__new__.01-common.labels.note')}
              autosize
              minRows={2}
              {...form.getInputProps('notes')}
            />
          </SectionCard>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => window.history.back()}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {t('__new__.01-common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
