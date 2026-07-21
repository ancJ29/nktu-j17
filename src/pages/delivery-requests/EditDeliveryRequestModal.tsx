

import {
  Autocomplete,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCalendar } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DateField } from '@/components/DateField';
import { CustomerSelector, EmployeeSelector } from '@/components/selectors';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useVendorStore } from '@/stores/useVendorStore';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import type { DeliveryRequest, DeliveryRequestExtra, Vendor } from '@/types';
import { updateDeliveryRequestRecord } from './createDeliveryRequest';
import {
  resolveCustomerPickupAddress,
  resolveVendorInboundAddress,
  toDateTimeInputOrUndefined,
  type DeliveryRequestFormValues,
} from './deliveryRequestFormShared';

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type EditFormValues = Omit<
  DeliveryRequestFormValues,
  'requestNumber' | 'salesOrderId' | 'salesOrderNumber' | 'items'
>;

type EditDeliveryRequestModalProps = {
  opened: boolean;
  onClose: () => void;
  
  request: DeliveryRequest;
  
  onUpdated: (updated: DeliveryRequest) => void;
};

export function EditDeliveryRequestModal({
  opened,
  onClose,
  request,
  onUpdated,
}: EditDeliveryRequestModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryRequests.editItem')}
      size="sm"
      centered
    >
      {opened ? <EditBody request={request} onClose={onClose} onUpdated={onUpdated} t={t} /> : null}
    </Modal>
  );
}

type EditBodyProps = {
  request: DeliveryRequest;
  onClose: () => void;
  onUpdated: (updated: DeliveryRequest) => void;
  t: TFunction;
};

function EditBody({ request, onClose, onUpdated, t }: EditBodyProps) {
  const [loading, setLoading] = useState(false);

  
  
  const direction = request.direction ?? 'outbound';
  const isInbound = direction === 'inbound';
  
  
  
  const inboundKind = (request.extra as DeliveryRequestExtra | undefined)?.inboundKind ?? 'vendor';
  const partyIsCustomer = !isInbound || inboundKind !== 'vendor';
  
  
  
  const isSample = isInbound && inboundKind === 'customer-sample';

  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  const vendors = useVendorStore((s) => s.items);
  const vendorsInit = useVendorStore((s) => s.initialized);
  const loadVendors = useVendorStore((s) => s.loadAll);
  const customers = useCustomerStore((s) => s.items);
  const customersInit = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);

  
  
  
  useEffect(() => {
    if (!employeesInit) loadEmployees();
    if (!partyIsCustomer && !vendorsInit) loadVendors();
    if (isSample && !customersInit) loadCustomers();
  }, [
    employeesInit,
    loadEmployees,
    partyIsCustomer,
    vendorsInit,
    loadVendors,
    isSample,
    customersInit,
    loadCustomers,
  ]);

  const vendorOptions = useMemo(
    () =>
      vendors
        .filter((v) => !v.extra?.isDeleted)
        .map((v) => v.extra?.shortName?.trim() || v.name)
        .filter((name): name is string => !!name),
    [vendors],
  );
  const vendorByDisplayName = useMemo(() => {
    const m = new Map<string, Vendor>();
    for (const v of vendors) {
      if (v.extra?.isDeleted) continue;
      const display = v.extra?.shortName?.trim() || v.name;
      if (display && !m.has(display)) m.set(display, v);
    }
    return m;
  }, [vendors]);

  const drExtra = (request.extra ?? {}) as DeliveryRequestExtra;
  const form = useForm<EditFormValues>({
    initialValues: {
      direction,
      customerName: request.customerName ?? '',
      vendorCode: request.vendorCode ?? '',
      vendorName: request.vendorName ?? '',
      deliveryAddress: drExtra.deliveryAddress ?? '',
      googleMapUrl: drExtra.googleMapUrl ?? '',
      scheduledDate: request.scheduledDate ? new Date(request.scheduledDate) : null,
      notes: request.notes ?? '',
      assignedDriverId: drExtra.assignedDriverId ?? '',
      isUrgent: drExtra.isUrgent ?? false,
    },
  });

  const handleSubmit = async (values: EditFormValues) => {
    setLoading(true);
    
    
    const customerName = partyIsCustomer ? values.customerName.trim() : '';
    const vendorCode = partyIsCustomer ? '' : values.vendorCode.trim();
    const vendorName = partyIsCustomer ? '' : values.vendorName.trim();
    const driver = values.assignedDriverId
      ? employees.find((e) => e.id === values.assignedDriverId)
      : undefined;
    try {
      const { deliveryRequest: updated } = await updateDeliveryRequestRecord({
        id: request.id,
        snapshot: request,
        customerName,
        vendorCode,
        vendorName,
        deliveryAddress: values.deliveryAddress.trim(),
        googleMapUrl: values.googleMapUrl.trim(),
        scheduledDate: toDateTimeInputOrUndefined(values.scheduledDate),
        notes: values.notes.trim(),
        
        items: request.items,
        assignedDriverId: values.assignedDriverId,
        assignedDriverName: driver?.name,
        isUrgent: values.isUrgent,
      });
      onUpdated(updated);
      notifications.show({
        color: 'green',
        message: t('deliveryRequests.notifications.updateSuccess'),
      });
      onClose();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        
        
        if (err.latest) onUpdated(err.latest as DeliveryRequest);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        onClose();
      } else {
        notifications.show({
          color: 'red',
          message: t('deliveryRequests.notifications.updateError'),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  
  
  
  
  const sampleCustomerId = isSample
    ? (customers.find(
        (c) =>
          c.name === form.getValues().customerName ||
          c.extra?.shortName === form.getValues().customerName,
      )?.id ?? null)
    : null;

  const addressLabel = isInbound
    ? t('deliveryRequests.form.pickupAddressLabel')
    : t('common.labels.deliveryAddress');
  const addressPlaceholder = isInbound
    ? t('deliveryRequests.form.pickupAddressPlaceholder')
    : t('deliveryRequests.form.deliveryAddressPlaceholder');
  const scheduledDateLabel = isInbound
    ? t('deliveryRequests.form.scheduledDateLabelReceive')
    : t('deliveryRequests.form.scheduledDateLabel');

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t('deliveryRequests.form.requestNumberLabel')}
          value={request.requestNumber}
          readOnly
        />

        {!partyIsCustomer ? (
          <Autocomplete
            label={t('deliveryRequests.form.vendorLabel')}
            placeholder={t('deliveryRequests.form.vendorPlaceholder')}
            description={t('deliveryRequests.form.vendorPickOrTypeDesc')}
            data={vendorOptions}
            value={form.getValues().vendorName}
            onChange={(value) => {
              
              
              const matched = vendorByDisplayName.get(value);
              const prevCode = form.getValues().vendorCode;
              form.setFieldValue('vendorName', value);
              form.setFieldValue('vendorCode', matched?.code ?? '');
              
              
              if (matched && matched.code !== prevCode) {
                const { deliveryAddress, googleMapUrl } = resolveVendorInboundAddress(matched);
                form.setFieldValue('deliveryAddress', deliveryAddress);
                form.setFieldValue('googleMapUrl', googleMapUrl);
              }
            }}
          />
        ) : (
          <>
            {request.salesOrderNumber ? (
              <TextInput
                label={t('common.labels.salesOrder')}
                value={request.salesOrderNumber}
                readOnly
              />
            ) : null}
            {isSample ? (
              <CustomerSelector
                label={t('common.labels.customer')}
                placeholder={t('common.labels.customer')}
                value={sampleCustomerId}
                onChange={(sel) => {
                  
                  
                  
                  if (!sel) return;
                  form.setFieldValue('customerName', sel.name);
                  if (sel.id === sampleCustomerId) return;
                  const { deliveryAddress, googleMapUrl } = resolveCustomerPickupAddress(
                    sel.customer,
                  );
                  form.setFieldValue('deliveryAddress', deliveryAddress);
                  form.setFieldValue('googleMapUrl', googleMapUrl);
                }}
              />
            ) : (
              <TextInput
                label={t('deliveryRequests.form.customerNameLabel')}
                placeholder={t('deliveryRequests.form.customerNamePlaceholder')}
                
                
                readOnly={!!request.salesOrderId}
                {...form.getInputProps('customerName')}
              />
            )}
          </>
        )}

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

        <DateField
          futureOnly
          label={scheduledDateLabel}
          placeholder={t('deliveryRequests.form.scheduledDatePlaceholder')}
          leftSection={<IconCalendar size={16} />}
          clearable
          {...form.getInputProps('scheduledDate')}
        />

        <EmployeeSelector
          label={t('deliveryRequests.form.driverLabel')}
          placeholder={t('deliveryRequests.form.driverPlaceholder')}
          clearable
          filter={driverEmployeeFilter}
          value={form.getValues().assignedDriverId || null}
          onChange={(sel) => form.setFieldValue('assignedDriverId', sel?.id ?? '')}
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

        <Group justify="flex-end" gap="sm" mt="md">
          <Button variant="default" size="sm" disabled={loading} onClick={onClose}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            {t('deliveryRequests.form.updateButton')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
