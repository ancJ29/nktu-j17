import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { device } from '@credo/base-ui/utils';
import { FieldLabel } from '@credo/base-ui/components';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { logActivity } from '@/utils/activityLogger';
import type { Product, ProductInventoryExtra, ProductInventoryRow } from '@/types';
import { getItemBaseUnit, getItemUnits } from '@/utils/unitConversion';
import {
  type OnHandByUnit,
  applyDelta,
  applyRepack,
  readRowBreakdown,
  recomputeOnHand,
  setUnitSnapshot,
  validateRepack,
} from '@/utils/inventoryMath';
import { getCurrentActorId, lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { Form } from '@/components/Form';

export type UpdateMode = 'delta' | 'snapshot' | 'repack';

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly row: ProductInventoryRow | null;
  readonly product: Product | null;
  readonly initialMode?: UpdateMode;
  readonly contextLabel?: string;
};

type Values = {
  value: number | '';
  unit: string;

  fromUnit: string;
  fromQty: number | '';
  toUnit: string;
  toQty: number | '';
  writeOffBaseQty: number | '';
  writeOffReason: string;

  note: string;
};

export function ProductInventoryUpdateModal({
  opened,
  onClose,
  row,
  product,
  initialMode = 'delta',
  contextLabel,
}: Props) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<UpdateMode>(initialMode);

  const baseUnit = product ? getItemBaseUnit(product) : '';
  const units = useMemo(() => (product ? getItemUnits(product) : []), [product]);
  const hasMultipleUnits = units.length > 1;

  const unitLabels = useLookupV2Labels('product-unit');
  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u, label: lookupLabelOf(unitLabels, u) })),
    [units, unitLabels],
  );

  const breakdown = useMemo(
    () => (row && baseUnit ? readRowBreakdown(row, baseUnit) : {}),
    [row, baseUnit],
  );

  const form = useForm<Values>({
    initialValues: {
      value: '',
      unit: baseUnit,
      fromUnit: baseUnit,
      fromQty: '',
      toUnit: units[1] ?? baseUnit,
      toQty: '',
      writeOffBaseQty: '',
      writeOffReason: '',
      note: '',
    },
    validate: {
      value: (v) => {
        if (mode === 'repack') return null;
        if (v === '') return t('productInventory.validation.valueRequired');
        if (mode === 'delta' && v === 0) return t('productInventory.validation.deltaRequired');
        return null;
      },
      fromQty: (v) => {
        if (mode !== 'repack') return null;
        if (v === '' || v <= 0) return t('productInventory.validation.positiveRequired');
        return null;
      },
      toQty: (v) => {
        if (mode !== 'repack') return null;
        if (v === '' || v <= 0) return t('productInventory.validation.positiveRequired');
        return null;
      },
    },
  });

  useEffect(() => {
    if (!opened) return;

    setMode(initialMode);
    form.setValues({
      value: '',
      unit: baseUnit,
      fromUnit: baseUnit,
      fromQty: '',
      toUnit: units[1] ?? baseUnit,
      toQty: '',
      writeOffBaseQty: '',
      writeOffReason: '',
      note: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialMode, baseUnit]);

  useEffect(() => {
    if (!opened) return;
    form.setValues((current) => ({
      ...current,
      value: '',
      fromQty: '',
      toQty: '',
      writeOffBaseQty: '',
      writeOffReason: '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const currentOnHand = row?.onHand ?? 0;

  const inputValue = typeof form.values.value === 'number' ? form.values.value : 0;
  const selectedUnit = form.values.unit || baseUnit;

  const deltaSnapshotPreview = useMemo(() => {
    if (!product || !row || (mode !== 'delta' && mode !== 'snapshot')) return null;
    if (form.values.value === '') return null;

    if (mode === 'delta') {
      const result = applyDelta(product, breakdown, { [selectedUnit]: inputValue });
      return result;
    }
    const result = setUnitSnapshot(product, breakdown, selectedUnit, inputValue);
    return result;
  }, [product, row, mode, breakdown, selectedUnit, inputValue, form.values.value]);

  const newOnHand = deltaSnapshotPreview?.ok ? deltaSnapshotPreview.onHand : currentOnHand;
  const variance = newOnHand - currentOnHand;

  const repackOp = useMemo(() => {
    if (mode !== 'repack') return null;
    if (form.values.fromQty === '' || form.values.toQty === '') return null;
    const writeOffBase =
      form.values.writeOffBaseQty === '' ? 0 : Number(form.values.writeOffBaseQty);
    return {
      from: { unit: form.values.fromUnit, qty: Number(form.values.fromQty) },
      to: { unit: form.values.toUnit, qty: Number(form.values.toQty) },
      ...(writeOffBase > 0 && {
        writeOff: {
          baseQty: writeOffBase,
          reason: form.values.writeOffReason.trim() || 'spillage',
        },
      }),
    };
  }, [mode, form.values]);

  const repackValidation = useMemo(() => {
    if (!product || !repackOp) return null;
    return validateRepack(product, repackOp);
  }, [product, repackOp]);

  const repackApplyPreview = useMemo(() => {
    if (!product || !repackOp || !repackValidation?.ok) return null;
    return applyRepack(product, breakdown, repackOp);
  }, [product, breakdown, repackOp, repackValidation]);

  const handleSubmit = useCallback(
    async (values: Values) => {
      if (!row || !product) return;

      let nextBreakdown: OnHandByUnit | null = null;
      let nextOnHand = 0;

      if (mode === 'delta') {
        if (typeof values.value !== 'number') return;
        const result = applyDelta(product, breakdown, { [values.unit]: values.value });
        if (!result.ok) {
          notifications.show({
            color: 'red',
            message:
              result.reason === 'negative'
                ? t('productInventory.validation.insufficientStock', { unit: result.unit })
                : t('productInventory.validation.unknownUnit', { unit: result.unit }),
          });
          return;
        }
        nextBreakdown = result.onHandByUnit;
        nextOnHand = result.onHand;
      } else if (mode === 'snapshot') {
        if (typeof values.value !== 'number') return;
        const result = setUnitSnapshot(product, breakdown, values.unit, values.value);
        if (!result.ok) {
          notifications.show({ color: 'red', message: t('productInventory.validation.bad') });
          return;
        }
        nextBreakdown = result.onHandByUnit;
        nextOnHand = result.onHand;
      } else {
        if (!repackOp || !repackValidation?.ok) {
          notifications.show({
            color: 'red',
            message:
              (repackValidation && !repackValidation.ok && repackValidation.reason) ||
              t('productInventory.validation.repackInvalid'),
          });
          return;
        }
        const result = applyRepack(product, breakdown, repackOp);
        if (!result.ok) {
          notifications.show({
            color: 'red',
            message:
              result.reason === 'negative'
                ? t('productInventory.validation.insufficientStock', { unit: result.unit })
                : t('productInventory.validation.unknownUnit', { unit: result.unit }),
          });
          return;
        }
        nextBreakdown = result.onHandByUnit;
        nextOnHand = result.onHand;
      }

      setSubmitting(true);
      try {
        const noteBase =
          mode === 'repack' && repackOp?.writeOff
            ? `[repack] ${values.note.trim() || `${repackOp.from.qty} ${repackOp.from.unit} → ${repackOp.to.qty} ${repackOp.to.unit}`}`
            : values.note.trim();

        const updatedExtra: ProductInventoryExtra = {
          ...row.extra,
          onHandByUnit: nextBreakdown,
          ...(noteBase && { lastNote: noteBase }),
          lastUpdatedBy: getCurrentActorId(),
        };

        await useProductInventoryStore.getState().revalidate();

        await useProductInventoryStore.getState().updateSafely({
          id: row.id,
          version: row.version,
          patch: { onHand: nextOnHand, extra: updatedExtra },
        });

        const verb =
          mode === 'delta'
            ? 'productInventory.adjust'
            : mode === 'snapshot'
              ? 'productInventory.stockTake'
              : 'productInventory.repack';

        logActivity(verb, product.id, {
          locationCode: row.locationCode,
          prevOnHand: row.onHand,
          nextOnHand,
          delta: nextOnHand - row.onHand,
          ...(noteBase && { note: noteBase }),
        });

        notifications.show({
          color: 'green',
          message: t(
            mode === 'delta'
              ? 'productInventory.notifications.adjustSuccess'
              : mode === 'snapshot'
                ? 'productInventory.notifications.stockTakeSuccess'
                : 'productInventory.notifications.repackSuccess',
          ),
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
            message: t(
              mode === 'delta'
                ? 'productInventory.notifications.adjustError'
                : mode === 'snapshot'
                  ? 'productInventory.notifications.stockTakeError'
                  : 'productInventory.notifications.repackError',
            ),
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [row, product, breakdown, mode, repackOp, repackValidation, t, onClose],
  );

  if (!row || !product) return null;

  const repackNewOnHand = repackApplyPreview?.ok
    ? recomputeOnHand(product, repackApplyPreview.onHandByUnit) - (repackOp?.writeOff?.baseQty ?? 0)
    : currentOnHand;

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('productInventory.modal.updateTitle')}
      size="lg"
    >
      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          {contextLabel && (
            <Text size="sm" c="dimmed">
              {contextLabel}
            </Text>
          )}

          {(() => {
            const modeOptions = [
              { value: 'delta', label: t('productInventory.mode.delta') },
              { value: 'snapshot', label: t('productInventory.mode.snapshot') },
              ...(hasMultipleUnits
                ? [{ value: 'repack', label: t('productInventory.mode.repack') }]
                : []),
            ];

            return device.isMobile ? (
              <Select
                value={mode}
                onChange={(v) => v && setMode(v as UpdateMode)}
                data={modeOptions}
                allowDeselect={false}
                searchable={false}
                comboboxProps={{ withinPortal: true }}
              />
            ) : (
              <SegmentedControl
                fullWidth
                value={mode}
                onChange={(v) => setMode(v as UpdateMode)}
                data={modeOptions}
              />
            );
          })()}

          {/* Current → New preview card (shared across modes) */}
          <Card withBorder padding="md" radius="md" bg="var(--mantine-color-default-hover)">
            <Group justify="space-between" align="baseline" wrap="nowrap">
              <Stack gap={2}>
                <FieldLabel>{t('productInventory.form.currentOnHand')}</FieldLabel>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700}>
                    {currentOnHand.toLocaleString()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {lookupLabelOf(unitLabels, baseUnit)}
                  </Text>
                </Group>
              </Stack>

              {mode === 'delta' && (
                <>
                  <IconArrowRight size={20} color="var(--mantine-color-dimmed)" />
                  <Stack gap={2} align="flex-end">
                    <FieldLabel>{t('productInventory.form.newOnHand')}</FieldLabel>
                    <Group gap={4} align="baseline">
                      <Text
                        size="xl"
                        fw={700}
                        c={
                          newOnHand < 0
                            ? 'red'
                            : variance > 0
                              ? 'teal'
                              : variance < 0
                                ? 'orange'
                                : undefined
                        }
                      >
                        {newOnHand.toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {lookupLabelOf(unitLabels, baseUnit)}
                      </Text>
                    </Group>
                  </Stack>
                </>
              )}
              {mode === 'snapshot' && (
                <Stack gap={2} align="flex-end">
                  <FieldLabel>{t('productInventory.form.varianceLabel')}</FieldLabel>
                  <Badge
                    variant="light"
                    size="lg"
                    radius="sm"
                    color={variance > 0 ? 'teal' : variance < 0 ? 'orange' : 'gray'}
                  >
                    {variance > 0 ? '+' : ''}
                    {variance.toLocaleString()} {lookupLabelOf(unitLabels, baseUnit)}
                  </Badge>
                </Stack>
              )}
              {mode === 'repack' && (
                <>
                  <IconArrowRight size={20} color="var(--mantine-color-dimmed)" />
                  <Stack gap={2} align="flex-end">
                    <FieldLabel>{t('productInventory.form.newOnHand')}</FieldLabel>
                    <Group gap={4} align="baseline">
                      <Text size="xl" fw={700}>
                        {repackNewOnHand.toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {lookupLabelOf(unitLabels, baseUnit)}
                      </Text>
                    </Group>
                  </Stack>
                </>
              )}
            </Group>

            {/* Always-on breakdown display */}
            {hasMultipleUnits && Object.keys(breakdown).length > 0 && (
              <>
                <Divider my="sm" />
                <Group gap={6} wrap="wrap">
                  {Object.entries(breakdown).map(([u, q]) => (
                    <Badge key={u} variant="light" color="gray" size="sm" radius="sm" tt="none">
                      {q.toLocaleString()} {lookupLabelOf(unitLabels, u)}
                    </Badge>
                  ))}
                </Group>
              </>
            )}
          </Card>

          {/* Delta + Snapshot form */}
          {(mode === 'delta' || mode === 'snapshot') && (
            <>
              <Group gap="sm" grow wrap="nowrap">
                <NumberInput
                  label={t(
                    mode === 'delta'
                      ? 'productInventory.form.deltaLabel'
                      : 'productInventory.form.newOnHandLabel',
                  )}
                  placeholder={
                    mode === 'delta' ? t('productInventory.form.deltaPlaceholder') : undefined
                  }
                  withAsterisk
                  allowNegative={mode === 'delta'}
                  min={mode === 'snapshot' ? 0 : undefined}
                  thousandSeparator=","
                  leftSection={
                    mode === 'delta' ? (
                      inputValue > 0 ? (
                        <IconArrowUp size={14} color="var(--mantine-color-teal-6)" />
                      ) : inputValue < 0 ? (
                        <IconArrowDown size={14} color="var(--mantine-color-orange-6)" />
                      ) : null
                    ) : null
                  }
                  style={{ flex: 2 }}
                  {...form.getInputProps('value')}
                />
                {hasMultipleUnits ? (
                  <Select
                    label={t('common.labels.unit')}
                    data={unitOptions}
                    allowDeselect={false}
                    style={{ flex: 1 }}
                    {...form.getInputProps('unit')}
                  />
                ) : (
                  <Stack gap={4} style={{ flex: 1 }} justify="flex-end" pb={1}>
                    <Text size="sm" fw={500}>
                      {t('common.labels.unit')}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {lookupLabelOf(unitLabels, baseUnit)}
                    </Text>
                  </Stack>
                )}
              </Group>

              {deltaSnapshotPreview && !deltaSnapshotPreview.ok && (
                <Alert color="red" variant="light">
                  <Text size="xs">
                    {deltaSnapshotPreview.reason === 'negative' &&
                      t('productInventory.validation.insufficientStock', {
                        unit: deltaSnapshotPreview.unit,
                      })}
                    {deltaSnapshotPreview.reason === 'unknown-unit' &&
                      t('productInventory.validation.unknownUnit', {
                        unit: deltaSnapshotPreview.unit,
                      })}
                  </Text>
                </Alert>
              )}
            </>
          )}

          {/* Repack form */}
          {mode === 'repack' && (
            <Stack gap="sm">
              <Group gap="sm" grow wrap="nowrap">
                <NumberInput
                  label={t('productInventory.repack.fromQtyLabel')}
                  withAsterisk
                  min={0}
                  thousandSeparator=","
                  style={{ flex: 2 }}
                  {...form.getInputProps('fromQty')}
                />
                <Select
                  label={t('productInventory.repack.fromUnitLabel')}
                  data={unitOptions}
                  allowDeselect={false}
                  style={{ flex: 1 }}
                  {...form.getInputProps('fromUnit')}
                />
              </Group>

              <Group justify="center">
                <IconArrowDown size={18} color="var(--mantine-color-dimmed)" />
              </Group>

              <Group gap="sm" grow wrap="nowrap">
                <NumberInput
                  label={t('productInventory.repack.toQtyLabel')}
                  withAsterisk
                  min={0}
                  thousandSeparator=","
                  style={{ flex: 2 }}
                  {...form.getInputProps('toQty')}
                />
                <Select
                  label={t('productInventory.repack.toUnitLabel')}
                  data={unitOptions}
                  allowDeselect={false}
                  style={{ flex: 1 }}
                  {...form.getInputProps('toUnit')}
                />
              </Group>

              <Divider my={1} label={t('productInventory.repack.writeOffOptional')} />

              <Group gap="sm" grow wrap="nowrap">
                <NumberInput
                  label={t('productInventory.repack.writeOffQtyLabel', { unit: baseUnit })}
                  min={0}
                  thousandSeparator=","
                  style={{ flex: 1 }}
                  {...form.getInputProps('writeOffBaseQty')}
                />
                <Select
                  label={t('productInventory.repack.writeOffReasonLabel')}
                  data={[
                    { value: 'spillage', label: t('productInventory.repack.reason.spillage') },
                    { value: 'breakage', label: t('productInventory.repack.reason.breakage') },
                    { value: 'damage', label: t('productInventory.repack.reason.damage') },
                    { value: 'other', label: t('productInventory.repack.reason.other') },
                  ]}
                  clearable
                  style={{ flex: 1 }}
                  {...form.getInputProps('writeOffReason')}
                />
              </Group>
              <Text size="xs" c="dimmed" fs="italic">
                ※ {t('productInventory.repack.writeOffHint')}
              </Text>

              {repackValidation && !repackValidation.ok && (
                <Alert color="orange" variant="light" icon={<IconSwitchHorizontal size={16} />}>
                  <Text size="xs">{repackValidation.reason}</Text>
                </Alert>
              )}
              {repackValidation?.ok && (
                <Alert color="teal" variant="light">
                  <Text size="xs">{t('productInventory.repack.balanced')}</Text>
                </Alert>
              )}
            </Stack>
          )}

          {/* Back-order warning (delta/snapshot only) */}
          {(mode === 'delta' || mode === 'snapshot') &&
            newOnHand < 0 &&
            deltaSnapshotPreview?.ok && (
              <Alert color="orange" variant="light">
                <Group gap={6}>
                  <Badge size="xs" variant="filled" color="orange" radius="sm">
                    back-order
                  </Badge>
                  <Text size="xs">{t('productInventory.form.backOrderWarning')}</Text>
                </Group>
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

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={submitting} onClick={onClose}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={
                (mode === 'delta' || mode === 'snapshot') &&
                deltaSnapshotPreview !== null &&
                !deltaSnapshotPreview.ok
                  ? true
                  : mode === 'repack' && repackValidation !== null && !repackValidation.ok
              }
            >
              {t(
                mode === 'delta'
                  ? 'productInventory.form.submitAdjust'
                  : mode === 'snapshot'
                    ? 'productInventory.form.submitStockTake'
                    : 'productInventory.form.submitRepack',
              )}
            </Button>
          </Group>
        </Stack>
      </Form>
    </ResponsiveModal>
  );
}
