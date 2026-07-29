import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { DateField } from '@/components/DateField';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconInfoCircle } from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { EmployeeSelector } from '@/components/selectors';
import { useRowSelection } from '@/hooks/useRowSelection';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import {
  getDeliveryRequestDriverDepartments,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { bulkCreateOutboundDeliveryRequests } from '@/pages/delivery-requests/bulkCreateDeliveryRequests';
import type { Customer, SalesOrder } from '@/types';

const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());

type StatusMeta = { label: string; color: string };

type BulkCreateDeliveryRequestModalProps = {
  opened: boolean;
  onClose: () => void;

  salesOrders: SalesOrder[];
  getCustomerByCode: (code: string) => Customer | undefined;
  resolveStatus: (value: string) => StatusMeta;
  t: TFunction;
};

export function BulkCreateDeliveryRequestModal({
  opened,
  onClose,
  salesOrders,
  getCustomerByCode,
  resolveStatus,
  t,
}: BulkCreateDeliveryRequestModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryRequests.bulkCreate.title')}
      size="lg"
    >
      {opened ? (
        <BulkForm
          onClose={onClose}
          salesOrders={salesOrders}
          getCustomerByCode={getCustomerByCode}
          resolveStatus={resolveStatus}
          t={t}
        />
      ) : null}
    </Modal>
  );
}

type BulkFormProps = Omit<BulkCreateDeliveryRequestModalProps, 'opened'>;

function BulkForm({ onClose, salesOrders, getCustomerByCode, resolveStatus, t }: BulkFormProps) {
  const employees = useEmployeeStore((s) => s.items);

  const [driverId, setDriverId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);

  const selection = useRowSelection();
  const { selectedKeys: selectedIds, toggle: toggleOne } = selection;
  const [saving, setSaving] = useState(false);

  const driver = useMemo(
    () => (driverId ? (employees.find((e) => e.id === driverId) ?? null) : null),
    [driverId, employees],
  );

  const candidateIds = useMemo(() => salesOrders.map((o) => o.id), [salesOrders]);
  const { allSelected, someSelected } = selection.headerState(candidateIds);
  const toggleAll = useCallback(
    () => selection.toggleAllIn(candidateIds),
    [selection, candidateIds],
  );

  const handleSave = useCallback(async () => {
    if (!driver || selectedIds.size === 0) return;
    const selected = salesOrders.filter((o) => selectedIds.has(o.id));
    setSaving(true);
    try {
      const { created, failures, linkFailures } = await bulkCreateOutboundDeliveryRequests({
        salesOrders: selected,
        driver,
        scheduledDate: date,
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
  }, [driver, selectedIds, salesOrders, date, getCustomerByCode, t, onClose]);

  return (
    <Stack gap="md">
      <Group grow align="flex-start">
        <EmployeeSelector
          label={t('deliveryRequests.bulkCreate.driverLabel')}
          placeholder={t('deliveryRequests.bulkCreate.driverPlaceholder')}
          clearable
          filter={driverEmployeeFilter}
          value={driverId}
          onChange={(sel) => setDriverId(sel?.id ?? null)}
        />
        <DateField
          futureOnly
          label={t('deliveryRequests.bulkCreate.dateLabel')}
          placeholder={t('deliveryRequests.bulkCreate.datePlaceholder')}
          leftSection={<IconCalendar size={16} />}
          clearable
          value={date}
          onChange={(v) => setDate(typeof v === 'string' ? (v ? new Date(v) : null) : v)}
        />
      </Group>

      {salesOrders.length === 0 ? (
        <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
          {t('deliveryRequests.bulkCreate.noOrders')}
        </Alert>
      ) : (
        <Stack gap="xs">
          <Group justify="space-between">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleAll}
              label={t('deliveryRequests.bulkCreate.selectAll')}
            />
            <Text size="xs" c="dimmed">
              {t('deliveryRequests.bulkCreate.selectedCount', { count: selectedIds.size })}
            </Text>
          </Group>
          <ScrollArea.Autosize mah={360}>
            <Stack gap={4}>
              {salesOrders.map((so) => {
                const checked = selectedIds.has(so.id);
                const customer = resolveSalesOrderCustomerName(so, getCustomerByCode);
                const status = so.extra?.status ? resolveStatus(so.extra.status) : null;
                return (
                  <Group
                    key={so.id}
                    gap="sm"
                    wrap="nowrap"
                    p="xs"
                    onClick={() => toggleOne(so.id)}
                    style={{
                      borderRadius: 'var(--mantine-radius-sm)',
                      border: '1px solid var(--mantine-color-default-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <Checkbox
                      checked={checked}
                      onChange={() => toggleOne(so.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {so.orderNumber}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {customer || '—'}
                      </Text>
                    </Box>
                    {status ? (
                      <Badge color={status.color} variant="light" size="xs">
                        {status.label}
                      </Badge>
                    ) : null}
                  </Group>
                );
              })}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      )}

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose} disabled={saving}>
          {t('__new__.01-common.actions.cancel')}
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={!driver || selectedIds.size === 0}>
          {t('deliveryRequests.bulkCreate.createButton', { count: selectedIds.size })}
        </Button>
      </Group>
    </Stack>
  );
}
