import {
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { EmployeeSelector } from '@/components/selectors';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import { DEFAULT_LOCATION_CODE } from '@/types/location';
import type { DeliveryRequestItem, SalesOrder, SalesOrderExtra } from '@/types';
import {
  buildReturnableItemsFromSalesOrder,
  createDeliveryRequestRecord,
} from './createDeliveryRequest';
import { toDateTimeInputOrUndefined } from './deliveryRequestFormShared';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { NumberField } from '@/components/NumberField';
import { Form } from '@/components/Form';

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type ReturnLine = {
  productCode: string;
  productName: string;
  unit: string;
  unitPrice: number;

  returnable: number;

  quantity: number;
};

type ReturnFormValues = {
  locationCode: string;
  scheduledDate: Date | string | null;
  notes: string;
  assignedDriverId: string;
  isUrgent: boolean;
  updateInventory: boolean;
  lines: ReturnLine[];
};

type CreateReturnShipmentModalProps = {
  opened: boolean;
  onClose: () => void;

  salesOrder: SalesOrder;

  onCreated?: () => void;
};

export function CreateReturnShipmentModal({
  opened,
  onClose,
  salesOrder,
  onCreated,
}: CreateReturnShipmentModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const drsInit = useDeliveryRequestStore((s) => s.initialized);
  const loadDRs = useDeliveryRequestStore((s) => s.loadAll);
  const locationsInit = useLocationStore((s) => s.initialized);
  const loadLocations = useLocationStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);
  const employeesInit = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  const currentEmployee = useMyEmployee();

  useEffect(() => {
    if (!opened) return;
    if (!drsInit) loadDRs();
    if (!locationsInit) loadLocations();
    if (!employeesInit) loadEmployees();
  }, [opened, drsInit, locationsInit, employeesInit, loadDRs, loadLocations, loadEmployees]);

  const form = useForm<ReturnFormValues>({
    initialValues: {
      locationCode: DEFAULT_LOCATION_CODE,
      scheduledDate: null,
      notes: '',
      assignedDriverId: '',
      isUrgent: false,
      updateInventory: false,
      lines: [],
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
    const allDRs = useDeliveryRequestStore.getState().items;
    const drafts = buildReturnableItemsFromSalesOrder(salesOrder.items, salesOrder.id, allDRs);
    const lines: ReturnLine[] = drafts.map((d) => ({
      productCode: d.productCode,
      productName: d.productName,
      unit: d.unit,
      unitPrice: d.unitPrice,
      returnable: d.quantity,
      quantity: d.quantity, // default "return all"
    }));

    const seedLocation = DEFAULT_LOCATION_CODE;
    form.setValues({
      locationCode: seedLocation,
      scheduledDate: null,
      notes: '',
      assignedDriverId: '',
      isUrgent: false,
      updateInventory: false,
      lines,
    });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, drsInit, salesOrder]);

  const returnAll = () => {
    form.getValues().lines.forEach((line, idx) => {
      form.setFieldValue(`lines.${idx}.quantity`, line.returnable);
    });
  };

  const handleSubmit = async (values: ReturnFormValues) => {
    const items: DeliveryRequestItem[] = values.updateInventory
      ? values.lines
          .filter((line) => line.quantity > 0)
          .map((line) => ({
            productCode: line.productCode,
            productName: line.productName,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            fromLocationCode: values.locationCode || DEFAULT_LOCATION_CODE,
          }))
      : [];
    if (values.updateInventory && items.length === 0) {
      notifications.show({
        color: 'yellow',
        message: t('deliveryRequests.return.noQuantity'),
      });
      return;
    }
    setLoading(true);
    const driver = values.assignedDriverId
      ? employees.find((e) => e.id === values.assignedDriverId)
      : undefined;
    try {
      const { linkFailed } = await createDeliveryRequestRecord({
        direction: 'inbound',
        inboundKind: 'customer-return',
        returnRestock: values.updateInventory,
        salesOrderId: salesOrder.id,
        salesOrderNumber: salesOrder.orderNumber,
        customerName: salesOrder.customerName,

        customerCode: (salesOrder.extra as SalesOrderExtra | undefined)?.customerCode ?? '',
        vendorCode: '',
        vendorName: '',
        deliveryAddress: '',
        googleMapUrl: '',
        scheduledDate: toDateTimeInputOrUndefined(values.scheduledDate),
        notes: values.notes.trim(),
        items,
        assignedDriverId: values.assignedDriverId,
        assignedDriverName: driver?.name,
        isUrgent: values.isUrgent,
        currentEmployee: currentEmployee
          ? { id: currentEmployee.id, name: currentEmployee.name }
          : undefined,
        status: 'pending',
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

  const lines = form.getValues().lines;
  const updateInventory = form.getValues().updateInventory;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryRequests.return.title')}
      size="lg"
      centered
    >
      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={t('common.labels.salesOrder')}
            value={salesOrder.orderNumber}
            readOnly
          />
          <TextInput
            label={t('deliveryRequests.form.customerNameLabel')}
            value={salesOrder.customerName}
            readOnly
          />

          {/* Update inventory drives whether items must be selected: on → the
              return restocks (pick lines + location); off → a plain header
              return with no line selection. */}
          <Switch
            label={t('deliveryRequests.return.updateInventoryLabel')}
            checked={updateInventory}
            onChange={(e) => form.setFieldValue('updateInventory', e.currentTarget.checked)}
          />

          {updateInventory && (
            <>
              {/* Items to return — per-product capped quantity. */}
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text fw={600} size="sm">
                    {t('deliveryRequests.return.itemsTitle')}
                  </Text>
                  {lines.length > 0 && (
                    <Button variant="light" size="compact-sm" onClick={returnAll}>
                      {t('deliveryRequests.return.returnAll')}
                    </Button>
                  )}
                </Group>

                {lines.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {t('deliveryRequests.return.noReturnable')}
                  </Text>
                ) : (
                  <Table withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('common.labels.productName')}</Table.Th>
                        <Table.Th style={{ width: 80 }}>{t('common.labels.unit')}</Table.Th>
                        <Table.Th style={{ width: 140 }}>{t('common.labels.quantity')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lines.map((line, idx) => (
                        <Table.Tr key={line.productCode}>
                          <Table.Td>
                            <Text size="sm">{line.productName}</Text>
                            <Text size="xs" c="dimmed">
                              {line.productCode}
                            </Text>
                          </Table.Td>
                          <Table.Td>{line.unit}</Table.Td>
                          <Table.Td>
                            <NumberField
                              size="xs"
                              min={0}
                              max={line.returnable}
                              clampBehavior="strict"
                              description={t('deliveryRequests.return.returnableHint', {
                                count: line.returnable,
                              })}
                              value={line.quantity}
                              emptyValue={0}
                              onChange={(quantity) =>
                                form.setFieldValue(`lines.${idx}.quantity`, quantity)
                              }
                            />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </>
          )}

          <DateField
            minDate={new Date()}
            label={t('deliveryRequests.return.scheduledDateLabel')}
            {...form.getInputProps('scheduledDate')}
          />
          <EmployeeSelector
            label={t('deliveryRequests.form.driverLabel')}
            clearable
            filter={driverEmployeeFilter}
            value={form.getValues().assignedDriverId || null}
            onChange={(v) => form.setFieldValue('assignedDriverId', v?.id ?? '')}
          />
          <Textarea
            label={t('__new__.01-common.labels.note')}
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
            <Button type="submit" loading={loading} size="sm">
              {t('deliveryRequests.return.createButton')}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}
