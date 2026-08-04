import { Button, Group, NumberInput, Select, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { isListVersionConflict } from '@/utils/listVersionConflict';
import { logActivity } from '@/utils/activityLogger';
import { recomputeOnHand } from '@/utils/inventoryMath';
import { materialHasMultipleUnits, materialToPackagingItem } from '@/utils/materialPackaging';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import type { Material } from '@/types';
import { Form } from '@/components/Form';

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly available: Material[];

  readonly fixedMaterial?: Material;
};

type Values = { itemCode: string; onHand: number | ''; unit: string };

export function MaterialInventoryFormModal({ opened, onClose, available, fixedMaterial }: Props) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());

  const materialOptions = useMemo(
    () => available.map((m) => ({ value: m.code, label: `${m.name} (${m.code})` })),
    [available],
  );

  const form = useForm<Values>({
    initialValues: { itemCode: fixedMaterial?.code ?? '', onHand: '', unit: '' },
    validate: {
      itemCode: (v) => (v ? null : t('materialInventory.validation.materialRequired')),
      onHand: (v) => (v === '' ? t('materialInventory.validation.onHandRequired') : null),
    },
  });

  useEffect(() => {
    if (opened) form.setValues({ itemCode: fixedMaterial?.code ?? '', onHand: '', unit: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const picked = useMemo(
    () => fixedMaterial ?? available.find((m) => m.code === form.values.itemCode) ?? null,
    [available, fixedMaterial, form.values.itemCode],
  );
  const multiUnit = materialHasMultipleUnits(picked);
  const units = picked?.extra?.units ?? [];

  useEffect(() => {
    if (multiUnit) form.setFieldValue('unit', units[0] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.itemCode, multiUnit]);

  const handleSubmit = async (values: Values) => {
    setSubmitting(true);
    try {
      const qty = Number(values.onHand);
      let patch: {
        itemCode: string;
        onHand: number;
        extra?: { onHandByUnit: Record<string, number> };
      };
      if (multiUnit && picked && values.unit) {
        const onHandByUnit = { [values.unit]: qty };
        patch = {
          itemCode: values.itemCode,
          onHand: recomputeOnHand(materialToPackagingItem(picked), onHandByUnit),
          extra: { onHandByUnit },
        };
      } else {
        patch = { itemCode: values.itemCode, onHand: qty };
      }
      await useMaterialInventoryStore.getState().createSafely({ patch });
      if (picked) logActivity('materialInventory.create', picked.id, { onHand: patch.onHand });
      notifications.show({
        color: 'green',
        message: t('materialInventory.notifications.createSuccess'),
      });
      onClose();
    } catch (err) {
      notifications.show({
        color: isListVersionConflict(err) ? 'yellow' : 'red',
        message: t('materialInventory.notifications.createError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('materialInventory.modal.createTitle')}
      size="md"
    >
      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          {fixedMaterial ? (
            <Text size="sm" fw={500}>
              {fixedMaterial.name}
            </Text>
          ) : (
            <Select
              label={t('materialInventory.form.materialLabel')}
              placeholder={t('materialInventory.form.materialPlaceholder')}
              data={materialOptions}
              searchable
              withAsterisk
              comboboxProps={{ withinPortal: true }}
              {...form.getInputProps('itemCode')}
            />
          )}
          <Group gap="sm" grow wrap="nowrap" align="flex-end">
            <NumberInput
              label={t('materialInventory.form.onHandLabel')}
              withAsterisk
              min={0}
              thousandSeparator=","
              style={{ flex: 2 }}
              {...form.getInputProps('onHand')}
            />
            {multiUnit && (
              <Select
                label={t('common.labels.unit')}
                data={units.map((u) => ({ value: u, label: lookupLabelOf(unitLabels, u, u) }))}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                style={{ flex: 1 }}
                {...form.getInputProps('unit')}
              />
            )}
          </Group>
          {multiUnit && (
            <Text size="xs" c="dimmed">
              {t('materialInventory.form.multiUnitInitialHint')}
            </Text>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={submitting} onClick={onClose}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" size="sm" loading={submitting}>
              {t('__new__.01-common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Form>
    </ResponsiveModal>
  );
}
