import {
  ActionIcon,
  Button,
  Card,
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
import { DateField } from '@/components/DateField';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconPackageExport,
  IconPackageImport,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useProductStore } from '@/stores/useProductStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import {
  getDeliveryRequestDriverDepartments,
  isPricingManagementEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import { EmployeeSelector, VendorSelector } from '@/components/selectors';
import { SegmentTabs } from '@/components/SegmentTabs';
import type {
  DeliveryRequest,
  DeliveryRequestExtra,
  DeliveryRequestItem,
  SalesOrder,
  SalesOrderExtra,
  Vendor,
} from '@/types';
import type { DateTimeInput } from '@credo/kits/types';
import type { CMngtDeliveryRequestDirection } from '@credo/connectors/types';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getInitialStatusValue } from './transitionEngine';
import {
  buildRemainingItemsFromSalesOrder,
  createDeliveryRequestRecord,
  updateDeliveryRequestRecord,
} from './createDeliveryRequest';
import {
  emptyItem,
  resolveInitialScheduledDateFromSalesOrder,
  resolveVendorInboundAddress,
  toDateTimeInputOrUndefined,
  type DeliveryRequestFormValues,
} from './deliveryRequestFormShared';
import type { DeliveryRequestVariant } from './deliveryRequestVariant';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';
import { Form } from '@/components/Form';

const isMobile = device.isMobile;
const pricingEnabled = isPricingManagementEnabled();
const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type DeliveryRequestFormProps = {
  readonly variant: DeliveryRequestVariant;
};

export function DeliveryRequestForm({ variant }: DeliveryRequestFormProps) {
  const shouldShowListItems = variant.showListItems;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const fromSalesOrderId = (() => {
    if (isEdit) return undefined;
    const state = location.state as { fromSalesOrderId?: unknown } | null;
    const v = state?.fromSalesOrderId;
    return typeof v === 'string' ? v : undefined;
  })();

  const {
    items: salesOrders,
    initialized: soInitialized,
    loadAll: loadSalesOrders,
  } = useSalesOrderStore();

  const allDRs = useDeliveryRequestStore((s) => s.items);
  const drsInit = useDeliveryRequestStore((s) => s.initialized);
  const loadDRs = useDeliveryRequestStore((s) => s.loadAll);

  const { user } = useAuthStore();
  const employees = useEmployeeStore((s) => s.items);
  const currentEmployee = useMemo(() => {
    if (!user.email) return undefined;
    return findEmployeeByLoginEmail(employees, user.email);
  }, [user.email, employees]);

  const products = useProductStore((s) => s.items);

  const vendorsInit = useVendorStore((s) => s.initialized);
  const loadVendors = useVendorStore((s) => s.loadAll);

  useEffect(() => {
    if (!soInitialized) loadSalesOrders();
    if (!drsInit) loadDRs();
    if (!vendorsInit) loadVendors();
  }, [soInitialized, drsInit, vendorsInit, loadSalesOrders, loadDRs, loadVendors]);

  const ordersWithDR = useMemo(() => {
    const s = new Set<string>();
    for (const dr of allDRs) {
      if (dr.salesOrderId && !dr.extra?.isDeleted) s.add(dr.salesOrderId);
    }
    return s;
  }, [allDRs]);

  const salesOrderSelectData = useMemo(
    () =>
      salesOrders
        .filter(
          (so) =>
            !so.isClosed &&
            !so.extra?.isDeleted &&
            (!ordersWithDR.has(so.id) || so.id === fromSalesOrderId),
        )
        .map((so) => ({
          value: so.id,
          label: `${so.orderNumber} — ${so.customerName}`,
          orderNumber: so.orderNumber,
          customerName: so.customerName,
          items: so.items,
        })),
    [salesOrders, ordersWithDR, fromSalesOrderId],
  );

  const salesOrderMap = useMemo(() => {
    const m = new Map<string, (typeof salesOrderSelectData)[number]>();
    for (const so of salesOrderSelectData) m.set(so.value, so);
    return m;
  }, [salesOrderSelectData]);

  const productSelectData = useMemo(
    () =>
      products
        .filter((p) => p.isActive)
        .map((p) => ({
          value: p.code,
          label: `${p.code} — ${p.name}`,
          name: p.name,
          unit: p.unit,
          price: p.price,
        })),
    [products],
  );

  const productMap = useMemo(() => {
    const m = new Map<string, (typeof productSelectData)[number]>();
    for (const p of productSelectData) m.set(p.value, p);
    return m;
  }, [productSelectData]);

  const defaultStatus = getInitialStatusValue() ?? '';

  useEffect(() => {
    if (isMobile) {
      notifications.show({
        color: 'yellow',
        message: t('deliveryRequests.notifications.formDesktopOnly'),
      });
      navigate(ROUTES.DELIVERY.LIST, { replace: true });
      return;
    }
    if (
      (isEdit && !perms.deliveryRequest.canEdit()) ||
      (!isEdit && !perms.deliveryRequest.canCreate())
    ) {
      navigate(ROUTES.DELIVERY.LIST, { replace: true });
    }
  }, [navigate, isEdit, t]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<DeliveryRequest | null>(null);

  const [editInboundKind, setEditInboundKind] = useState<string | undefined>(undefined);

  const [editVendorCode, setEditVendorCode] = useState('');

  const [oneOffVendor, setOneOffVendor] = useState(false);

  const registeredVendorFilter = useCallback(
    (v: Vendor) => !v.extra?.isDeleted && (v.isActive || v.code === editVendorCode),
    [editVendorCode],
  );

  const form = useForm<DeliveryRequestFormValues>({
    initialValues: {
      requestNumber: '',
      direction: 'outbound',
      salesOrderId: '',
      salesOrderNumber: '',
      customerName: '',
      vendorCode: '',
      vendorName: '',
      deliveryAddress: '',
      googleMapUrl: '',
      scheduledDate: null,
      notes: '',

      items: [],
      assignedDriverId: '',
      isUrgent: false,
    },
    validate: {
      requestNumber: () => null,

      items: {
        productCode: (v) =>
          v.trim() ? null : t('deliveryRequests.validation.productCodeRequired'),
        productName: (v) =>
          v.trim() ? null : t('deliveryRequests.validation.productNameRequired'),
        quantity: (v) => (v > 0 ? null : t('common.validation.quantityRequired')),
        unit: (v) => (v.trim() ? null : t('common.validation.unitRequired')),
        unitPrice: (v) => (v >= 0 ? null : t('deliveryRequests.validation.unitPriceRequired')),
      },
    },
  });

  const handleSalesOrderSelect = useCallback(
    (soId: string | null) => {
      if (!soId) {
        form.setFieldValue('salesOrderId', '');
        form.setFieldValue('salesOrderNumber', '');

        return;
      }
      const so = salesOrderMap.get(soId);
      if (so) {
        form.setFieldValue('salesOrderId', so.value);
        form.setFieldValue('salesOrderNumber', so.orderNumber);
        form.setFieldValue('customerName', so.customerName);

        const soRecord = useSalesOrderStore.getState().getById(so.value) as SalesOrder | undefined;
        const soExtra = (soRecord?.extra ?? {}) as SalesOrderExtra;
        form.setFieldValue('deliveryAddress', soExtra.deliveryAddress ?? '');
        form.setFieldValue('googleMapUrl', soExtra.googleMapUrl ?? '');

        const remaining = buildRemainingItemsFromSalesOrder(so.items, so.value, allDRs);
        if (remaining.length > 0) {
          form.setFieldValue('items', remaining);
        }
      }
    },

    [salesOrderMap, allDRs],
  );

  useEffect(() => {
    if (!fromSalesOrderId) return;
    if (!soInitialized) return;
    if (form.getValues().salesOrderId === fromSalesOrderId) return;
    handleSalesOrderSelect(fromSalesOrderId);
    const so = salesOrders.find((o) => o.id === fromSalesOrderId);
    if (so) {
      const soExtra = so.extra as { deliveryDate?: DateTimeInput | null };

      form.setFieldValue(
        'scheduledDate',
        resolveInitialScheduledDateFromSalesOrder(soExtra.deliveryDate),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSalesOrderId, soInitialized, handleSalesOrderSelect]);

  const handleProductSelect = useCallback(
    (idx: number, code: string | null) => {
      if (!code) {
        form.setFieldValue(`items.${idx}.productCode`, '');
        return;
      }
      const prod = productMap.get(code);
      if (prod) {
        form.setFieldValue(`items.${idx}.productCode`, prod.value);
        form.setFieldValue(`items.${idx}.productName`, prod.name);
        form.setFieldValue(`items.${idx}.unit`, prod.unit);
        form.setFieldValue(`items.${idx}.unitPrice`, prod.price);
      }
    },

    [productMap],
  );

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getDeliveryRequestById({ id });
      const r = res.deliveryRequest as DeliveryRequest;
      snapshotRef.current = r;
      if (r.isClosed) {
        navigate(ROUTES.DELIVERY.DETAIL.replace(':id', id), { replace: true });
        return null;
      }
      const drExtra = (r.extra ?? {}) as DeliveryRequestExtra;
      setEditInboundKind(drExtra.inboundKind);
      setEditVendorCode(r.vendorCode ?? '');
      setOneOffVendor(!r.vendorCode && !!r.vendorName);
      return {
        requestNumber: r.requestNumber,

        direction: (r.direction ?? 'outbound') as CMngtDeliveryRequestDirection,
        salesOrderId: r.salesOrderId ?? '',
        salesOrderNumber: r.salesOrderNumber ?? '',
        customerName: r.customerName ?? '',
        vendorCode: r.vendorCode ?? '',
        vendorName: r.vendorName ?? '',

        deliveryAddress: drExtra.deliveryAddress ?? '',
        googleMapUrl: drExtra.googleMapUrl ?? '',
        scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : null,
        notes: r.notes || '',
        items: r.items.map((item) => ({
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          fromLocationCode: item.fromLocationCode,
        })),
        assignedDriverId: drExtra.assignedDriverId ?? '',
        isUrgent: drExtra.isUrgent ?? false,
      };
    },
    () => {
      notifications.show({
        color: 'red',
        message: t('deliveryRequests.notifications.fetchError'),
      });
      navigate(ROUTES.DELIVERY.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: DeliveryRequestFormValues) => {
      setLoading(true);
      const items: DeliveryRequestItem[] = values.items.map((item) => ({
        productCode: item.productCode.trim(),
        productName: item.productName.trim(),
        quantity: item.quantity,
        unit: item.unit.trim(),
        unitPrice: item.unitPrice,
        ...(item.fromLocationCode && { fromLocationCode: item.fromLocationCode }),
      }));

      const isInbound = values.direction === 'inbound';

      const partyIsCustomer =
        !isInbound || (editInboundKind != null && editInboundKind !== 'vendor');
      const customerName = partyIsCustomer ? values.customerName.trim() : '';
      const vendorCode = partyIsCustomer ? '' : values.vendorCode.trim();
      const vendorName = partyIsCustomer ? '' : values.vendorName.trim();

      const deliveryAddress = values.deliveryAddress.trim();
      const googleMapUrl = values.googleMapUrl.trim();

      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Delivery request snapshot missing');
          const driver = values.assignedDriverId
            ? employees.find((e) => e.id === values.assignedDriverId)
            : undefined;
          const { deliveryRequest: updated } = await updateDeliveryRequestRecord({
            id,
            snapshot,
            customerName,
            vendorCode,
            vendorName,
            deliveryAddress,
            googleMapUrl,
            scheduledDate: toDateTimeInputOrUndefined(values.scheduledDate),
            notes: values.notes.trim(),
            items,
            assignedDriverId: values.assignedDriverId,
            assignedDriverName: driver?.name,
            isUrgent: values.isUrgent,
          });
          snapshotRef.current = updated;
          notifications.show({
            color: 'green',
            message: t('deliveryRequests.notifications.updateSuccess'),
          });
          navigate(ROUTES.DELIVERY.DETAIL.replace(':id', id));
        } else {
          const driver = values.assignedDriverId
            ? employees.find((e) => e.id === values.assignedDriverId)
            : undefined;
          const isInbound = values.direction === 'inbound';
          const { deliveryRequest, linkFailed } = await createDeliveryRequestRecord({
            direction: values.direction,
            salesOrderId: values.salesOrderId,
            salesOrderNumber: values.salesOrderNumber,
            customerName,

            vendorCode,
            vendorName,
            deliveryAddress,
            googleMapUrl,
            scheduledDate: toDateTimeInputOrUndefined(values.scheduledDate),
            notes: values.notes.trim(),
            items,
            assignedDriverId: values.assignedDriverId,
            assignedDriverName: driver?.name,
            isUrgent: values.isUrgent,
            currentEmployee: currentEmployee
              ? { id: currentEmployee.id, name: currentEmployee.name }
              : undefined,

            initialStatus: variant.inboundStartsPending && isInbound ? 'pending' : defaultStatus,
          });

          if (linkFailed) {
            notifications.show({
              color: 'yellow',
              title: t('deliveryRequests.notifications.createSuccess'),
              message: t('deliveryRequests.notifications.linkSalesOrderFailed'),
              autoClose: 8000,
            });
          }
          notifications.show({
            color: 'green',
            message: t('deliveryRequests.notifications.createSuccess'),
          });
          navigate(ROUTES.DELIVERY.DETAIL.replace(':id', deliveryRequest.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as DeliveryRequest;
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
              ? t('deliveryRequests.notifications.updateError')
              : t('deliveryRequests.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [
      isEdit,
      id,
      t,
      navigate,
      defaultStatus,
      currentEmployee,
      employees,
      editInboundKind,
      variant.inboundStartsPending,
    ],
  );

  if (fetching) return null;

  if (isMobile) return null;

  const pageTitle = isEdit ? t('deliveryRequests.editItem') : t('deliveryRequests.addItem');

  const isInboundForm = form.getValues().direction === 'inbound';

  const partyIsCustomerForm =
    !isInboundForm || (editInboundKind != null && editInboundKind !== 'vendor');
  const addressLabel = isInboundForm
    ? t('deliveryRequests.form.pickupAddressLabel')
    : t('common.labels.deliveryAddress');
  const addressPlaceholder = isInboundForm
    ? t('deliveryRequests.form.pickupAddressPlaceholder')
    : t('deliveryRequests.form.deliveryAddressPlaceholder');
  const scheduledDateLabel = isInboundForm
    ? t('deliveryRequests.form.scheduledDateLabelReceive')
    : t('deliveryRequests.form.scheduledDateLabel');
  const itemsSectionTitle = isInboundForm
    ? t('deliveryRequests.form.itemsTitleReceive')
    : t('deliveryRequests.form.itemsTitle');
  const noItemsHint = isInboundForm
    ? t('deliveryRequests.form.noItemsHintReceive')
    : t('deliveryRequests.form.noItemsHint');

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

      <Card withBorder radius="md" p="xl">
        {}
        <Form form={form} onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label={t('deliveryRequests.form.requestNumberLabel')}
              placeholder={t('deliveryRequests.form.requestNumberAutoPlaceholder')}
              disabled
              {...form.getInputProps('requestNumber')}
            />

            {/* Direction picker — only meaningful on create. Edit keeps the
                original direction so the persisted record's identity (SO+
                customer vs. vendor) doesn't go stale. */}
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                {t('deliveryRequests.form.directionLabel')}
              </Text>
              <SegmentTabs<CMngtDeliveryRequestDirection>
                value={form.getValues().direction}
                disabled={isEdit}
                onChange={(next) => {
                  if (isEdit) return;
                  if (next === form.getValues().direction) return;

                  form.setFieldValue('direction', next);
                  if (next === 'inbound') {
                    form.setFieldValue('salesOrderId', '');
                    form.setFieldValue('salesOrderNumber', '');
                    form.setFieldValue('customerName', '');
                  } else {
                    form.setFieldValue('vendorCode', '');
                    form.setFieldValue('vendorName', '');
                  }
                }}
                data={[
                  {
                    value: 'outbound',
                    label: t('deliveryRequests.form.directionOutbound'),
                    icon: <IconPackageExport size={22} />,
                    description: t('deliveryRequests.form.directionOutboundDesc'),
                  },
                  {
                    value: 'inbound',
                    label: t('deliveryRequests.form.directionInbound'),
                    icon: <IconPackageImport size={22} />,
                    description: t('deliveryRequests.form.directionInboundDesc'),
                  },
                ]}
              />
            </Stack>

            {partyIsCustomerForm ? (
              <>
                {!isEdit && salesOrderSelectData.length > 0 ? (
                  <Select
                    label={t('common.labels.salesOrder')}
                    placeholder={t('deliveryRequests.form.salesOrderPlaceholder')}
                    data={salesOrderSelectData}
                    searchable
                    clearable
                    description={t('deliveryRequests.form.salesOrderOptionalDesc')}
                    value={form.getValues().salesOrderId || null}
                    onChange={handleSalesOrderSelect}
                    error={form.errors.salesOrderId}
                  />
                ) : (
                  <TextInput
                    label={t('common.labels.salesOrder')}
                    disabled={isEdit}
                    value={form.getValues().salesOrderNumber}
                    readOnly
                  />
                )}

                <TextInput
                  label={t('deliveryRequests.form.customerNameLabel')}
                  placeholder={t('deliveryRequests.form.customerNamePlaceholder')}

                  readOnly={!!form.getValues().salesOrderId}
                  {...form.getInputProps('customerName')}
                />
              </>
            ) : (
              <Stack gap={6}>
                <Switch
                  size="xs"
                  label={t('deliveryRequests.form.unregisteredVendorLabel')}
                  checked={oneOffVendor}
                  onChange={(e) => {
                    setOneOffVendor(e.currentTarget.checked);

                    form.setFieldValue('vendorName', '');
                    form.setFieldValue('vendorCode', '');
                  }}
                />
                {oneOffVendor ? (
                  <TextInput
                    label={t('deliveryRequests.form.vendorLabel')}
                    placeholder={t('deliveryRequests.form.vendorTypePlaceholder')}
                    value={form.getValues().vendorName}
                    onChange={(e) => {
                      form.setFieldValue('vendorName', e.currentTarget.value);
                      form.setFieldValue('vendorCode', '');
                    }}
                  />
                ) : (
                  <VendorSelector
                    label={t('deliveryRequests.form.vendorLabel')}
                    placeholder={t('deliveryRequests.form.vendorPlaceholder')}
                    clearable
                    filter={registeredVendorFilter}
                    value={form.getValues().vendorCode || null}
                    onChange={(sel) => {
                      const prevCode = form.getValues().vendorCode;
                      form.setFieldValue('vendorName', sel?.name ?? '');
                      form.setFieldValue('vendorCode', sel?.code ?? '');

                      if (sel && sel.code !== prevCode) {
                        const { deliveryAddress, googleMapUrl } = resolveVendorInboundAddress(
                          sel.vendor,
                        );
                        form.setFieldValue('deliveryAddress', deliveryAddress);
                        form.setFieldValue('googleMapUrl', googleMapUrl);
                      }
                    }}
                  />
                )}
              </Stack>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={addressLabel}
                placeholder={addressPlaceholder}
                {...form.getInputProps('deliveryAddress')}
              />
              <TextInput
                label={t('deliveryRequests.form.googleMapUrlLabel')}
                placeholder={t('deliveryRequests.form.googleMapUrlPlaceholder')}
                {...form.getInputProps('googleMapUrl')}
              />
            </SimpleGrid>
            <DateField
              futureOnly
              label={scheduledDateLabel}
              placeholder={t('deliveryRequests.form.scheduledDatePlaceholder')}
              {...form.getInputProps('scheduledDate')}
            />

            <EmployeeSelector
              label={t('deliveryRequests.form.driverLabel')}
              placeholder={t('deliveryRequests.form.driverPlaceholder')}
              clearable
              filter={driverEmployeeFilter}
              value={form.getValues().assignedDriverId || null}
              onChange={(v) => form.setFieldValue('assignedDriverId', v?.id ?? '')}
            />

            <Textarea
              label={t('__new__.01-common.labels.note')}
              placeholder={t('deliveryRequests.form.notesPlaceholder')}
              autosize
              minRows={2}
              {...form.getInputProps('notes')}
            />

            <Switch
              label={t('deliveryRequests.form.isUrgentLabel')}
              description={t('deliveryRequests.form.isUrgentDesc')}
              color="red"
              checked={form.getValues().isUrgent}
              onChange={(e) => form.setFieldValue('isUrgent', e.currentTarget.checked)}
            />

            {/* Line items — optional. Header-only DR is allowed. */}
            {shouldShowListItems && (
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Title order={6}>{itemsSectionTitle}</Title>
                  <Button
                    variant="light"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => form.insertListItem('items', { ...emptyItem })}
                  >
                    {t('deliveryRequests.form.addItem')}
                  </Button>
                </Group>

                {form.getValues().items.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {noItemsHint}
                  </Text>
                ) : (
                  <DesktopItemTable
                    form={form}
                    productSelectData={productSelectData}
                    onProductSelect={handleProductSelect}
                    t={t}
                  />
                )}
              </Stack>
            )}

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                size="sm"
                disabled={loading}
                onClick={() => navigate(ROUTES.DELIVERY.LIST)}
              >
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" loading={loading} size="sm">
                {isEdit
                  ? t('deliveryRequests.form.updateButton')
                  : t('deliveryRequests.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </Form>
      </Card>
    </Stack>
  );
}

type ItemEditorProps = {
  form: ReturnType<typeof useForm<DeliveryRequestFormValues>>;
  productSelectData: { value: string; label: string; name: string; unit: string; price: number }[];
  onProductSelect: (idx: number, code: string | null) => void;

  t: (key: any) => string;
};

export function DesktopItemTable({ form, productSelectData, onProductSelect, t }: ItemEditorProps) {
  return (
    <Table withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ minWidth: 180 }}>{t('common.labels.sku')}</Table.Th>
          <Table.Th>{t('common.labels.productName')}</Table.Th>
          <Table.Th style={{ width: 90 }}>{t('common.labels.quantity')}</Table.Th>
          <Table.Th style={{ width: 80 }}>{t('common.labels.unit')}</Table.Th>
          {pricingEnabled && (
            <Table.Th style={{ width: 120 }}>{t('common.labels.unitPrice')}</Table.Th>
          )}
          <Table.Th style={{ width: 40 }} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {form.getValues().items.map((item, idx) => (
          <Table.Tr key={idx}>
            <Table.Td>
              {productSelectData.length > 0 ? (
                <Select
                  size="xs"
                  data={productSelectData}
                  searchable
                  placeholder={t('common.labels.code')}
                  value={item.productCode || null}
                  onChange={(v) => onProductSelect(idx, v)}
                  error={form.errors[`items.${idx}.productCode`] ? true : undefined}
                />
              ) : (
                <TextInput
                  size="xs"
                  placeholder={t('common.labels.code')}
                  {...form.getInputProps(`items.${idx}.productCode`)}
                />
              )}
            </Table.Td>
            <Table.Td>
              <TextInput
                size="xs"
                placeholder={t('common.labels.name')}
                readOnly={productSelectData.length > 0}
                {...form.getInputProps(`items.${idx}.productName`)}
              />
            </Table.Td>
            <Table.Td>
              <NumberInput
                size="xs"
                min={1}
                placeholder={t('common.labels.quantity')}
                {...form.getInputProps(`items.${idx}.quantity`)}
              />
            </Table.Td>
            <Table.Td>
              <TextInput
                size="xs"
                placeholder={t('common.labels.unit')}
                readOnly={productSelectData.length > 0}
                {...form.getInputProps(`items.${idx}.unit`)}
              />
            </Table.Td>
            {pricingEnabled && (
              <Table.Td>
                <NumberInput
                  size="xs"
                  min={0}
                  thousandSeparator=","
                  placeholder={t('common.form.unitPricePlaceholder')}
                  {...form.getInputProps(`items.${idx}.unitPrice`)}
                />
              </Table.Td>
            )}
            <Table.Td>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => form.removeListItem('items', idx)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
