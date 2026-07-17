import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { ProductSelector, type ProductSelectorChange } from '@/components/selectors';
import { FieldLabel } from '@credo/base-ui/components';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowRight } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { logActivity } from '@/utils/activityLogger';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types';
import type { ProductInventoryExtra, ProductInventoryRow } from '@/types';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { applyDelta, readRowBreakdown } from '@/utils/inventoryMath';
import { getBeginOfPeriodValue, getCurrentPeriodKey } from '@/utils/inventoryPeriod';
import { type BeginOfPeriodMode, computeBeginOfPeriodChange } from '@/utils/inventoryBeginOfPeriod';
import { getCurrentActorId, lookupLabelOf, useLookupLabels } from '@/hooks';

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;
  
  readonly rows: readonly ProductInventoryRow[];
};

type Values = {
  value: number | '';
  note: string;
};

function formatPeriod(key: string): string {
  return key.length === 6 ? `${key.slice(0, 4)}-${key.slice(4)}` : key;
}

export function ProductInventoryBeginOfPeriodModal({ opened, onClose, rows }: Props) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<BeginOfPeriodMode>('snapshot');
  const [picked, setPicked] = useState<ProductSelectorChange | null>(null);

  const unitLabels = useLookupLabels('unit');
  const periodKey = getCurrentPeriodKey();

  const selectedProduct = picked?.product ?? null;
  
  const selectedRow = useMemo(() => {
    if (!selectedProduct) return null;
    return (
      rows.find(
        (r) =>
          r.itemCode === selectedProduct.code &&
          isDefaultLocation(r.locationCode) &&
          !r.extra?.isDeleted,
      ) ?? null
    );
  }, [rows, selectedProduct]);

  const baseUnit = selectedProduct ? getItemBaseUnit(selectedProduct) : '';
  const baseUnitLabel = lookupLabelOf(unitLabels, baseUnit);
  const currentOnHand = selectedRow?.onHand ?? 0;
  
  
  const oldBegin = getBeginOfPeriodValue(selectedRow?.extra, periodKey) ?? currentOnHand;

  const form = useForm<Values>({
    initialValues: { value: '', note: '' },
    validate: {
      value: (v) => {
        if (v === '') return t('productInventory.validation.valueRequired');
        if (mode === 'delta' && v === 0) return t('productInventory.validation.deltaRequired');
        return null;
      },
    },
  });

  
  useEffect(() => {
    if (!opened) return;
    
    setMode('snapshot');
    setPicked(null);
    form.setValues({ value: '', note: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  
  
  useEffect(() => {
    if (!opened) return;
    form.setValues((c) => ({ ...c, value: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, picked?.code]);

  const inputValue = typeof form.values.value === 'number' ? form.values.value : null;
  const change = useMemo(
    () =>
      inputValue === null
        ? null
        : computeBeginOfPeriodChange({ mode, value: inputValue, oldBegin }),
    [inputValue, mode, oldBegin],
  );
  const nextBegin = change?.nextBegin ?? oldBegin;
  const nextOnHand = currentOnHand + (change?.delta ?? 0);
  const beginInvalid = change !== null && nextBegin < 0;

  const handleSubmit = useCallback(
    async (values: Values) => {
      if (!selectedProduct || typeof values.value !== 'number') return;
      const result = computeBeginOfPeriodChange({ mode, value: values.value, oldBegin });
      if (result.nextBegin < 0) {
        notifications.show({ color: 'red', message: t('productInventory.beginOfPeriod.negative') });
        return;
      }

      
      
      const breakdown = selectedRow ? readRowBreakdown(selectedRow, baseUnit) : {};
      let nextBreakdown = breakdown;
      let resolvedOnHand = currentOnHand;
      if (result.delta !== 0) {
        const applied = applyDelta(selectedProduct, breakdown, { [baseUnit]: result.delta });
        if (!applied.ok) {
          notifications.show({
            color: 'red',
            message:
              applied.reason === 'negative'
                ? t('productInventory.validation.insufficientStock', { unit: applied.unit })
                : t('productInventory.validation.unknownUnit', { unit: applied.unit }),
          });
          return;
        }
        nextBreakdown = applied.onHandByUnit;
        resolvedOnHand = applied.onHand;
      }

      const note = values.note.trim();
      const updatedExtra: ProductInventoryExtra = {
        ...(selectedRow?.extra ?? {}),
        unit: baseUnit,
        onHandByUnit: nextBreakdown,
        beginOfPeriod: {
          ...(selectedRow?.extra?.beginOfPeriod ?? {}),
          [periodKey]: result.nextBegin,
        },
        ...(note && { lastNote: note }),
        lastUpdatedBy: getCurrentActorId(),
      };

      setSubmitting(true);
      try {
        
        await useProductInventoryStore.getState().revalidate();

        if (selectedRow) {
          await useProductInventoryStore.getState().updateSafely({
            id: selectedRow.id,
            version: selectedRow.version,
            patch: { onHand: resolvedOnHand, extra: updatedExtra },
          });
        } else {
          await useProductInventoryStore.getState().createSafely({
            patch: {
              itemCode: selectedProduct.code,
              locationCode: DEFAULT_LOCATION_CODE,
              onHand: resolvedOnHand,
              extra: updatedExtra,
            },
          });
        }

        logActivity('productInventory.beginOfPeriod', selectedProduct.id, {
          locationCode: selectedRow?.locationCode ?? DEFAULT_LOCATION_CODE,
          periodKey,
          prevBegin: oldBegin,
          nextBegin: result.nextBegin,
          prevOnHand: currentOnHand,
          nextOnHand: resolvedOnHand,
          delta: result.delta,
          ...(note && { note }),
        });

        notifications.show({
          color: 'green',
          message: t('productInventory.beginOfPeriod.saved'),
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
          onClose();
        } else {
          notifications.show({
            color: 'red',
            message: t('productInventory.beginOfPeriod.error'),
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [selectedProduct, selectedRow, baseUnit, mode, oldBegin, currentOnHand, periodKey, t, onClose],
  );

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('productInventory.beginOfPeriod.title', { period: formatPeriod(periodKey) })}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <ProductSelector
            label={t('common.labels.product')}
            placeholder={t('productInventory.form.productPlaceholder')}
            code={picked?.code ?? null}
            name={picked?.name ?? null}
            onChange={setPicked}
            filter={(p) => !p.extra?.isDeleted && p.isActive}
            withAsterisk
            comboboxProps={{ withinPortal: true }}
          />

          {selectedProduct && (
            <>
              <SegmentedControl
                fullWidth
                value={mode}
                onChange={(v) => setMode(v as BeginOfPeriodMode)}
                data={[
                  { value: 'snapshot', label: t('productInventory.beginOfPeriod.modeSnapshot') },
                  { value: 'delta', label: t('productInventory.beginOfPeriod.modeDelta') },
                ]}
              />

              {/* Begin-of-period preview: current → new */}
              <Card withBorder padding="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Group justify="space-between" align="baseline" wrap="nowrap">
                  <Stack gap={2}>
                    <FieldLabel>{t('productInventory.beginOfPeriod.currentBegin')}</FieldLabel>
                    <Group gap={4} align="baseline">
                      <Text size="xl" fw={700}>
                        {oldBegin.toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {baseUnitLabel}
                      </Text>
                    </Group>
                  </Stack>
                  <IconArrowRight size={20} color="var(--mantine-color-dimmed)" />
                  <Stack gap={2} align="flex-end">
                    <FieldLabel>{t('productInventory.beginOfPeriod.newBegin')}</FieldLabel>
                    <Group gap={4} align="baseline">
                      <Text size="xl" fw={700} c={beginInvalid ? 'red' : undefined}>
                        {nextBegin.toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {baseUnitLabel}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
              </Card>

              <NumberInput
                label={t(
                  mode === 'snapshot'
                    ? 'productInventory.beginOfPeriod.snapshotLabel'
                    : 'productInventory.beginOfPeriod.deltaLabel',
                )}
                placeholder={
                  mode === 'delta' ? t('productInventory.form.deltaPlaceholder') : undefined
                }
                withAsterisk
                allowNegative={mode === 'delta'}
                min={mode === 'snapshot' ? 0 : undefined}
                thousandSeparator=","
                {...form.getInputProps('value')}
              />

              {/* On-hand effect — the same change flows into current stock. */}
              {change !== null && change.delta !== 0 && (
                <Group gap={6} align="baseline">
                  <Text size="sm" c="dimmed">
                    {t('productInventory.form.currentOnHand')}:
                  </Text>
                  <Text size="sm" fw={600}>
                    {currentOnHand.toLocaleString()}
                  </Text>
                  <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={700} c={nextOnHand < 0 ? 'red' : 'teal'}>
                    {nextOnHand.toLocaleString()} {baseUnitLabel}
                  </Text>
                  <Badge
                    variant="light"
                    size="sm"
                    radius="sm"
                    color={change.delta > 0 ? 'teal' : 'orange'}
                  >
                    {change.delta > 0 ? '+' : ''}
                    {change.delta.toLocaleString()}
                  </Badge>
                </Group>
              )}

              {beginInvalid && (
                <Alert color="red" variant="light">
                  <Text size="xs">{t('productInventory.beginOfPeriod.negative')}</Text>
                </Alert>
              )}

              <Textarea
                label={t('productInventory.form.noteLabel')}
                placeholder={t('productInventory.form.notePlaceholder')}
                autosize
                minRows={2}
                maxRows={4}
                {...form.getInputProps('note')}
              />
            </>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={submitting} onClick={onClose}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={!selectedProduct || beginInvalid}
            >
              {t('__new__.01-common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  );
}
