import { useCallback, useMemo, useState } from 'react';
import { Button, Group, Modal, Stack, Switch, Textarea } from '@mantine/core';
import { DateField } from '@/components/DateField';
import { notifications } from '@mantine/notifications';
import { IconCalendar } from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { EmployeeSelector } from '@/components/selectors';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { bulkCreateOutboundDeliveryRequests } from '@/pages/delivery-requests/bulkCreateDeliveryRequests';
import type { Customer, SalesOrder } from '@/types';

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type NKTUBulkCreateDeliveryRequestModalProps = {
  opened: boolean;
  onClose: () => void;

  salesOrders: SalesOrder[];
  getCustomerByCode: (code: string) => Customer | undefined;

  onCreated?: () => void;
  t: TFunction;
};

export function NKTUBulkCreateDeliveryRequestModal({
  opened,
  onClose,
  salesOrders,
  getCustomerByCode,
  onCreated,
  t,
}: NKTUBulkCreateDeliveryRequestModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryRequests.bulkCreate.titleWithCount', { count: salesOrders.length })}
      size="md"
      centered
    >
      {opened ? (
        <BulkForm
          onClose={onClose}
          salesOrders={salesOrders}
          getCustomerByCode={getCustomerByCode}
          onCreated={onCreated}
          t={t}
        />
      ) : null}
    </Modal>
  );
}

type BulkFormProps = Omit<NKTUBulkCreateDeliveryRequestModalProps, 'opened'>;

function BulkForm({ onClose, salesOrders, getCustomerByCode, onCreated, t }: BulkFormProps) {
  const employees = useEmployeeStore((s) => s.items);

  const [driverId, setDriverId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);

  const driver = useMemo(
    () => (driverId ? (employees.find((e) => e.id === driverId) ?? null) : null),
    [driverId, employees],
  );

  const handleSave = useCallback(async () => {
    if (!driver || !date || salesOrders.length === 0) return;
    setSaving(true);
    try {
      const { created, failures, linkFailures } = await bulkCreateOutboundDeliveryRequests({
        salesOrders,
        driver,
        scheduledDate: date,
        notes,
        isUrgent,
        resolveCustomerName: (so) => resolveSalesOrderCustomerName(so, getCustomerByCode),
      });

      if (failures.length === 0 && created.length > 0) {
        notifications.show({
          color: 'green',
          message: t('deliveryRequests.bulkCreate.saveSuccess', {
            count: created.length,
            driver: driver.name,
          }),
        });
        if (linkFailures > 0) {
          notifications.show({
            color: 'yellow',
            message: t('deliveryRequests.bulkCreate.linkWarning', { count: linkFailures }),
            autoClose: 8000,
          });
        }
        onCreated?.();
        onClose();
      } else if (created.length > 0) {
        notifications.show({
          color: 'yellow',
          title: t('deliveryRequests.bulkCreate.partialTitle'),
          message: t('deliveryRequests.bulkCreate.partial', {
            ok: created.length,
            fail: failures.length,
          }),
          autoClose: 10000,
        });
        onCreated?.();
        onClose();
      } else {
        notifications.show({
          color: 'red',
          title: t('deliveryRequests.bulkCreate.saveFailedTitle'),
          message: t('deliveryRequests.bulkCreate.saveFailed', { count: failures.length }),
        });
      }
    } finally {
      setSaving(false);
    }
  }, [driver, date, notes, isUrgent, salesOrders, getCustomerByCode, t, onClose, onCreated]);

  return (
    <Stack gap="md">
      <EmployeeSelector
        label={t('deliveryRequests.bulkCreate.driverLabel')}
        placeholder={t('deliveryRequests.bulkCreate.driverPlaceholder')}
        required
        clearable
        filter={driverEmployeeFilter}
        value={driverId}
        onChange={(sel) => setDriverId(sel?.id ?? null)}
      />
      <DateField
        futureOnly
        required
        label={t('deliveryRequests.bulkCreate.dateRequiredLabel')}
        placeholder={t('deliveryRequests.bulkCreate.datePlaceholder')}
        leftSection={<IconCalendar size={16} />}
        clearable
        value={date}
        onChange={(v) => setDate(typeof v === 'string' ? (v ? new Date(v) : null) : v)}
      />
      <Textarea
        label={t('__new__.01-common.labels.note')}
        placeholder={t('deliveryRequests.form.notesPlaceholder')}
        autosize
        minRows={2}
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
      />
      <Switch
        label={t('deliveryRequests.form.isUrgentLabel')}
        description={t('deliveryRequests.form.isUrgentDesc')}
        color="red"
        checked={isUrgent}
        onChange={(e) => setIsUrgent(e.currentTarget.checked)}
      />

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose} disabled={saving}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!driver || !date || salesOrders.length === 0}
        >
          {t('deliveryRequests.bulkCreate.createButton', { count: salesOrders.length })}
        </Button>
      </Group>
    </Stack>
  );
}
