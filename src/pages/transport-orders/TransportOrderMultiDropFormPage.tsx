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
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCopy,
  IconMapPin,
  IconNote,
  IconPlus,
  IconTrash,
  IconTruck,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { DateField } from '@/components/DateField';
import { DateTimeTextField } from '@/components/DateTimeTextField';
import { Form } from '@/components/Form';
import { SectionCard } from '@/components/SectionCard';
import { CustomerSelector, EmployeeSelector } from '@/components/selectors';
import { useInitFormFromFetch } from '@/hooks';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { transportOrderBundle } from '@/stores/useTransportOrderStore';
import {
  dateTimeStringToIso,
  isoToDateTimeString,
  isoToVnDateString,
  todayInVnDateString,
  vnDateStringToIso,
} from '@/utils/dateTimeField';
import type {
  TransportOrder,
  TransportOrderDropStop,
  TransportOrderExtra,
  TransportOrderMultiDrop,
} from '@/types';
import { useTruckTypeLabel } from '../transport-routes/truckType';
import { isExternalTruck } from './externalTruck';
import {
  DEFAULT_VAT_PERCENT,
  feeRowsToFees,
  initialFees,
  toFeeRows,
  type FeeFormValues,
} from './feeRows';
import {
  findStop,
  isMultiDropType,
  multiDropPickup,
  MULTI_DROP_DAY_OPTIONS,
  MULTI_DROP_DEFAULT_DAYS,
  MULTI_DROP_MAX_STOPS,
  provinceOptions,
  routeFromMultiDrop,
  stopKey,
  wardOptions,
} from './multiDrop';
import { useTransportGoodsSuggestions } from './transportGoods';
import { useTruckLocationOptions, useTruckLocationLabel } from './truckLocations';
import { notifyTransportOrderSaveError, saveTransportOrder } from './saveTransportOrder';
import { TransportFeeCards } from './TransportFeeCards';
import {
  getInitialTransportOrderStatus,
  isTransportOrderLocked,
  transportOrderStatuses,
} from './transportOrderStatuses';
import { buildTransportOrderWrite } from './transportOrderWrite';
import {
  driverEmployeeFilter,
  truckOptionLabel,
  useDriverWithPlate,
  useTruckTypeOf,
} from './truckDisplay';
import { MULTI_DROP_TRUCK_TYPES, useLocations } from './useMultiDrop';
import { useReseedFeeNames } from './useReseedFeeNames';

const isMobile = device.isMobile;

type StopRow = Omit<TransportOrderDropStop, 'at'> & { key: string; at: string | null };

type FormValues = FeeFormValues & {
  entryDate: string | null;

  externalTruck: boolean;
  truckId: string;
  truckPlate: string;
  driverId: string;
  driverName: string;

  pickupLocation: string;

  pickupAt: string | null;
  stops: StopRow[];

  totalDays: string;

  goods: string;
  laborCost: number;
  transportContractNo: string;
  customerCode: string;
  customerName: string;
  status: string;
  notes: string;
};

function blankStop(): StopRow {
  return { key: '', province: '', ward: '', distanceKm: 0, at: null };
}

function toStopRows(
  stops: readonly TransportOrderDropStop[] | undefined,
  keepTimes: boolean,
): StopRow[] {
  const rows = (stops ?? []).map((s) => ({
    ...s,
    key: stopKey(s),
    at: keepTimes ? isoToDateTimeString(s.at) : null,
  }));
  return rows.length > 0 ? rows : [blankStop()];
}

function blankValues(): FormValues {
  return {
    entryDate: todayInVnDateString(),
    externalTruck: false,
    truckId: '',
    truckPlate: '',
    driverId: '',
    driverName: '',
    pickupLocation: '',
    pickupAt: null,
    stops: [blankStop()],
    totalDays: String(MULTI_DROP_DEFAULT_DAYS),
    goods: '',
    fees: initialFees(),
    vatRatePercent: DEFAULT_VAT_PERCENT,
    advanceAmount: 0,
    roundDown: false,
    laborCost: 0,
    transportContractNo: '',
    customerCode: '',
    customerName: '',
    status: getInitialTransportOrderStatus(),
    notes: '',
  };
}

function valuesFromOrder(o: TransportOrder, copy: boolean): FormValues {
  const md = o.extra?.multiDrop;
  return {
    entryDate: copy ? todayInVnDateString() : isoToVnDateString(o.entryDate),
    externalTruck: isExternalTruck(o),
    truckId: o.truckId,
    truckPlate: o.truckPlate,
    driverId: o.driverId,
    driverName: o.driverName,
    pickupLocation: md ? multiDropPickup(md) : '',
    pickupAt: copy ? null : isoToDateTimeString(md?.pickupAt),
    stops: toStopRows(md?.stops, !copy),
    totalDays: String(md?.totalDays ?? MULTI_DROP_DEFAULT_DAYS),
    goods: md?.goods ?? '',
    fees: toFeeRows(o),
    vatRatePercent: Math.round((o.vatRate ?? 0) * 100),
    advanceAmount: copy ? 0 : (o.advanceAmount ?? 0),
    roundDown: !!o.roundDown,
    laborCost: o.laborCost ?? 0,
    transportContractNo: o.transportContractNo || '',
    customerCode: o.customerCode || '',
    customerName: o.customerName || '',
    status: copy ? getInitialTransportOrderStatus() : o.status,
    notes: o.notes || '',
  };
}

function extractCopyFrom(state: unknown): TransportOrder | null {
  if (state === null || typeof state !== 'object') return null;
  const copyFrom = (state as { copyFrom?: unknown }).copyFrom;
  if (copyFrom === null || typeof copyFrom !== 'object') return null;
  return copyFrom as TransportOrder;
}

function resolveCreateTruckType(search: string, copyFrom: TransportOrder | null): string {
  const copied = copyFrom?.extra?.truckType;
  if (copied && isMultiDropType(copied, MULTI_DROP_TRUCK_TYPES)) return copied;
  const param = new URLSearchParams(search).get('truckType')?.trim() ?? '';
  if (isMultiDropType(param, MULTI_DROP_TRUCK_TYPES)) return param;
  return MULTI_DROP_TRUCK_TYPES[0] ?? '';
}

export function TransportOrderMultiDropFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const copyFrom = isEdit ? null : extractCopyFrom(location.state);
  const [truckType, setTruckType] = useState(() =>
    isEdit ? '' : resolveCreateTruckType(location.search, copyFrom),
  );
  const unconfigured = !isEdit && !truckType;

  useEffect(() => {
    if (!isMobile && !unconfigured) return;
    if (isMobile) {
      notifications.show({
        color: 'yellow',
        message: t('transportOrders.notifications.mobileFormBlocked'),
        autoClose: 4000,
      });
    }
    const target = isMobile
      ? isEdit && id
        ? ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', id)
        : ROUTES.TRANSPORT_ORDERS.LIST
      : ROUTES.TRANSPORT_ORDERS.NEW;
    navigate(target, { replace: true });
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

  const truckTypeOf = useTruckTypeOf();
  const truckTypeLabel = useTruckTypeLabel();
  const driverWithPlate = useDriverWithPlate();
  const { provinces, failed: locationsFailed } = useLocations();

  const goodsSuggestions = useTransportGoodsSuggestions();

  const locationOptions = useTruckLocationOptions();
  const locationLabel = useTruckLocationLabel();

  const form = useForm<FormValues>({
    initialValues: copyFrom ? valuesFromOrder(copyFrom, true) : blankValues(),
    validate: {
      entryDate: (v) => (!v ? t('transportOrders.validation.entryDateRequired') : null),
      customerCode: (v) => (!v ? t('transportOrders.validation.customerRequired') : null),
      truckId: (v, values) =>
        !values.externalTruck && !v ? t('transportOrders.validation.truckRequired') : null,
      truckPlate: (v, values) =>
        values.externalTruck && !v.trim() ? t('transportOrders.validation.plateRequired') : null,
      driverId: (v, values) =>
        !values.externalTruck && !v ? t('transportOrders.validation.driverRequired') : null,
      pickupLocation: (v) => (!v ? t('transportOrders.multiDrop.validation.pickupRequired') : null),
      stops: {
        province: (v: string) =>
          !v ? t('transportOrders.multiDrop.validation.provinceRequired') : null,

        key: (v: string, values: FormValues, path: string) => {
          if (v) return null;
          const index = Number(path.split('.')[1]);
          return values.stops[index]?.province
            ? t('transportOrders.multiDrop.validation.stopRequired')
            : null;
        },
      },
    },
  });
  useReseedFeeNames(form, isEdit || !!copyFrom);

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

      if (!isMultiDropType(o.extra?.truckType, MULTI_DROP_TRUCK_TYPES)) {
        navigate(ROUTES.TRANSPORT_ORDERS.EDIT.replace(':id', o.id), { replace: true });
        return null;
      }
      setTruckType(o.extra?.truckType ?? '');
      return valuesFromOrder(o, false);
    },
    () => {
      notifications.show({ color: 'red', message: t('transportOrders.notifications.loadError') });
      navigate(ROUTES.TRANSPORT_ORDERS.LIST);
    },
  );

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    const multiDrop: TransportOrderMultiDrop = {
      pickupLocation: values.pickupLocation,

      ...(values.pickupAt ? { pickupAt: dateTimeStringToIso(values.pickupAt) } : {}),
      stops: values.stops.map(({ province, ward, distanceKm, at }) => ({
        province,
        ward,
        distanceKm,
        ...(at ? { at: dateTimeStringToIso(at) } : {}),
      })),
      totalDays: Number(values.totalDays) || MULTI_DROP_DEFAULT_DAYS,

      ...(values.goods ? { goods: values.goods } : {}),
    };
    const snapshot = snapshotRef.current;

    const write = (extra: TransportOrderExtra) =>
      buildTransportOrderWrite({
        isMultiTrip: false,
        trips: [],
        entryDate: vnDateStringToIso(values.entryDate),
        truckId: values.truckId,
        truckPlate: values.truckPlate.trim(),
        driverId: values.driverId,
        driverName: values.driverName.trim(),
        truckType,
        customerOrderNumber: '',
        type5Specific: { requestedPickupDate: '', dropoffDate: '', moocStorageDays: null },
        billNumber: '',
        declarationNumber: '',
        containerNumber: '',
        truckingSize: '',
        shipmentType: snapshot?.shipmentType ?? '',
        route: routeFromMultiDrop(multiDrop, locationLabel(values.pickupLocation)),
        fees: feeRowsToFees(values.fees),
        advanceAmount: values.advanceAmount || 0,
        laborCost: values.laborCost || 0,
        vatRate: (values.vatRatePercent || 0) / 100,
        roundDown: values.roundDown,
        transportContractNo: values.transportContractNo.trim(),
        customerCode: values.customerCode || undefined,
        customerName: values.customerName.trim() || undefined,
        status: values.status,
        notes: values.notes.trim(),
        extra,
        multiDrop,
      });

    try {
      const saved = await saveTransportOrder({
        id: isEdit ? id : undefined,
        snapshot,
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
  };

  if (fetching || isMobile || unconfigured) return null;

  const typeLabel = truckTypeLabel(truckType);
  const pageTitle = isEdit
    ? t('transportOrders.multiDrop.editTitle', { type: typeLabel })
    : t('transportOrders.multiDrop.newTitle', { type: typeLabel });

  const truckSelectData = trucks
    .filter(
      (a) =>
        (a.isActive && !a.extra?.isDeleted && truckTypeOf(a.id) === truckType) ||
        a.id === form.values.truckId,
    )
    .map((a) => ({ value: a.id, label: truckOptionLabel(a), plate: a.name }));

  const setTruck = (truckId: string | null) => {
    const picked = truckSelectData.find((tr) => tr.value === truckId);
    form.setFieldValue('truckId', truckId ?? '');
    form.setFieldValue('truckPlate', picked?.plate ?? '');
    const truck = truckId ? trucks.find((a) => a.id === truckId) : undefined;
    if (truck?.extra?.driverId) {
      form.setFieldValue('driverId', truck.extra.driverId);
      form.setFieldValue('driverName', truck.extra.driverName ?? '');
    }
  };

  const setExternalTruck = (checked: boolean) => {
    form.setFieldValue('externalTruck', checked);
    form.setFieldValue('truckId', '');
    form.setFieldValue('truckPlate', '');
    form.setFieldValue('driverId', '');
    form.setFieldValue('driverName', '');
  };

  const withCurrent = (options: string[], current: string) =>
    current && !options.includes(current) ? [...options, current] : options;
  const provinceData = provinceOptions(provinces);

  const setProvince = (i: number, province: string | null) => {
    if ((province ?? '') === form.values.stops[i]?.province) return;
    form.setFieldValue(`stops.${i}`, {
      ...blankStop(),
      province: province ?? '',
      at: form.values.stops[i]?.at ?? null,
    });
  };

  const setWard = (i: number, ward: string | null) => {
    const row = form.values.stops[i];
    if (!row) return;
    if ((ward ?? '') === row.ward) return;
    const stop = ward ? findStop(provinces, stopKey({ province: row.province, ward })) : undefined;
    form.setFieldValue(
      `stops.${i}`,
      stop
        ? { ...stop, key: stopKey(stop), at: row.at }
        : { ...blankStop(), province: row.province, at: row.at },
    );
  };

  const pickupData = (() => {
    const current = form.values.pickupLocation;
    const options = locationOptions.map((o) => ({ value: o.value, label: o.label }));
    return current && !options.some((o) => o.value === current)
      ? [...options, { value: current, label: locationLabel(current) }]
      : options;
  })();

  const dayOptions = MULTI_DROP_DAY_OPTIONS.map((n) => ({
    value: String(n),
    label: t('transportOrders.multiDrop.days', { count: n }),
  }));

  const statusSelectData = transportOrderStatuses().map((s) => ({
    value: s.value,
    label: s.label,
  }));

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
          <SectionCard icon={<IconTruck size={14} />} title={t('transportOrders.form.jobSection')}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
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
              <DateField
                withAsterisk
                label={t('transportOrders.columns.date')}
                {...form.getInputProps('entryDate')}
              />
              <Select
                withAsterisk
                label={t('transportOrders.multiDrop.totalDays')}
                data={dayOptions}
                allowDeselect={false}
                {...form.getInputProps('totalDays')}
              />
              {/* Free text with the register as suggestions (client's ask): a
                  Xe Tải job carries whatever ships that day, so the first load
                  of something new must stay as easy to record as the daily one.
                  Shown even with an empty register, unlike the pickup below. */}
              <Autocomplete
                label={t('transportOrders.multiDrop.goods')}
                placeholder={t('transportOrders.multiDrop.goodsPlaceholder')}
                data={goodsSuggestions}
                {...form.getInputProps('goods')}
              />

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
                    onChange={setTruck}
                    error={form.errors.truckId}
                    searchable
                    nothingFoundMessage={t('transportOrders.multiDrop.noTrucksOfType', {
                      type: typeLabel,
                    })}
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
                    const linked = linkedId
                      ? truckSelectData.find((tr) => tr.value === linkedId)
                      : undefined;
                    if (linked) {
                      form.setFieldValue('truckId', linked.value);
                      form.setFieldValue('truckPlate', linked.plate);
                    }
                  }}
                  error={form.errors.driverId}
                  filter={driverEmployeeFilter}
                  optionLabel={driverWithPlate}
                />
              )}
              {/* Status is button-driven on the detail page; the picker only shows on edit. */}
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

          <SectionCard
            icon={<IconMapPin size={14} />}
            title={t('transportOrders.multiDrop.routeTitle')}
            actions={
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconPlus size={14} />}
                disabled={form.values.stops.length >= MULTI_DROP_MAX_STOPS}
                onClick={() => form.insertListItem('stops', blankStop())}
              >
                {t('transportOrders.multiDrop.addStop')}
              </Button>
            }
          >
            <Stack gap="sm">
              {locationsFailed && (
                <Alert color="red" variant="light">
                  {t('transportOrders.multiDrop.locationsFailed')}
                </Alert>
              )}
              {/* The depot is picked from the client's register, so the place a
                  job collects from reads the same on every order — the pairing
                  the drop points already have. The time beside it is typed, like
                  every estimate in this module. */}
              <Group align="flex-start" wrap="nowrap" gap="sm">
                <Select
                  style={{ flex: 1 }}
                  withAsterisk
                  label={t('transportOrders.multiDrop.pickup')}
                  placeholder={t('transportOrders.multiDrop.pickupPlaceholder')}
                  data={pickupData}
                  value={form.values.pickupLocation || null}
                  onChange={(v) => form.setFieldValue('pickupLocation', v ?? '')}
                  error={form.errors.pickupLocation}
                  searchable
                  clearable
                />
                <DateTimeTextField
                  style={{ flex: 1 }}
                  label={t('transportOrders.multiDrop.pickupAt')}
                  {...form.getInputProps('pickupAt')}
                />
              </Group>
              {form.values.stops.map((row, i) => (
                <Group key={i} align="flex-start" wrap="nowrap" gap="sm">
                  <Select
                    style={{ flex: 1 }}
                    withAsterisk
                    label={t('transportOrders.multiDrop.stop', { n: i + 1 })}
                    placeholder={t('transportOrders.multiDrop.provincePlaceholder')}
                    data={withCurrent(provinceData, row.province)}
                    value={row.province || null}
                    onChange={(v) => setProvince(i, v)}
                    error={form.errors[`stops.${i}.province`]}
                    searchable
                    clearable
                  />
                  <Select
                    style={{ flex: 1 }}
                    withAsterisk
                    label={t('transportOrders.multiDrop.ward')}
                    placeholder={t('transportOrders.multiDrop.stopPlaceholder')}
                    data={withCurrent(wardOptions(provinces, row.province), row.ward)}
                    value={row.ward || null}
                    onChange={(v) => setWard(i, v)}
                    error={form.errors[`stops.${i}.key`]}
                    disabled={!row.province}
                    searchable
                    clearable
                  />
                  <DateTimeTextField
                    style={{ flex: 1 }}
                    label={t('transportOrders.multiDrop.dropAt')}
                    {...form.getInputProps(`stops.${i}.at`)}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    mt={28}

                    disabled={form.values.stops.length <= 1}
                    onClick={() => form.removeListItem('stops', i)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>

            <Divider my="sm" />
            <Group justify="flex-end" align="flex-end">
              {/* LƯƠNG CHUYẾN — a cost we pay the driver, kept beside the run it
                  pays for and outside the customer's totals. */}
              <NumberInput
                label={t('transportOrders.trips.laborCost')}
                thousandSeparator=","
                min={0}
                w={200}
                {...form.getInputProps('laborCost')}
              />
            </Group>
          </SectionCard>

          <TransportFeeCards form={form} />

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
