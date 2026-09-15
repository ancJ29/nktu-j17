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
  IconCopy,
  IconMapPin,
  IconNote,
  IconPlus,
  IconRoute,
  IconTrash,
  IconTruck,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { device } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { DateTimeTextField } from '@/components/DateTimeTextField';
import { SectionCard } from '@/components/SectionCard';
import { EmployeeSelector, CustomerSelector } from '@/components/selectors';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { transportOrderBundle, useTransportOrderStore } from '@/stores/useTransportOrderStore';
import { useInitFormFromFetch } from '@/hooks';
import { resolveCustomerReportType } from '@/utils/permission';
import { MOOC_FIELD_REPORT_TYPES } from '@/utils/customerReports/types';
import {
  dateTimeStringToIso,
  isoToDateTimeString,
  isoToVnDateString,
  todayInVnDateString,
  vnDateStringToIso,
} from '@/utils/dateTimeField';
import type {
  Employee,
  TransportOrder,
  TransportOrderTruckingSize,
  TransportOrderExtra,
  TransportOrderShipmentType,
  TransportOrderTrip,
} from '@/types';
import { computeTripLaborTotal, formatMoney } from './transportOrderPricing';
import { useTruckingSizeOptions } from './useTruckingSize';
import { useFreightFeeName } from './feeName';
import {
  DEFAULT_SHIPMENT_TYPE,
  useShipmentTypeLabel,
  useShipmentTypeOptions,
} from './shipmentType';
import {
  driverEmployeeFilter,
  truckOptionLabel,
  useDriverWithPlate,
  useTruckTypeOf,
} from './truckDisplay';
import { ORDER_TRUCK_TYPES, useOrderTruckTypeOptions } from './useOrderTruckTypes';
import { isExternalTruck } from './externalTruck';
import {
  getInitialTransportOrderStatus,
  isTransportOrderLocked,
  transportOrderStatuses,
} from './transportOrderStatuses';
import { buildTransportOrderWrite } from './transportOrderWrite';
import { PLACE_INPUT_STYLES, PLACE_SUGGESTION_LIMIT } from './placeSuggestions';
import { usePlaceSuggestions } from './usePlaceSuggestions';
import { ScheduleConflictAlert } from './ScheduleConflictAlert';
import { useTransportRouteStore } from '@/stores/useTransportRouteStore';
import { TransportRouteSuggestion } from '../transport-routes/TransportRouteSuggestion';
import { TransportRoutePicker } from '../transport-routes/TransportRoutePicker';
import {
  matchTransportRoutes,
  type TransportRouteDraft,
} from '../transport-routes/transportRouteMatch';
import type { TransportRouteRow } from '@/types';
import { findScheduleConflicts, scheduleWindow, WHOLE_ORDER } from './scheduleConflicts';
import type { ScheduleSlot } from './scheduleConflicts';
import { Form } from '@/components/Form';
import { readTruckingSize } from './truckingSize';
import {
  blankFee,
  DEFAULT_VAT_PERCENT,
  feeRowsToFees,
  initialFees,
  toFeeRows,
  type FeeRow,
} from './feeRows';
import { TransportFeeCards } from './TransportFeeCards';
import { useReseedFeeNames } from './useReseedFeeNames';
import { notifyTransportOrderSaveError, saveTransportOrder } from './saveTransportOrder';
import { isMultiDropType } from './multiDrop';
import { MULTI_DROP_TRUCK_TYPES } from './useMultiDrop';

const isMobile = device.isMobile;

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

function typeSourceTruckId(v: {
  isMultiTrip?: boolean;
  trips?: readonly { truckId: string }[];
  truckId: string;
}): string {
  return v.isMultiTrip ? (v.trips?.[0]?.truckId ?? '') : v.truckId;
}

type FormValues = {
  isMultiTrip: boolean;
  trips: TripRow[];
  entryDate: string | null;

  externalTruck: boolean;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;

  truckType: string;

  customerOrderNumber: string;

  requestedPickupDate: string | null;
  dropoffDate: string | null;

  moocStorageDays: number | string;
  billNumber: string;
  declarationNumber: string;
  containerNumber: string;
  truckingSize: TransportOrderTruckingSize;
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

function blankValues(presetTruckType = ''): FormValues {
  return {
    isMultiTrip: false,
    trips: [],
    entryDate: todayInVnDateString(),

    externalTruck: false,
    truckId: '',
    truckPlate: '',
    driverId: '',
    driverName: '',

    truckType: presetTruckType,
    customerOrderNumber: '',
    requestedPickupDate: null,
    dropoffDate: null,
    moocStorageDays: '',
    billNumber: '',
    declarationNumber: '',
    containerNumber: '',

    truckingSize: '',
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

function showsType5Fields(values: FormValues): boolean {
  return (
    MOOC_FIELD_REPORT_TYPES.has(resolveCustomerReportType(values.customerCode)) ||
    !!values.requestedPickupDate ||
    !!values.dropoffDate ||
    values.moocStorageDays !== ''
  );
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

    truckType: src.extra?.truckType ?? '',

    customerOrderNumber: src.extra?.customerOrderNumber ?? '',

    requestedPickupDate: null,
    dropoffDate: null,
    moocStorageDays: '',
    billNumber: src.billNumber || '',
    declarationNumber: src.declarationNumber || '',
    containerNumber: src.containerNumber || '',
    truckingSize: readTruckingSize(src),
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

function readPresetTruckType(search: string): string {
  const value = new URLSearchParams(search).get('truckType')?.trim() ?? '';
  if (!value) return '';
  return ORDER_TRUCK_TYPES.includes(value) ? value : '';
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
  const presetTruckType = isEdit ? '' : readPresetTruckType(location.search);

  const belongsToMultiDrop =
    !isEdit &&
    (isMultiDropType(presetTruckType, MULTI_DROP_TRUCK_TYPES) ||
      isMultiDropType(copyFrom?.extra?.truckType, MULTI_DROP_TRUCK_TYPES));

  useEffect(() => {
    if (belongsToMultiDrop && !isMobile) {
      navigate(`${ROUTES.TRANSPORT_ORDERS.NEW_MULTI_DROP}${location.search}`, {
        replace: true,
        state: location.state,
      });
      return;
    }
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

  const truckingSizeOptions = useTruckingSizeOptions();

  const driverWithPlate = useDriverWithPlate();

  const truckTypeOf = useTruckTypeOf();

  const truckTypeOptions = useOrderTruckTypeOptions().filter(
    (o) => !isMultiDropType(o.value, MULTI_DROP_TRUCK_TYPES),
  );

  const placeSuggestions = usePlaceSuggestions();

  const shipmentTypeOptions = useShipmentTypeOptions();

  const freightFeeName = useFreightFeeName();
  const shipmentTypeLabel = useShipmentTypeLabel();

  const form = useForm<FormValues>({
    initialValues: copyFrom ? copiedValues(copyFrom) : blankValues(presetTruckType),
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

      truckingSize: (v, values) => {
        if (v) return null;

        if (!values.truckType) return null;
        return t('transportOrders.validation.truckingSizeRequired');
      },
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

  useReseedFeeNames(form, isEdit || isCopyCreate);

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

      if (isMultiDropType(o.extra?.truckType, MULTI_DROP_TRUCK_TYPES)) {
        navigate(ROUTES.TRANSPORT_ORDERS.EDIT_MULTI_DROP.replace(':id', o.id), { replace: true });
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
        truckType: o.extra?.truckType ?? '',
        customerOrderNumber: o.extra?.customerOrderNumber ?? '',
        requestedPickupDate: o.extra?.type5Specific?.requestedPickupDate
          ? isoToVnDateString(o.extra.type5Specific.requestedPickupDate)
          : null,
        dropoffDate: o.extra?.type5Specific?.dropoffDate
          ? isoToVnDateString(o.extra.type5Specific.dropoffDate)
          : null,
        moocStorageDays: o.extra?.type5Specific?.moocStorageDays ?? '',
        billNumber: o.billNumber || '',
        declarationNumber: o.declarationNumber || '',
        containerNumber: o.containerNumber || '',
        truckingSize: readTruckingSize(o),
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
      const fees = feeRowsToFees(values.fees);
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
          truckType: values.truckType.trim(),
          customerOrderNumber: values.customerOrderNumber.trim(),
          type5Specific: {
            requestedPickupDate: values.requestedPickupDate
              ? vnDateStringToIso(values.requestedPickupDate)
              : '',
            dropoffDate: values.dropoffDate ? vnDateStringToIso(values.dropoffDate) : '',
            moocStorageDays:
              typeof values.moocStorageDays === 'number' ? values.moocStorageDays : null,
          },
          billNumber: values.billNumber.trim(),
          declarationNumber: values.declarationNumber.trim(),
          containerNumber: values.containerNumber.trim(),
          truckingSize: values.truckingSize,
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
        const saved = await saveTransportOrder({
          id: isEdit ? id : undefined,
          snapshot: snapshotRef.current,
          status: values.status,
          write,
          invalidate: invalidateCache,
        });
        notifications.show({
          color: 'green',
          message: isEdit
            ? t('transportOrders.notifications.updated')
            : t('transportOrders.notifications.created'),
        });
        navigate(ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', saved.id));
      } catch (err) {
        notifyTransportOrderSaveError(
          err,
          {
            conflictTitle: t('common.conflict.title'),
            conflictMessage: t('common.conflict.message'),
            failed: isEdit
              ? t('transportOrders.notifications.updateError')
              : t('transportOrders.notifications.createError'),
          },
          (latest) => {
            snapshotRef.current = latest;
          },
        );
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

  const draftTruckType = form.values.truckType;

  const typeTruckId = typeSourceTruckId(form.values);

  const autoTypedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (!typeTruckId || autoTypedFrom.current === typeTruckId) return;

    if (autoTypedFrom.current === null && form.getValues().truckType) {
      autoTypedFrom.current = typeTruckId;
      return;
    }

    const registered = truckTypeOf(typeTruckId);

    if (!registered || isMultiDropType(registered, MULTI_DROP_TRUCK_TYPES)) return;
    autoTypedFrom.current = typeTruckId;
    form.setFieldValue('truckType', registered);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mantine mints a new `form` object every render; values are read through `getValues()` and the derived id above.
  }, [typeTruckId, truckTypeOf]);

  const routeMatches = useMemo(() => {
    const draft: TransportRouteDraft = {
      isMultiTrip: form.values.isMultiTrip,
      truckType: draftTruckType,
      truckingSize: form.values.truckingSize,
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
    form.values.truckingSize,
    form.values.pickup,
    form.values.dropoff,
    form.values.trips,
    draftTruckType,
    savedRoutes,
  ]);

  const [appliedRoute, setAppliedRoute] = useState<TransportRouteRow | undefined>();
  const appliedRouteCode = appliedRoute?.code;

  const routeTruckIssues = useMemo(() => {
    const wanted = appliedRoute?.truckType;
    if (!wanted) return [];

    const mismatch: RouteTruckIssue[] =
      draftTruckType && draftTruckType !== wanted ? [{ leg: WHOLE_ORDER, kind: 'mismatch' }] : [];

    const missing = (leg: number, truckId: string, external: boolean): RouteTruckIssue[] =>
      !external && !truckId ? [{ leg, kind: 'missing' }] : [];

    return [
      ...(form.values.isMultiTrip
        ? form.values.trips.flatMap((trip, i) => missing(i + 1, trip.truckId, !!trip.externalTruck))
        : missing(WHOLE_ORDER, form.values.truckId, !!form.values.externalTruck)),
      ...mismatch,
    ];
  }, [
    appliedRoute,
    draftTruckType,
    form.values.isMultiTrip,
    form.values.trips,
    form.values.truckId,
    form.values.externalTruck,
  ]);

  const applyRoute = useCallback(
    (route: TransportRouteRow, opts?: { fillJourney?: boolean }) => {
      if (opts?.fillJourney) {
        form.setFieldValue('isMultiTrip', !!route.isMultiTrip);
        if (route.isMultiTrip) {
          const current = form.getValues().trips;
          form.setFieldValue(
            'trips',
            (route.trips ?? []).map((leg, i) => ({
              ...(current[i] ?? blankTrip()),
              departure: leg.departure,
              destination: leg.destination,
              laborCost: leg.laborCost || 0,
            })),
          );
        } else {
          form.setFieldValue('pickup', route.route?.pickup ?? '');

          form.setFieldValue('stuffing', route.route?.stuffing ?? '');
          form.setFieldValue('dropoff', route.route?.dropoff ?? '');
        }

        const routeSize = readTruckingSize(route);
        if (routeSize) form.setFieldValue('truckingSize', routeSize);
      }

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

  if (fetching || belongsToMultiDrop) return null;
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

  const currentSize = form.values.truckingSize;
  const truckingSizeData =
    currentSize && !truckingSizeOptions.some((o) => o.value === currentSize)
      ? [...truckingSizeOptions, { value: currentSize, label: `${currentSize}ft` }]
      : truckingSizeOptions;

  const currentShipmentType = form.values.shipmentType;
  const shipmentTypeData =
    currentShipmentType && !shipmentTypeOptions.some((o) => o.value === currentShipmentType)
      ? [
          ...shipmentTypeOptions,
          { value: currentShipmentType, label: shipmentTypeLabel(currentShipmentType) },
        ]
      : shipmentTypeOptions;

  const currentTruckType = form.values.truckType;
  const truckTypeSelectData =
    currentTruckType && !truckTypeOptions.some((o) => o.value === currentTruckType)
      ? [...truckTypeOptions, { value: currentTruckType, label: currentTruckType }]
      : truckTypeOptions;

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <Button
          onClick={() => window.history.back()}
          variant="subtle"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('common.actions.back')}
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
            {/* First control on the form, because picking a route reshapes both
                cards below it — the multi-trip switch beside this header flips,
                and the Route card gives way to the leg list or back.

                Create only: filling the journey overwrites the places and the
                legs, which is what a blank form wants and the last thing a
                booked order does. An existing order still gets the suggestion
                strip, which touches no place at all. */}
            {!isEdit && (
              <TransportRoutePicker
                routes={savedRoutes}
                appliedId={appliedRoute?.id}
                onPick={(route) => applyRoute(route, { fillJourney: true })}
              />
            )}

            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing="sm"
              mt={isEdit ? undefined : 'sm'}
            >
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

              {/* LOẠI XE — order-level, so it shows on a multi-trip job too
                  (the legs own their trucks, the order owns what it was sold
                  as). Omitted entirely when the client has registered no
                  vehicle types: that category ships no fallback, so the
                  alternative is a dead empty picker — the same call the list's
                  LOẠI XE filter makes. */}
              {truckTypeOptions.length > 0 && (
                <Select
                  label={t('transportOrders.form.truckType')}
                  data={truckTypeSelectData}
                  value={form.values.truckType || null}
                  onChange={(v) => form.setFieldValue('truckType', v ?? '')}
                  searchable
                  clearable
                />
              )}

              <TextInput
                label={t('transportOrders.columns.customerOrder')}
                {...form.getInputProps('customerOrderNumber')}
              />

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

              {showsType5Fields(form.values) && (
                <>
                  <DateField
                    label={t('transportOrders.form.requestedPickupDate')}
                    {...form.getInputProps('requestedPickupDate')}
                  />
                  <DateField
                    label={t('transportOrders.form.dropoffDate')}
                    {...form.getInputProps('dropoffDate')}
                  />
                  <NumberInput
                    label={t('transportOrders.form.moocStorageDays')}
                    min={0}
                    allowDecimal={false}
                    {...form.getInputProps('moocStorageDays')}
                  />
                </>
              )}
            </SimpleGrid>
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing="sm"
              mt={isEdit ? undefined : 'sm'}
            >
              <TextInput
                label={t('transportOrders.columns.container')}
                {...form.getInputProps('containerNumber')}
              />
              <TextInput
                label={t('transportOrders.columns.bill')}
                {...form.getInputProps('billNumber')}
              />
              <TextInput
                label={t('transportOrders.columns.declaration')}
                {...form.getInputProps('declarationNumber')}
              />
              <Select
                label={t('transportOrders.form.truckingSize')}
                data={truckingSizeData}
                value={form.values.truckingSize || null}

                onChange={(v) =>
                  form.setFieldValue('truckingSize', (v as TransportOrderTruckingSize) ?? '')
                }
                searchable
                clearable
              />
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

          <TransportFeeCards form={form} />

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
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {t('common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Stack>
  );
}
