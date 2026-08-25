import { Button, Group, NumberInput, Select, Stack, Text, Textarea } from '@mantine/core';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSwitchHorizontal } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import type { Location, Product, ProductInventoryExtra, ProductInventoryRow } from '@/types';
import { DEFAULT_LOCATION_CODE } from '@/types';
import { convertUnit, getItemBaseUnit, getItemUnits } from '@/utils/unitConversion';
import { getCurrentActorId, lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { isLocationsEnabled } from '@/utils/permission';
import { logActivity } from '@/utils/activityLogger';
import { Form } from '@/components/Form';

const locationsEnabled = isLocationsEnabled();

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly existingRows: readonly ProductInventoryRow[];

  readonly product?: Product;
};

type Values = {
  productId: string;
  locationId: string;
  onHand: number | '';
  unit: string;
  note: string;
};

export function ProductInventoryFormModal({
  opened,
  onClose,
  existingRows,
  product: fixedProduct,
}: Props) {
  const { t } = useTranslation();
  const productPickerHidden = !!fixedProduct;
  const products = useProductStore((s) => s.items);
  const locations = useLocationStore((s) => s.items);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    initialValues: {
      productId: fixedProduct?.id ?? '',
      locationId: '',
      onHand: 0,
      unit: '',
      note: '',
    },
    validate: {
      productId: (v) =>
        productPickerHidden || v ? null : t('productInventory.validation.productRequired'),

      onHand: (v) => (v === '' ? t('productInventory.validation.onHandRequired') : null),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.reset();

    if (fixedProduct) form.setFieldValue('productId', fixedProduct.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, fixedProduct?.id]);

  const selectedProduct =
    fixedProduct ?? (products.find((p) => p.id === form.values.productId) as Product | undefined);
  const selectedLocation = locations.find((l) => l.id === form.values.locationId) as
    Location | undefined;

  const baseUnit = selectedProduct ? getItemBaseUnit(selectedProduct) : '';
  const units = useMemo(
    () => (selectedProduct ? getItemUnits(selectedProduct) : []),
    [selectedProduct],
  );
  const hasMultipleUnits = units.length > 1;
  const conversions = useMemo(
    () => selectedProduct?.extra?.unitConversions ?? [],
    [selectedProduct],
  );

  const unitLabels = useLookupV2Labels('unit');
  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u, label: lookupLabelOf(unitLabels, u) })),
    [units, unitLabels],
  );

  useEffect(() => {
    if (baseUnit) form.setFieldValue('unit', baseUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUnit]);

  const selectedUnit = form.values.unit || baseUnit;
  const inputOnHand = typeof form.values.onHand === 'number' ? form.values.onHand : 0;

  const onHandInBase = useMemo(() => {
    if (!selectedUnit || selectedUnit === baseUnit) return inputOnHand;
    return convertUnit(inputOnHand, selectedUnit, baseUnit, conversions);
  }, [inputOnHand, selectedUnit, baseUnit, conversions]);

  const conversionValid = onHandInBase !== null;
  const showConversionHint =
    hasMultipleUnits && selectedUnit !== baseUnit && conversionValid && inputOnHand !== 0;

  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.isActive)
        .map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
    [products],
  );
  const locationOptions = useMemo(
    () =>
      locations
        .filter((l) => l.isActive)
        .map((l) => ({ value: l.id, label: `${l.name} (${l.code})` })),
    [locations],
  );

  const handleSubmit = useCallback(
    async (values: Values) => {
      if (!selectedProduct || typeof values.onHand !== 'number') return;

      const locationCode = selectedLocation?.code ?? DEFAULT_LOCATION_CODE;

      const dupe = existingRows.some(
        (r) =>
          r.itemCode === selectedProduct.code &&
          r.locationCode === locationCode &&
          !r.extra?.isDeleted,
      );
      if (dupe) {
        notifications.show({
          color: 'orange',
          message: t('productInventory.notifications.duplicatePair'),
        });
        return;
      }

      const converted =
        values.unit === baseUnit || !values.unit
          ? values.onHand
          : convertUnit(values.onHand, values.unit, baseUnit, conversions);

      if (converted === null) {
        notifications.show({
          color: 'red',
          message: t('productInventory.notifications.conversionError'),
        });
        return;
      }

      setSubmitting(true);
      try {
        const entryUnit = values.unit || baseUnit;
        const onHandByUnit = values.onHand > 0 ? { [entryUnit]: values.onHand } : {};
        const extra: ProductInventoryExtra = {
          ...(values.note.trim() && { lastNote: values.note.trim() }),
          lastUpdatedBy: getCurrentActorId(),
          unit: baseUnit,
          onHandByUnit,
        };

        await useProductInventoryStore.getState().revalidate();

        await useProductInventoryStore.getState().createSafely({
          patch: {
            itemCode: selectedProduct.code,
            locationCode,
            onHand: converted,
            extra,
          },
        });

        const seedNote = values.note.trim();
        logActivity('productInventory.create', selectedProduct.id, {
          locationCode,
          onHand: converted,
          ...(seedNote && { note: seedNote }),
        });
        notifications.show({
          color: 'green',
          message: t('productInventory.notifications.createSuccess'),
        });
        onClose();
      } catch (err) {
        if (err instanceof EntityConflictError) {
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('productInventory.notifications.createError'),
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [selectedProduct, selectedLocation, existingRows, baseUnit, conversions, t, onClose],
  );

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('productInventory.modal.createTitle')}
    >
      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          {!productPickerHidden && (
            <Select
              label={t('common.labels.product')}
              placeholder={t('productInventory.form.productPlaceholder')}
              data={productOptions}
              searchable
              withAsterisk
              {...form.getInputProps('productId')}
            />
          )}
          {locationsEnabled && (
            <Select
              label={t('common.labels.location')}
              placeholder={t('productInventory.form.locationPlaceholder')}
              description={t('common.labels.defaultLocation')}
              data={locationOptions}
              searchable
              clearable
              {...form.getInputProps('locationId')}
            />
          )}

          {/* On-hand + unit selector */}
          <Group gap="sm" grow wrap="nowrap">
            <NumberInput
              label={t('productInventory.form.onHandLabel')}
              min={0}
              allowNegative
              thousandSeparator=","
              withAsterisk
              style={{ flex: 2 }}
              {...form.getInputProps('onHand')}
            />
            {hasMultipleUnits ? (
              <Select
                label={t('common.labels.unit')}
                data={unitOptions}
                allowDeselect={false}
                style={{ flex: 1 }}
                {...form.getInputProps('unit')}
              />
            ) : baseUnit ? (
              <Stack gap={4} style={{ flex: 1 }} justify="flex-end" pb={1}>
                <Text size="sm" fw={500}>
                  {t('common.labels.unit')}
                </Text>
                <Text size="sm" c="dimmed">
                  {lookupLabelOf(unitLabels, baseUnit)}
                </Text>
              </Stack>
            ) : null}
          </Group>

          {/* Conversion hint */}
          {showConversionHint && (
            <Group gap={6}>
              <IconSwitchHorizontal size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">
                {inputOnHand.toLocaleString()} {lookupLabelOf(unitLabels, selectedUnit)} ={' '}
                {onHandInBase!.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                {lookupLabelOf(unitLabels, baseUnit)}
              </Text>
            </Group>
          )}

          {/* No conversion path warning */}
          {hasMultipleUnits && selectedUnit !== baseUnit && !conversionValid && (
            <Text size="xs" c="orange">
              {t('productInventory.validation.noConversionPath')}
            </Text>
          )}

          <Textarea
            label={t('productInventory.form.noteLabel')}
            placeholder={t('productInventory.form.notePlaceholder')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('note')}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={submitting} onClick={onClose}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={hasMultipleUnits && selectedUnit !== baseUnit && !conversionValid}
            >
              {t('__new__.01-common.actions.addEntry')}
            </Button>
          </Group>
        </Stack>
      </Form>
    </ResponsiveModal>
  );
}
