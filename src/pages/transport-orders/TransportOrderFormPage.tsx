import {
  ActionIcon,
  Alert,
  Autocomplete,
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
  IconAlertTriangle,
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
import { DateTimeTextField } from '@/components/DateTimeTextField';
import { SectionCard } from '@/components/SectionCard';
import { EmployeeSelector, CustomerSelector } from '@/components/selectors';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { transportOrderBundle, useTransportOrderStore } from '@/stores/useTransportOrderStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { getCurrentActorId, getCurrentEmployeeStamp, useInitFormFromFetch } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { isDriverDepartment } from '@/utils/permission';
import {
  dateTimeStringToIso,
  isoToDateTimeString,
  isoToVnDateString,
  todayInVnDateString,
  vnDateStringToIso,
} from '@/utils/dateTimeField';
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
import { truckTypeCarriesContainer } from './containerTruckType';
import {
  FALLBACK_FEE_NAMES,
  feeNameSelectData,
  useFeeNameOptions,
  useFreightFeeName,
} from './feeName';
import {
  DEFAULT_SHIPMENT_TYPE,
  useShipmentTypeLabel,
  useShipmentTypeOptions,
} from './shipmentType';
import { truckOptionLabel, useDriverWithPlate, useTruckTypeOf } from './truckDisplay';
import { isExternalTruck } from './externalTruck';
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
import { PLACE_INPUT_STYLES, PLACE_SUGGESTION_LIMIT } from './placeSuggestions';
import { usePlaceSuggestions } from './usePlaceSuggestions';
import { ScheduleConflictAlert } from './ScheduleConflictAlert';
import { useTransportRouteStore } from '@/stores/useTransportRouteStore';
import { TransportRouteSuggestion } from '../transport-routes/TransportRouteSuggestion';
import {
  matchTransportRoutes,
  type TransportRouteDraft,
} from '../transport-routes/transportRouteMatch';
import type { TransportRouteRow } from '@/types';
import { findScheduleConflicts, scheduleWindow, WHOLE_ORDER } from './scheduleConflicts';
import type { ScheduleSlot } from './scheduleConflicts';
import { Form } from '@/components/Form';

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

const NON_CONTAINER_TRUCK_TYPES = toFeatures.nonContainerTruckTypes ?? [];

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

  loadingAt: string | null;

  unloadingAt: string | null;

  externalTruck: boolean;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;
  laborCost: number;
};

type RouteTruckIssue = { leg: number; kind: 'missing' | 'mismatch' };

type FormValues = {
  isMultiTrip: boolean;
  trips: TripRow[];
  entryDate: string | null;

  externalTruck: boolean;
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

  pickupAt: string | null;
  stuffingAt: string | null;
  dropoffAt: string | null;
  fees: FeeRow[];

  advanceAmount: number;

  laborCost: number;
  vatRatePercent: number;

  roundDown: boolean;
  transportContractNo: string;
  customerCode: string;
  customerName: string;
  status: string;
  notes: string;
};

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
  return FALLBACK_FEE_NAMES.map(({ value }) =>
    blankFee({ label: value, vatable: value !== 'Phí neo xe' }),
  );
}

function isSeedFees(fees: FeeRow[]): boolean {
  return (
    fees.length === FALLBACK_FEE_NAMES.length &&
    fees.every(
      (f) =>
        !f.amount &&
        !f.invoiceNo.trim() &&
        !f.memo.trim() &&
        FALLBACK_FEE_NAMES.some((o) => o.value === f.label),
    )
  );
}

function toFeeRows(order: Pick<TransportOrder, 'fees' | 'disbursements'>): FeeRow[] {
  return readFeeLines(order).map((f) => ({
    ...f,
    payer: f.payer ?? 'company',
    memo: f.memo ?? '',
  }));
}

function tripDate(trip: TripRow): string | null {
  const fromLoading = trip.loadingAt
    ? isoToVnDateString(dateTimeStringToIso(trip.loadingAt))
    : null;
  return fromLoading ?? trip.date ?? todayInVnDateString();
}

function blankTrip(): TripRow {
  return {
    departure: '',
    destination: '',
    date: todayInVnDateString(),

    loadingAt: null,
    unloadingAt: null,

    externalTruck: false,
    truckId: '',
    truckPlate: '',
    driverId: '',
    driverName: '',
    laborCost: 0,
  };
}

function legAt(values: FormValues, path: string): TripRow | undefined {
  const index = Number(path.split('.')[1]);
  return Number.isInteger(index) ? values.trips[index] : undefined;
}

function draftScheduleSlots(values: FormValues): ScheduleSlot[] {
  if (values.isMultiTrip) {
    return values.trips.flatMap((trip, i) => {
      const window = scheduleWindow([
        dateTimeStringToIso(trip.loadingAt),
        dateTimeStringToIso(trip.unloadingAt),
      ]);
      return window
        ? [{ tripIndex: i, truckId: trip.truckId, driverId: trip.driverId, ...window }]
        : [];
    });
  }
  const window = scheduleWindow([
    dateTimeStringToIso(values.pickupAt),
    dateTimeStringToIso(values.stuffingAt),
    dateTimeStringToIso(values.dropoffAt),
  ]);
  return window
    ? [{ tripIndex: WHOLE_ORDER, truckId: values.truckId, driverId: values.driverId, ...window }]
    : [];
}

function blankValues(): FormValues {
  return {
    isMultiTrip: false,
    trips: [],
    entryDate: todayInVnDateString(),

    externalTruck: false,
    truckId: '',
    truckPlate: '',
    driverId: '',
    driverName: '',
    billNumber: '',
    containerNumber: '',

    containerSize: '',
    shipmentType: DEFAULT_SHIPMENT_TYPE,
    pickup: '',
    stuffing: '',
    dropoff: '',
    pickupAt: null,
    stuffingAt: null,
    dropoffAt: null,
    fees: initialFees(),
    advanceAmount: 0,
    laborCost: 0,
    vatRatePercent: DEFAULT_VAT_PERCENT,
    roundDown: false,
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
      loadingAt: null,
      unloadingAt: null,

      externalTruck: isExternalTruck(trip),
      truckId: trip.truckId,
      truckPlate: trip.truckPlate,
      driverId: trip.driverId,
      driverName: trip.driverName,
      laborCost: trip.laborCost || 0,
    })),
    entryDate: todayInVnDateString(),
    externalTruck: isExternalTruck(src),
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
    pickupAt: null,
    stuffingAt: null,
    dropoffAt: null,

    fees: toFeeRows(src),
    advanceAmount: 0,

    laborCost: src.laborCost ?? 0,
    vatRatePercent: Math.round((src.vatRate ?? 0) * 100),

    roundDown: !!src.roundDown,
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

  const savedOrders = useTransportOrderStore((s) => s.items);
  const ordersInit = useTransportOrderStore((s) => s.initialized);
  const loadOrders = useTransportOrderStore((s) => s.loadAll);

  const savedRoutes = useTransportRouteStore((s) => s.items);
  const routesInit = useTransportRouteStore((s) => s.initialized);
  const loadRoutes = useTransportRouteStore((s) => s.loadAll);

  useEffect(() => {
    if (isMobile) return;
    if (!trucksInit) loadTrucks();
    if (!customersInit) loadCustomers();

    if (!ordersInit) loadOrders();
    if (!routesInit) loadRoutes();
  }, [
    trucksInit,
    loadTrucks,
    customersInit,
    loadCustomers,
    ordersInit,
    loadOrders,
    routesInit,
    loadRoutes,
  ]);

  const truckSelectData = useMemo(
    () =>
      trucks
        .filter((a) => a.isActive && !a.extra?.isDeleted)
        .map((a) => ({
          value: a.id,

          label: truckOptionLabel(a),
          plate: a.name,
        })),
    [trucks],
  );

  const statusSelectData = useMemo(
    () => transportOrderStatuses().map((s) => ({ value: s.value, label: s.label })),

    [i18n.language],
  );

  const containerSizeOptions = useContainerSizeOptions();

  const driverWithPlate = useDriverWithPlate();

  const truckTypeOf = useTruckTypeOf();

  const placeSuggestions = usePlaceSuggestions();

  const shipmentTypeOptions = useShipmentTypeOptions();

  const feeNameOptions = useFeeNameOptions();
  const freightFeeName = useFreightFeeName();
  const shipmentTypeLabel = useShipmentTypeLabel();

  const form = useForm<FormValues>({
    initialValues: copyFrom ? copiedValues(copyFrom) : blankValues(),
    validate: {
      truckId: (v, values) =>
        !values.isMultiTrip && !values.externalTruck && !v
          ? t('transportOrders.validation.truckRequired')
          : null,
      truckPlate: (v, values) =>
        !values.isMultiTrip && values.externalTruck && !v.trim()
          ? t('transportOrders.validation.plateRequired')
          : null,
      driverId: (v, values) =>
        !values.isMultiTrip && !values.externalTruck && !v
          ? t('transportOrders.validation.driverRequired')
          : null,
      entryDate: (v, values) =>
        !values.isMultiTrip && !v ? t('transportOrders.validation.entryDateRequired') : null,
      customerCode: (v) => (!v ? t('transportOrders.validation.customerRequired') : null),
      trips: {
        truckId: (v: string, values: FormValues, path: string) =>
          values.isMultiTrip && !legAt(values, path)?.externalTruck && !v
            ? t('transportOrders.validation.truckRequired')
            : null,
        truckPlate: (v: string, values: FormValues, path: string) =>
          values.isMultiTrip && legAt(values, path)?.externalTruck && !v.trim()
            ? t('transportOrders.validation.plateRequired')
            : null,
        driverId: (v: string, values: FormValues, path: string) =>
          values.isMultiTrip && !legAt(values, path)?.externalTruck && !v
            ? t('transportOrders.validation.driverRequired')
            : null,
        // `date` lost its rule with its input: the leg no longer authors one (it
        // falls out of `loadingAt` — see `tripDate`), and a required check on a
        // field with no visible input is an unfixable save-blocker.
        //
        // `loadingAt` deliberately does NOT inherit that required rule. A leg
        // whose slot isn't booked yet is a real state the dispatcher is in, and
        // every multi-trip order written before 2026-07-21 has no times at all —
        // requiring one would lock those orders out of editing. `tripDate` keeps
        // the date honest in both cases instead.
      },
    },
  });

  const isCopyCreate = !!copyFrom;
  const seededShipmentTypeRef = useRef(false);
  useEffect(() => {
    if (isEdit || isCopyCreate || seededShipmentTypeRef.current) return;
    if (shipmentTypeOptions.length === 0) return;
    seededShipmentTypeRef.current = true;
    const current = form.getValues().shipmentType;
    if (shipmentTypeOptions.some((o) => o.value === current)) return;
    form.setFieldValue('shipmentType', shipmentTypeOptions[0]!.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mantine re-creates `form` every render; the ref makes this a one-shot on the options arriving.
  }, [isEdit, isCopyCreate, shipmentTypeOptions]);

  const seededFeeNamesRef = useRef(false);
  useEffect(() => {
    if (isEdit || isCopyCreate || seededFeeNamesRef.current) return;
    if (feeNameOptions === FALLBACK_FEE_NAMES) return;
    seededFeeNamesRef.current = true;
    if (!isSeedFees(form.getValues().fees)) return;
    form.setFieldValue('fees', [blankFee({ label: freightFeeName })]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mantine re-creates `form` every render; the ref makes this a one-shot on the options arriving.
  }, [isEdit, isCopyCreate, feeNameOptions, freightFeeName]);

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
          loadingAt: isoToDateTimeString(trip.loadingAt),
          unloadingAt: isoToDateTimeString(trip.unloadingAt),

          externalTruck: isExternalTruck(trip),
          truckId: trip.truckId,
          truckPlate: trip.truckPlate,
          driverId: trip.driverId,
          driverName: trip.driverName,
          laborCost: trip.laborCost || 0,
        })),
        entryDate: isoToVnDateString(o.entryDate),
        externalTruck: isExternalTruck(o),
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
        pickupAt: isoToDateTimeString(o.route?.pickupAt),
        stuffingAt: isoToDateTimeString(o.route?.stuffingAt),
        dropoffAt: isoToDateTimeString(o.route?.dropoffAt),

        fees: toFeeRows(o),
        advanceAmount: o.advanceAmount ?? 0,
        laborCost: o.laborCost ?? 0,
        vatRatePercent: Math.round((o.vatRate ?? 0) * 100),
        roundDown: !!o.roundDown,
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

        date: vnDateStringToIso(tripDate(trip)),

        ...(trip.loadingAt ? { loadingAt: dateTimeStringToIso(trip.loadingAt) } : {}),
        ...(trip.unloadingAt ? { unloadingAt: dateTimeStringToIso(trip.unloadingAt) } : {}),
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

        ...(values.pickupAt ? { pickupAt: dateTimeStringToIso(values.pickupAt) } : {}),
        ...(values.stuffingAt ? { stuffingAt: dateTimeStringToIso(values.stuffingAt) } : {}),
        ...(values.dropoffAt ? { dropoffAt: dateTimeStringToIso(values.dropoffAt) } : {}),
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
          laborCost: values.laborCost || 0,
          vatRate,
          roundDown: values.roundDown,
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

  const scheduleConflicts = useMemo(
    () =>
      findScheduleConflicts(draftScheduleSlots(form.values), savedOrders, {
        ...(id ? { excludeOrderId: id } : {}),
      }),
    [form.values, savedOrders, id],
  );

  const draftTruckType = useMemo(() => {
    const truckId = form.values.isMultiTrip
      ? (form.values.trips[0]?.truckId ?? '')
      : form.values.truckId;
    return truckTypeOf(truckId) ?? '';
  }, [form.values.isMultiTrip, form.values.trips, form.values.truckId, truckTypeOf]);

  const routeMatches = useMemo(() => {
    const draft: TransportRouteDraft = {
      isMultiTrip: form.values.isMultiTrip,
      truckType: draftTruckType,
      containerSize: form.values.containerSize,
      pickup: form.values.pickup,
      dropoff: form.values.dropoff,
      legs: form.values.trips.map((trip) => ({
        departure: trip.departure,
        destination: trip.destination,
      })),
    };
    return matchTransportRoutes(draft, savedRoutes);
  }, [
    form.values.isMultiTrip,
    form.values.containerSize,
    form.values.pickup,
    form.values.dropoff,
    form.values.trips,
    draftTruckType,
    savedRoutes,
  ]);

  const [appliedRoute, setAppliedRoute] = useState<TransportRouteRow | undefined>();
  const appliedRouteCode = appliedRoute?.code;

  const showContainerSize = truckTypeCarriesContainer(draftTruckType, NON_CONTAINER_TRUCK_TYPES);

  useEffect(() => {
    if (showContainerSize) return;
    if (!form.getValues().containerSize) return;
    form.setFieldValue('containerSize', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mantine mints a new `form` object every render; values are read through `getValues()`.
  }, [showContainerSize]);

  const routeTruckIssues = useMemo(() => {
    const wanted = appliedRoute?.truckType;
    if (!wanted) return [];

    const check = (leg: number, truckId: string, external: boolean): RouteTruckIssue[] => {
      if (external) return [];
      if (!truckId) return [{ leg, kind: 'missing' }];
      const type = truckTypeOf(truckId) ?? '';
      return type && type !== wanted ? [{ leg, kind: 'mismatch' }] : [];
    };

    if (form.values.isMultiTrip) {
      return form.values.trips.flatMap((trip, i) =>
        check(i + 1, trip.truckId, !!trip.externalTruck),
      );
    }
    return check(WHOLE_ORDER, form.values.truckId, !!form.values.externalTruck);
  }, [
    appliedRoute,
    truckTypeOf,
    form.values.isMultiTrip,
    form.values.trips,
    form.values.truckId,
    form.values.externalTruck,
  ]);

  const applyRoute = useCallback(
    (route: TransportRouteRow) => {
      const fees = [...form.getValues().fees];
      const idx = fees.findIndex(
        (f) => f.kind !== 'passthrough' && f.label.trim() === freightFeeName,
      );
      if (idx >= 0) fees[idx] = { ...fees[idx]!, amount: route.freightAmount };
      // The operator removed the seeded line, or the order predates the client's
      // current freight name — append rather than drop the number on the floor.
      else fees.push(blankFee({ label: freightFeeName, amount: route.freightAmount }));
      form.setFieldValue('fees', fees);

      if (route.isMultiTrip) {
        (route.trips ?? []).forEach((leg, i) => {
          form.setFieldValue(`trips.${i}.laborCost`, leg.laborCost || 0);
        });
      } else {
        form.setFieldValue('laborCost', route.laborCost ?? 0);
      }

      setAppliedRoute(route);
      notifications.show({
        color: 'green',
        message: t('transportRoutes.suggestion.applied', { code: route.code }),
      });
    },

    [t, freightFeeName],
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

  const setExternalTruck = (checked: boolean) => {
    form.setFieldValue('externalTruck', checked);
    form.setFieldValue('truckId', '');
    form.setFieldValue('truckPlate', '');
    form.setFieldValue('driverId', '');
    form.setFieldValue('driverName', '');
  };

  const setTripExternalTruck = (i: number, checked: boolean) => {
    form.setFieldValue(`trips.${i}.externalTruck`, checked);
    form.setFieldValue(`trips.${i}.truckId`, '');
    form.setFieldValue(`trips.${i}.truckPlate`, '');
    form.setFieldValue(`trips.${i}.driverId`, '');
    form.setFieldValue(`trips.${i}.driverName`, '');
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

  const currentShipmentType = form.values.shipmentType;
  const shipmentTypeData =
    currentShipmentType && !shipmentTypeOptions.some((o) => o.value === currentShipmentType)
      ? [
          ...shipmentTypeOptions,
          { value: currentShipmentType, label: shipmentTypeLabel(currentShipmentType) },
        ]
      : shipmentTypeOptions;

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
    form.values.roundDown,
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

      <Form form={form} onSubmit={handleSubmit}>
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
                  {/* The vehicle cell carries its own mode switch, because the
                      choice is per JOB, not per client: the same dispatcher books
                      a fleet truck and hires one on the next call. The checkbox
                      sits under the input it reshapes — a header switch would be
                      too far from the field, and could not repeat per leg below. */}
                  <Stack gap={4}>
                    {form.values.externalTruck ? (
                      <TextInput
                        withAsterisk
                        label={t('transportOrders.form.externalPlate')}
                        {...form.getInputProps('truckPlate')}
                      />
                    ) : (
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
                    )}
                    <Checkbox
                      size="xs"
                      label={t('transportOrders.form.externalTruck')}
                      description={t('transportOrders.form.externalTruckHint')}
                      checked={form.values.externalTruck}
                      onChange={(e) => setExternalTruck(e.currentTarget.checked)}
                    />
                  </Stack>
                  {form.values.externalTruck ? (
                    <TextInput
                      label={t('transportOrders.form.externalDriver')}
                      {...form.getInputProps('driverName')}
                    />
                  ) : (
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
                      optionLabel={driverWithPlate}
                    />
                  )}
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
              {/* Hidden for a Xe Tải job — that vehicle hauls no container, so
                  the field has nothing to say. `showContainerSize` also drives
                  the effect that clears a value stranded by a late truck pick. */}
              {showContainerSize && (
                <Select
                  label={t('transportOrders.form.containerSize')}
                  data={containerSizeData}
                  value={form.values.containerSize || null}

                  onChange={(v) =>
                    form.setFieldValue('containerSize', (v as TransportOrderContainerSize) ?? '')
                  }
                  searchable
                  clearable
                />
              )}
              <Select
                label={t('transportOrders.form.shipmentType')}
                data={shipmentTypeData}
                value={form.values.shipmentType || null}
                onChange={(v) =>
                  form.setFieldValue(
                    'shipmentType',
                    (v as TransportOrderShipmentType) ?? DEFAULT_SHIPMENT_TYPE,
                  )
                }
                searchable
                allowDeselect={false}
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
                    {/* The two place columns are the ONLY ones without a fixed
                        width — they take everything the others don't, because
                        they're the only free-text fields here and the only ones an
                        operator has to re-read to check. Every `w` below is
                        therefore a *budget*: trimmed to what its widget actually
                        needs (a datetime + its clear button, a picker, a money
                        figure), so the leftover lands on the places. Don't grow one
                        back without taking the width from somewhere other than
                        them. */}
                    {/* Each end of the leg is ONE column: the place, and under
                        it the time the warehouse expects the truck there. Two
                        stacked headers rather than four side-by-side ones — see
                        the width note in `modules/transport-orders.md`. There is
                        still no NGÀY column: a loading datetime already carries
                        the day, so the leg's date derives from it (`tripDate`). */}
                    <Table.Th>
                      <Stack gap={0}>
                        <Text inherit>{t('transportOrders.trips.departure')}</Text>
                        <Text fz="xs" c="dimmed" fw={400} tt="none">
                          {t('transportOrders.trips.loadingAt')}
                        </Text>
                      </Stack>
                    </Table.Th>
                    <Table.Th>
                      <Stack gap={0}>
                        <Text inherit>{t('transportOrders.trips.destination')}</Text>
                        <Text fz="xs" c="dimmed" fw={400} tt="none">
                          {t('transportOrders.trips.unloadingAt')}
                        </Text>
                      </Stack>
                    </Table.Th>
                    <Table.Th w={175}>{t('transportOrders.columns.truck')}</Table.Th>
                    <Table.Th w={175}>{t('transportOrders.form.driver')}</Table.Th>
                    <Table.Th w={120}>{t('transportOrders.trips.laborCost')}</Table.Th>
                    <Table.Th w={40} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {form.values.trips.map((_, i) => (
                    <Table.Tr key={i}>
                      {/* Wrapping inputs, not single-line ones: a real place is
                          "Kho Bình Tân, Q. Bình Tân, TP.HCM", and widening the
                          column alone only moves where it gets cut off. Growing
                          the row is the one treatment that always shows the whole
                          value — which is the point, since the operator's job here
                          is telling four similar-looking addresses apart. Capped at
                          4 rows so one pasted paragraph can't swallow the form. */}
                      <Table.Td>
                        <Stack gap={4}>
                          <Autocomplete
                            data={placeSuggestions}
                            limit={PLACE_SUGGESTION_LIMIT}
                            styles={PLACE_INPUT_STYLES}

                            title={form.values.trips[i]!.departure || undefined}
                            {...form.getInputProps(`trips.${i}.departure`)}
                          />
                          <DateTimeTextField {...form.getInputProps(`trips.${i}.loadingAt`)} />
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Autocomplete
                            data={placeSuggestions}
                            limit={PLACE_SUGGESTION_LIMIT}
                            styles={PLACE_INPUT_STYLES}
                            title={form.values.trips[i]!.destination || undefined}
                            {...form.getInputProps(`trips.${i}.destination`)}
                          />
                          <DateTimeTextField {...form.getInputProps(`trips.${i}.unloadingAt`)} />
                        </Stack>
                      </Table.Td>
                      {/* Per LEG, not per order: a reefer job routinely runs one
                          fleet leg to the port and a hired one back. */}
                      <Table.Td>
                        <Stack gap={4}>
                          {form.values.trips[i]!.externalTruck ? (
                            <TextInput
                              placeholder={t('transportOrders.form.externalPlate')}
                              {...form.getInputProps(`trips.${i}.truckPlate`)}
                            />
                          ) : (
                            <Select
                              data={truckSelectData}
                              value={form.values.trips[i]!.truckId || null}
                              onChange={(v) => setTripTruck(i, v)}
                              error={form.errors[`trips.${i}.truckId`]}
                              searchable
                              clearable
                              nothingFoundMessage={t('transportOrders.form.noTrucks')}
                            />
                          )}
                          <Checkbox
                            size="xs"
                            label={t('transportOrders.form.externalTruck')}
                            checked={form.values.trips[i]!.externalTruck}
                            onChange={(e) => setTripExternalTruck(i, e.currentTarget.checked)}
                          />
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {form.values.trips[i]!.externalTruck ? (
                          <TextInput
                            placeholder={t('transportOrders.form.externalDriver')}
                            {...form.getInputProps(`trips.${i}.driverName`)}
                          />
                        ) : (
                          <EmployeeSelector
                            value={form.values.trips[i]!.driverId || null}
                            onChange={(sel) => setTripDriver(i, sel)}
                            error={form.errors[`trips.${i}.driverId`]}
                            filter={driverEmployeeFilter}
                            optionLabel={driverWithPlate}
                          />
                        )}
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
              {/* Each stop is a place + the time the warehouse expects the truck
                  there, stacked in one column so the pair reads as one stop
                  rather than as two unrelated rows of inputs. */}
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <Stack gap="xs">
                  <Autocomplete
                    label={t('transportOrders.route.pickup')}
                    data={placeSuggestions}
                    limit={PLACE_SUGGESTION_LIMIT}
                    styles={PLACE_INPUT_STYLES}
                    {...form.getInputProps('pickup')}
                  />
                  <DateTimeTextField
                    label={t('transportOrders.route.pickupAt')}
                    {...form.getInputProps('pickupAt')}
                  />
                </Stack>
                <Stack gap="xs">
                  <Autocomplete
                    label={t('transportOrders.route.stuffing')}
                    data={placeSuggestions}
                    limit={PLACE_SUGGESTION_LIMIT}
                    styles={PLACE_INPUT_STYLES}
                    {...form.getInputProps('stuffing')}
                  />
                  <DateTimeTextField
                    label={t('transportOrders.route.stuffingAt')}
                    {...form.getInputProps('stuffingAt')}
                  />
                </Stack>
                <Stack gap="xs">
                  <Autocomplete
                    label={t('transportOrders.route.dropoff')}
                    data={placeSuggestions}
                    limit={PLACE_SUGGESTION_LIMIT}
                    styles={PLACE_INPUT_STYLES}
                    {...form.getInputProps('dropoff')}
                  />
                  <DateTimeTextField
                    label={t('transportOrders.route.dropoffAt')}
                    {...form.getInputProps('dropoffAt')}
                  />
                </Stack>
              </SimpleGrid>

              {/* LƯƠNG CHUYẾN for a single-trip job — the flat counterpart of
                  the leg table's per-leg column, and placed the same way: at
                  the foot of the card that describes the run, not in the fee
                  cards. It is a cost we pay the driver, deliberately outside
                  the customer's totals (see `TransportOrderTotals`). */}
              <Divider my="sm" />
              <Group justify="flex-end">
                <NumberInput
                  label={t('transportOrders.trips.laborCost')}
                  thousandSeparator=","
                  min={0}
                  w={200}
                  {...form.getInputProps('laborCost')}
                />
              </Group>
            </SectionCard>
          )}

          {/* Sits directly under whichever card owns the assignment — the leg list
              on a multi-trip job, the route on a single-trip one — so the warning
              is beside the pickers that caused it rather than at the top of a long
              form the operator has already scrolled past. */}
          <ScheduleConflictAlert conflicts={scheduleConflicts} />

          {/* Under the card that owns the places, beside the conflict warning —
              both are advisories about what the operator just typed. */}
          {routeTruckIssues.length > 0 && appliedRoute && (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
              <Stack gap={4}>
                {routeTruckIssues.map((issue) => (
                  <Text key={`${issue.leg}-${issue.kind}`} size="sm">
                    {t(
                      issue.leg === WHOLE_ORDER
                        ? `transportRoutes.suggestion.${issue.kind === 'missing' ? 'truckMissing' : 'truckMismatch'}`
                        : `transportRoutes.suggestion.${issue.kind === 'missing' ? 'truckMissingLeg' : 'truckMismatchLeg'}`,
                      { code: appliedRoute.code, leg: issue.leg },
                    )}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          <TransportRouteSuggestion
            matches={routeMatches}
            onApply={applyRoute}
            appliedCode={appliedRouteCode}
          />

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
                      {/* Picked from the `fee-name` register, not typed: the
                          statement's PHÍ DỊCH VỤ columns ARE these strings, so a
                          spelling variant splits a customer's column in two.
                          `feeNameSelectData` keeps a stored name selectable even
                          once it leaves the register — see `feeName.ts`. */}
                      <Select
                        data={feeNameSelectData(feeNameOptions, form.values.fees[i]!.label)}
                        value={form.values.fees[i]!.label || null}
                        onChange={(v) => form.setFieldValue(`fees.${i}.label`, v ?? '')}
                        searchable
                        error={form.getInputProps(`fees.${i}.label`).error}
                      />
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
                      {/* Same register as the service card — one vocabulary for
                          both kinds (see `useFeeNameOptions`). */}
                      <Select
                        data={feeNameSelectData(feeNameOptions, form.values.fees[i]!.label)}
                        value={form.values.fees[i]!.label || null}
                        onChange={(v) => form.setFieldValue(`fees.${i}.label`, v ?? '')}
                        searchable
                        error={form.getInputProps(`fees.${i}.label`).error}
                      />
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

            {/* Sits under the VAT rate it modifies, not with the totals it moves:
                it's an input the operator sets, and the effect is visible one row
                down in the VAT line the moment it's ticked. */}
            <Checkbox
              mt="sm"
              label={t('transportOrders.billing.roundDown')}
              description={t('transportOrders.billing.roundDownDescription')}
              {...form.getInputProps('roundDown', { type: 'checkbox' })}
            />

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
      </Form>
    </Stack>
  );
}
