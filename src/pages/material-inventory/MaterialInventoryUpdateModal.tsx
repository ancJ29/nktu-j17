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
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconSwitchHorizontal,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { device } from '@credo/base-ui/utils';
import { FieldLabel } from '@credo/base-ui/components';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import {
  type OnHandByUnit,
  applyDelta,
  applyRepack,
  readRowBreakdown,
  recomputeOnHand,
  setUnitSnapshot,
  validateRepack,
} from '@/utils/inventoryMath';
import { materialHasMultipleUnits, materialToPackagingItem } from '@/utils/materialPackaging';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { logActivity } from '@/utils/activityLogger';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import type { Material, MaterialInventoryExtra, MaterialInventoryRow } from '@/types';

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly row: MaterialInventoryRow | null;
  
  readonly material: Material | null;
  readonly materialName: string;
  readonly canDelete: boolean;
};

const MOVEMENT_REASONS = ['receive', 'issue', 'correction', 'damage', 'other'] as const;

function useMovementReasonOptions() {
  const { t } = useTranslation();
  return MOVEMENT_REASONS.map((r) => ({ value: r, label: t(`materialInventory.reason.${r}`) }));
}

export function MaterialInventoryUpdateModal(props: Props) {
  if (!props.row) return null;
  return materialHasMultipleUnits(props.material) && props.material ? (
    <PackagingUpdate {...props} material={props.material} />
  ) : (
    <SimpleUpdate {...props} />
  );
}

type SimpleMode = 'delta' | 'snapshot';
type SimpleValues = { value: number | ''; reason: string; note: string };

function SimpleUpdate({ opened, onClose, row, material, materialName, canDelete }: Props) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mode, setMode] = useState<SimpleMode>('delta');
  const reasonOptions = useMovementReasonOptions();

  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const baseUnit = material?.extra?.units?.[0] ?? '';
  const unitLabel = baseUnit ? lookupLabelOf(unitLabels, baseUnit, baseUnit) : '';

  const form = useForm<SimpleValues>({
    initialValues: { value: '', reason: '', note: '' },
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
    
    setMode('delta');
    form.setValues({ value: '', reason: '', note: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  
  useEffect(() => {
    if (!opened) return;
    form.setValues((c) => ({ ...c, value: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const currentOnHand = row?.onHand ?? 0;
  const inputValue = typeof form.values.value === 'number' ? form.values.value : 0;
  const newOnHand = mode === 'delta' ? currentOnHand + inputValue : inputValue;
  const variance = newOnHand - currentOnHand;
  const wouldGoNegative = form.values.value !== '' && newOnHand < 0;

  const onConflict = () => {
    notifications.show({
      color: 'yellow',
      title: t('common.conflict.title'),
      message: t('common.conflict.message'),
      autoClose: 8000,
    });
    onClose();
  };

  const handleSubmit = async (values: SimpleValues) => {
    if (!row || typeof values.value !== 'number') return;
    const nextOnHand = mode === 'delta' ? currentOnHand + values.value : values.value;
    
    
    if (nextOnHand < 0) {
      notifications.show({
        color: 'red',
        message: t('productInventory.validation.insufficientStock', {
          unit: unitLabel || baseUnit,
        }),
      });
      return;
    }
    setSubmitting(true);
    try {
      const note = values.note.trim();
      await useMaterialInventoryStore.getState().updateSafely({
        id: row.id,
        version: row.version,
        patch: { onHand: nextOnHand, ...(note && { extra: { ...row.extra, lastNote: note } }) },
      });
      if (material)
        logActivity(`materialInventory.${mode === 'delta' ? 'adjust' : 'stockTake'}`, material.id, {
          prevOnHand: currentOnHand,
          nextOnHand,
          delta: nextOnHand - currentOnHand,
          ...(values.reason && { reason: values.reason }),
          ...(note && { note }),
        });
      notifications.show({
        color: 'green',
        message: t(
          mode === 'delta'
            ? 'materialInventory.notifications.adjustSuccess'
            : 'productInventory.notifications.stockTakeSuccess',
        ),
      });
      onClose();
    } catch (err) {
      if (err instanceof EntityConflictError) onConflict();
      else
        notifications.show({
          color: 'red',
          message: t('materialInventory.notifications.adjustError'),
        });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!row) return;
    setDeleting(true);
    try {
      await useMaterialInventoryStore.getState().deleteSafely({ id: row.id, version: row.version });
      notifications.show({
        color: 'green',
        message: t('materialInventory.notifications.deleteSuccess'),
      });
      onClose();
    } catch (err) {
      if (err instanceof EntityConflictError) onConflict();
      else
        notifications.show({
          color: 'red',
          message: t('materialInventory.notifications.deleteError'),
        });
    } finally {
      setDeleting(false);
    }
  };

  if (!row) return null;

  const modeOptions = [
    { value: 'delta', label: t('productInventory.mode.delta') },
    { value: 'snapshot', label: t('productInventory.mode.snapshot') },
  ];

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('materialInventory.modal.updateTitle')}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {materialName}
          </Text>

          {device.isMobile ? (
            <Select
              value={mode}
              onChange={(v) => v && setMode(v as SimpleMode)}
              data={modeOptions}
              allowDeselect={false}
              searchable={false}
              comboboxProps={{ withinPortal: true }}
            />
          ) : (
            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => setMode(v as SimpleMode)}
              data={modeOptions}
            />
          )}

          <Card withBorder padding="md" radius="md" bg="var(--mantine-color-default-hover)">
            <Group justify="space-between" align="baseline" wrap="nowrap">
              <Stack gap={2}>
                <FieldLabel>{t('materialInventory.form.currentOnHand')}</FieldLabel>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700}>
                    {currentOnHand.toLocaleString()}
                  </Text>
                  {unitLabel && (
                    <Text size="xs" c="dimmed">
                      {unitLabel}
                    </Text>
                  )}
                </Group>
              </Stack>
              {form.values.value !== '' && (
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
                      {unitLabel && (
                        <Text size="xs" c="dimmed">
                          {unitLabel}
                        </Text>
                      )}
                    </Group>
                  </Stack>
                </>
              )}
            </Group>
          </Card>

          <NumberInput
            label={t(
              mode === 'delta'
                ? 'productInventory.form.deltaLabel'
                : 'productInventory.form.newOnHandLabel',
            )}
            placeholder={mode === 'delta' ? t('productInventory.form.deltaPlaceholder') : undefined}
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
            {...form.getInputProps('value')}
          />

          <Select
            label={t('materialInventory.form.reasonLabel')}
            placeholder={t('materialInventory.form.reasonPlaceholder')}
            data={reasonOptions}
            clearable
            comboboxProps={{ withinPortal: true }}
            {...form.getInputProps('reason')}
          />

          {wouldGoNegative && (
            <Alert color="red" variant="light">
              <Text size="xs">
                {t('productInventory.validation.insufficientStock', {
                  unit: unitLabel || baseUnit,
                })}
              </Text>
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

          <Group justify="space-between" gap="sm">
            {canDelete ? (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={14} />}
                loading={deleting}
                onClick={handleDelete}
              >
                {t('__new__.01-common.actions.remove')}
              </Button>
            ) : (
              <span />
            )}
            <Group gap="sm">
              <Button variant="default" size="sm" disabled={submitting} onClick={onClose}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" size="sm" loading={submitting} disabled={wouldGoNegative}>
                {t(
                  mode === 'delta'
                    ? 'productInventory.form.submitAdjust'
                    : 'productInventory.form.submitStockTake',
                )}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  );
}

type UpdateMode = 'delta' | 'snapshot' | 'repack';

type PackValues = {
  value: number | '';
  unit: string;
  reason: string;
  fromUnit: string;
  fromQty: number | '';
  toUnit: string;
  toQty: number | '';
  writeOffBaseQty: number | '';
  writeOffReason: string;
  note: string;
};

function PackagingUpdate({
  opened,
  onClose,
  row,
  material,
  materialName,
  canDelete,
}: Props & { material: Material }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mode, setMode] = useState<UpdateMode>('delta');
  const reasonOptions = useMovementReasonOptions();

  const item = useMemo(() => materialToPackagingItem(material), [material]);
  const units = useMemo(() => material.extra?.units ?? [], [material]);
  const baseUnit = units[0] ?? '';

  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u, label: lookupLabelOf(unitLabels, u, u) })),
    [units, unitLabels],
  );

  const breakdown = useMemo(
    () => (row && baseUnit ? readRowBreakdown(row, baseUnit) : {}),
    [row, baseUnit],
  );

  const form = useForm<PackValues>({
    initialValues: {
      value: '',
      unit: baseUnit,
      reason: '',
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
      fromQty: (v) =>
        mode === 'repack' && (v === '' || v <= 0)
          ? t('productInventory.validation.positiveRequired')
          : null,
      toQty: (v) =>
        mode === 'repack' && (v === '' || v <= 0)
          ? t('productInventory.validation.positiveRequired')
          : null,
    },
  });

  useEffect(() => {
    if (!opened) return;
    
    setMode('delta');
    form.setValues({
      value: '',
      unit: baseUnit,
      reason: '',
      fromUnit: baseUnit,
      fromQty: '',
      toUnit: units[1] ?? baseUnit,
      toQty: '',
      writeOffBaseQty: '',
      writeOffReason: '',
      note: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, baseUnit]);

  
  
  useEffect(() => {
    if (!opened) return;
    form.setValues((c) => ({ ...c, value: '', fromQty: '', toQty: '', writeOffBaseQty: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const currentOnHand = row?.onHand ?? 0;
  const inputValue = typeof form.values.value === 'number' ? form.values.value : 0;
  const selectedUnit = form.values.unit || baseUnit;

  const deltaSnapshotPreview = useMemo(() => {
    if (!row || (mode !== 'delta' && mode !== 'snapshot')) return null;
    if (form.values.value === '') return null;
    return mode === 'delta'
      ? applyDelta(item, breakdown, { [selectedUnit]: inputValue })
      : setUnitSnapshot(item, breakdown, selectedUnit, inputValue);
  }, [item, row, mode, breakdown, selectedUnit, inputValue, form.values.value]);

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

  const repackValidation = useMemo(
    () => (repackOp ? validateRepack(item, repackOp) : null),
    [item, repackOp],
  );
  const repackApplyPreview = useMemo(
    () => (repackOp && repackValidation?.ok ? applyRepack(item, breakdown, repackOp) : null),
    [item, breakdown, repackOp, repackValidation],
  );

  const onConflict = () => {
    notifications.show({
      color: 'yellow',
      title: t('common.conflict.title'),
      message: t('common.conflict.message'),
      autoClose: 8000,
    });
    onClose();
  };

  const handleSubmit = useCallback(
    async (values: PackValues) => {
      if (!row) return;
      let nextBreakdown: OnHandByUnit | null = null;
      let nextOnHand = 0;

      if (mode === 'delta') {
        if (typeof values.value !== 'number') return;
        const result = applyDelta(item, breakdown, { [values.unit]: values.value });
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
        const result = setUnitSnapshot(item, breakdown, values.unit, values.value);
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
        const result = applyRepack(item, breakdown, repackOp);
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
        const updatedExtra: MaterialInventoryExtra = {
          ...row.extra,
          onHandByUnit: nextBreakdown,
          ...(noteBase && { lastNote: noteBase }),
        };
        await useMaterialInventoryStore.getState().updateSafely({
          id: row.id,
          version: row.version,
          patch: { onHand: nextOnHand, extra: updatedExtra },
        });
        const verb = mode === 'delta' ? 'adjust' : mode === 'snapshot' ? 'stockTake' : 'repack';
        
        
        logActivity(`materialInventory.${verb}`, material.id, {
          prevOnHand: row.onHand,
          nextOnHand,
          delta: nextOnHand - row.onHand,
          ...(mode !== 'repack' && values.reason && { reason: values.reason }),
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
        if (err instanceof EntityConflictError) onConflict();
        else
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
      } finally {
        setSubmitting(false);
      }
    },
    
    [row, item, breakdown, mode, repackOp, repackValidation, t, onClose],
  );

  const handleDelete = async () => {
    if (!row) return;
    setDeleting(true);
    try {
      await useMaterialInventoryStore.getState().deleteSafely({ id: row.id, version: row.version });
      notifications.show({
        color: 'green',
        message: t('materialInventory.notifications.deleteSuccess'),
      });
      onClose();
    } catch (err) {
      if (err instanceof EntityConflictError) onConflict();
      else
        notifications.show({
          color: 'red',
          message: t('materialInventory.notifications.deleteError'),
        });
    } finally {
      setDeleting(false);
    }
  };

  if (!row) return null;

  const repackNewOnHand = repackApplyPreview?.ok
    ? recomputeOnHand(item, repackApplyPreview.onHandByUnit) - (repackOp?.writeOff?.baseQty ?? 0)
    : currentOnHand;

  const modeOptions = [
    { value: 'delta', label: t('productInventory.mode.delta') },
    { value: 'snapshot', label: t('productInventory.mode.snapshot') },
    { value: 'repack', label: t('productInventory.mode.repack') },
  ];

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={t('materialInventory.modal.updateTitle')}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {materialName}
          </Text>

          {device.isMobile ? (
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
          )}

          <Card withBorder padding="md" radius="md" bg="var(--mantine-color-default-hover)">
            <Group justify="space-between" align="baseline" wrap="nowrap">
              <Stack gap={2}>
                <FieldLabel>{t('materialInventory.form.currentOnHand')}</FieldLabel>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700}>
                    {currentOnHand.toLocaleString()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {lookupLabelOf(unitLabels, baseUnit, baseUnit)}
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
                        {lookupLabelOf(unitLabels, baseUnit, baseUnit)}
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
                    {variance.toLocaleString()} {lookupLabelOf(unitLabels, baseUnit, baseUnit)}
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
                        {lookupLabelOf(unitLabels, baseUnit, baseUnit)}
                      </Text>
                    </Group>
                  </Stack>
                </>
              )}
            </Group>

            {Object.keys(breakdown).length > 0 && (
              <>
                <Divider my="sm" />
                <Group gap={6} wrap="wrap">
                  {Object.entries(breakdown).map(([u, q]) => (
                    <Badge key={u} variant="light" color="gray" size="sm" radius="sm" tt="none">
                      {q.toLocaleString()} {lookupLabelOf(unitLabels, u, u)}
                    </Badge>
                  ))}
                </Group>
              </>
            )}
          </Card>

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
                <Select
                  label={t('common.labels.unit')}
                  data={unitOptions}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: true }}
                  style={{ flex: 1 }}
                  {...form.getInputProps('unit')}
                />
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
                  comboboxProps={{ withinPortal: true }}
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
                  comboboxProps={{ withinPortal: true }}
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
                  comboboxProps={{ withinPortal: true }}
                  style={{ flex: 1 }}
                  {...form.getInputProps('writeOffReason')}
                />
              </Group>
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

          {(mode === 'delta' || mode === 'snapshot') && (
            <Select
              label={t('materialInventory.form.reasonLabel')}
              placeholder={t('materialInventory.form.reasonPlaceholder')}
              data={reasonOptions}
              clearable
              comboboxProps={{ withinPortal: true }}
              {...form.getInputProps('reason')}
            />
          )}

          <Textarea
            label={t('productInventory.form.noteLabel')}
            placeholder={t('productInventory.form.notePlaceholder')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('note')}
          />

          <Group justify="space-between" gap="sm">
            {canDelete ? (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={14} />}
                loading={deleting}
                onClick={handleDelete}
              >
                {t('__new__.01-common.actions.remove')}
              </Button>
            ) : (
              <span />
            )}
            <Group gap="sm">
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
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  );
}
