

import { Button, Group, Modal, Stack, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { EmployeeSelector } from '@/components/selectors';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useProductStore } from '@/stores/useProductStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import type { DeliveryRequestItem, SalesOrder, SalesOrderExtra } from '@/types';
import { getInitialStatusValue } from './transitionEngine';
import {
  buildRemainingItemsFromSalesOrder,
  createDeliveryRequestRecord,
} from './createDeliveryRequest';
import { DesktopItemTable } from './DeliveryRequestForm';
import {
  emptyItem,
  resolveInitialScheduledDateFromSalesOrder,
  toDateTimeInputOrUndefined,
  type DeliveryRequestFormValues,
} from './deliveryRequestFormShared';
import { isNKTU } from '@/config/client';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';

const shouldShowListItems = isNKTU ? false : true;

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type CreateDeliveryRequestModalProps = {
  opened: boolean;
  onClose: () => void;
  
  salesOrder: SalesOrder;
  
  onCreated?: () => void;
};

export function CreateDeliveryRequestModal({
  opened,
  onClose,
  salesOrder,
  onCreated,
}: CreateDeliveryRequestModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  
  
  const products = useProductStore((s) => s.items);
  const productsInit = useProductStore((s) => s.initialized);
  const loadProducts = useProductStore((s) => s.loadAll);
  const drsInit = useDeliveryRequestStore((s) => s.initialized);
  const loadDRs = useDeliveryRequestStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  const { user } = useAuthStore();
  const currentEmployee = useMemo(() => {
    if (!user.email) return undefined;
    return findEmployeeByLoginEmail(employees, user.email);
  }, [user.email, employees]);

  useEffect(() => {
    if (!opened) return;
    if (!productsInit) loadProducts();
    if (!drsInit) loadDRs();
    if (!employeesInit) loadEmployees();
  }, [opened, productsInit, drsInit, employeesInit, loadProducts, loadDRs, loadEmployees]);

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

  
  
  
  const seededRef = useRef(false);
  useEffect(() => {
    if (!opened) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current || !drsInit) return;
    seededRef.current = true;
    const soExtra = (salesOrder.extra ?? {}) as SalesOrderExtra;
    const allDRs = useDeliveryRequestStore.getState().items;
    const scheduledDate = resolveInitialScheduledDateFromSalesOrder(
      isNKTU ? null : soExtra.deliveryDate,
    );
    form.setValues({
      requestNumber: '',
      direction: 'outbound',
      salesOrderId: salesOrder.id,
      salesOrderNumber: salesOrder.orderNumber,
      customerName: salesOrder.customerName,
      vendorCode: '',
      vendorName: '',
      deliveryAddress: soExtra.deliveryAddress ?? '',
      googleMapUrl: soExtra.googleMapUrl ?? '',
      scheduledDate,
      notes: '',
      items: buildRemainingItemsFromSalesOrder(salesOrder.items, salesOrder.id, allDRs),
      assignedDriverId: '',
      isUrgent: false,
    });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, drsInit, salesOrder]);

  const handleProductSelect = (idx: number, code: string | null) => {
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
  };

  const handleSubmit = async (values: DeliveryRequestFormValues) => {
    setLoading(true);
    const items: DeliveryRequestItem[] = values.items.map((item) => ({
      productCode: item.productCode.trim(),
      productName: item.productName.trim(),
      quantity: item.quantity,
      unit: item.unit.trim(),
      unitPrice: item.unitPrice,
      ...(item.fromLocationCode && { fromLocationCode: item.fromLocationCode }),
    }));
    const driver = values.assignedDriverId
      ? employees.find((e) => e.id === values.assignedDriverId)
      : undefined;
    try {
      const { linkFailed } = await createDeliveryRequestRecord({
        direction: 'outbound',
        salesOrderId: salesOrder.id,
        salesOrderNumber: salesOrder.orderNumber,
        customerName: values.customerName.trim(),
        vendorCode: '',
        vendorName: '',
        deliveryAddress: values.deliveryAddress.trim(),
        googleMapUrl: values.googleMapUrl.trim(),
        scheduledDate: toDateTimeInputOrUndefined(values.scheduledDate),
        notes: values.notes.trim(),
        items,
        assignedDriverId: values.assignedDriverId,
        assignedDriverName: driver?.name,
        isUrgent: values.isUrgent,
        currentEmployee: currentEmployee
          ? { id: currentEmployee.id, name: currentEmployee.name }
          : undefined,
        defaultStatus: getInitialStatusValue() ?? '',
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
      onCreated?.();
      onClose();
    } catch {
      notifications.show({
        color: 'red',
        message: t('deliveryRequests.notifications.createError'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryRequests.addItem')}
      size="sm"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t('common.labels.salesOrder')}
            value={salesOrder.orderNumber}
            readOnly
          />
          <TextInput
            label={t('deliveryRequests.form.customerNameLabel')}
            readOnly
            {...form.getInputProps('customerName')}
          />
          <TextInput
            label={t('common.labels.deliveryAddress')}
            placeholder={t('deliveryRequests.form.deliveryAddressPlaceholder')}
            {...form.getInputProps('deliveryAddress')}
          />
          <TextInput
            label={t('deliveryRequests.form.googleMapUrlLabel')}
            placeholder={t('deliveryRequests.form.googleMapUrlPlaceholder')}
            {...form.getInputProps('googleMapUrl')}
          />
          <DateField
            futureOnly
            label={t('deliveryRequests.form.scheduledDateLabel')}
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
                <Text fw={600} size="sm">
                  {t('deliveryRequests.form.itemsTitle')}
                </Text>
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
                  {t('deliveryRequests.form.noItemsHint')}
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
            <Button variant="default" size="sm" disabled={loading} onClick={onClose}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {t('deliveryRequests.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
