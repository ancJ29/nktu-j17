import { Alert, Button, Group, Modal, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DateField } from '@/components/DateField';
import { ROUTES } from '@/constants/routes';
import { issueDeliveryNoteV2 } from '@/stores/useDeliveryNoteV2Store';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { DeliveryNoteV2Type } from '@/types/delivery-note-v2';

export function IssueDeliveryNoteModal({
  opened,
  salesOrderId,
  salesOrderNumber,
  onClose,
  onIssued,
}: {
  readonly opened: boolean;
  readonly salesOrderId: string;
  readonly salesOrderNumber: string;
  readonly onClose: () => void;

  readonly onIssued?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const employees = useEmployeeStore((s) => s.items);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);

  const [deliveryType, setDeliveryType] = useState<DeliveryNoteV2Type>('internal');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [completes, setCompletes] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) void loadEmployees();
  }, [opened, loadEmployees]);

  const employeeOptions = useMemo(
    () => employees.map((employee) => ({ value: employee.id, label: employee.name })),
    [employees],
  );

  const issue = async () => {
    setSaving(true);
    try {
      const created = await issueDeliveryNoteV2({
        salesOrderId,
        deliveryType,
        ...(assignedTo ? { assignedTo } : {}),
        ...(carrier ? { carrier } : {}),
        ...(deliveryDate ? { deliveryDate } : {}),
        ...(reference ? { reference } : {}),
        ...(notes ? { notes } : {}),
        completesSalesOrder: completes,
      });
      notifications.show({
        color: 'green',
        message: t('deliveryNotesV2.notifications.issueSuccess'),
      });
      onIssued?.();
      onClose();

      void navigate(ROUTES.DELIVERY_NOTES_V2.DETAIL.replace(':id', created.id));
    } catch {
      notifications.show({ color: 'red', message: t('deliveryNotesV2.notifications.writeError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('deliveryNotesV2.issueModal.title', { orderNumber: salesOrderNumber })}
      centered
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t('deliveryNotesV2.issueModal.message')}
        </Text>
        <Select
          label={t('deliveryNotesV2.form.deliveryType')}
          data={[
            { value: 'internal', label: t('deliveryNotesV2.deliveryType.internal') },
            { value: 'external', label: t('deliveryNotesV2.deliveryType.external') },
          ]}
          value={deliveryType}
          allowDeselect={false}
          onChange={(value) => setDeliveryType(value === 'external' ? 'external' : 'internal')}
        />
        {deliveryType === 'internal' ? (
          <Select
            label={t('deliveryNotesV2.form.assignedTo')}
            data={employeeOptions}
            value={assignedTo}
            searchable
            clearable
            onChange={setAssignedTo}
          />
        ) : (
          <TextInput
            label={t('deliveryNotesV2.form.carrier')}
            value={carrier}
            onChange={(event) => setCarrier(event.currentTarget.value)}
          />
        )}
        <DateField
          label={t('deliveryNotesV2.form.deliveryDate')}
          value={deliveryDate || null}
          onChange={(value) => setDeliveryDate(value ?? '')}
        />
        <TextInput
          label={t('deliveryNotesV2.form.reference')}
          value={reference}
          onChange={(event) => setReference(event.currentTarget.value)}
        />
        <TextInput
          label={t('deliveryNotesV2.form.notes')}
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
        />
        <Switch
          checked={completes}
          onChange={(event) => setCompletes(event.currentTarget.checked)}
          label={t('deliveryNotesV2.form.completesSalesOrder')}
          description={t('deliveryNotesV2.form.completesSalesOrderHint')}
        />
        {deliveryType === 'internal' && (
          <Alert color="yellow">
            <Text size="sm">{t('deliveryNotesV2.photos.required')}</Text>
          </Alert>
        )}
        <Group justify="end">
          <Button variant="subtle" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button loading={saving} onClick={() => void issue()}>
            {t('deliveryNotesV2.form.issueButton')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
