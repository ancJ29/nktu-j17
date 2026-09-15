import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { updateDeliveryNoteV2 } from '@/stores/useDeliveryNoteV2Store';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { DeliveryNoteV2, DeliveryNoteV2Type } from '@/types/delivery-note-v2';

type EditProps = {
  readonly note: DeliveryNoteV2;
  readonly day: string;
  readonly onClose: () => void;

  readonly onSaved: (next: DeliveryNoteV2) => void;
};

export function DeliveryNoteV2EditModal({
  opened,
  note,
  ...rest
}: EditProps & { readonly opened: boolean }) {
  const { t } = useTranslation();
  return (
    <Modal
      opened={opened}
      onClose={rest.onClose}

      title={`${t('deliveryNotesV2.editItem')} · ${note.noteNumber}`}
      centered
      size="lg"
    >
      {opened && <EditForm key={note.version} note={note} {...rest} />}
    </Modal>
  );
}

function EditForm({ note, day, onClose, onSaved }: EditProps) {
  const { t } = useTranslation();
  const employees = useEmployeeStore((s) => s.items);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);

  const lineKey = (line: DeliveryNoteV2['items'][number]) => `${line.itemType}:${line.itemId}`;

  const [deliveryType, setDeliveryType] = useState<DeliveryNoteV2Type>(note.deliveryType);
  const [assignedTo, setAssignedTo] = useState<string | null>(note.assignedTo ?? null);
  const [carrier, setCarrier] = useState(note.carrier ?? '');
  const [deliveryDate, setDeliveryDate] = useState(note.deliveryDate ?? '');
  const [reference, setReference] = useState(note.reference ?? '');
  const [notes, setNotes] = useState(note.notes ?? '');
  const [completes, setCompletes] = useState(note.completesSalesOrder);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(note.items.map((line) => [lineKey(line), line.quantity])),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const linesFrozen = note.items.some((line) => line.reducedQuantity > 0);

  const employeeOptions = useMemo(
    () => employees.map((employee) => ({ value: employee.id, label: employee.name })),
    [employees],
  );

  const invalid = !linesFrozen && note.items.some((line) => (quantities[lineKey(line)] ?? 0) <= 0);

  const save = async () => {
    setSaving(true);
    try {
      const next = await updateDeliveryNoteV2(note, day, {
        deliveryType,
        assignedTo: deliveryType === 'internal' ? (assignedTo ?? null) : null,
        carrier: deliveryType === 'external' ? carrier : '',
        deliveryDate,
        reference,
        notes,
        completesSalesOrder: completes,
        ...(linesFrozen
          ? {}
          : {
              items: note.items.map((line) => ({
                itemType: line.itemType,
                itemId: line.itemId,
                quantity: quantities[lineKey(line)] ?? line.quantity,
                ...(line.note ? { note: line.note } : {}),
              })),
            }),
      });
      notifications.show({
        color: 'green',
        message: t('deliveryNotesV2.notifications.updateSuccess'),
      });
      onSaved(next);
    } catch {
      notifications.show({ color: 'red', message: t('deliveryNotesV2.notifications.writeError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="sm">
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

      <Text fw={600} size="sm">
        {t('deliveryNotesV2.form.lines')}
      </Text>
      {linesFrozen ? (
        <Alert color="yellow">
          <Text size="sm">{t('deliveryNotesV2.reduceModal.message')}</Text>
        </Alert>
      ) : (
        <Table>
          <Table.Tbody>
            {note.items.map((line) => (
              <Table.Tr key={lineKey(line)}>
                <Table.Td>{line.itemName || line.itemCode}</Table.Td>
                <Table.Td w={160}>
                  <NumberInput
                    value={quantities[lineKey(line)] ?? line.quantity}
                    min={0}
                    error={
                      (quantities[lineKey(line)] ?? 0) <= 0
                        ? t('deliveryNotesV2.validation.quantityPositive')
                        : undefined
                    }
                    onChange={(value) =>
                      setQuantities((current) => ({
                        ...current,
                        [lineKey(line)]: typeof value === 'number' ? value : 0,
                      }))
                    }
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Group justify="end">
        <Button variant="subtle" onClick={onClose}>
          {t('common.actions.cancel')}
        </Button>
        <Button loading={saving} disabled={invalid} onClick={() => void save()}>
          {t('deliveryNotesV2.form.updateButton')}
        </Button>
      </Group>
    </Stack>
  );
}
