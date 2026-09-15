import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowRight, IconArrowUp } from '@tabler/icons-react';
import { FieldLabel } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/utils/number';
import { EntityConflictError } from '@/stores/createEntityStore';
import type { InventoryV2Store } from '@/stores/createInventoryV2Store';
import type { InventoryV2Row } from '@/types';
import { resolveStockEntry, type StockEntryMode } from './inventoryV2Write';

export function InventoryV2UpdateModal({
  opened,
  onClose,
  row,
  itemId,
  itemName,
  unit,
  useStore,
}: {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly row: InventoryV2Row | undefined;
  readonly itemId: string;
  readonly itemName: string;
  readonly unit?: string | undefined;
  readonly useStore: InventoryV2Store;
}) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<StockEntryMode>(row ? 'delta' : 'snapshot');
  const [value, setValue] = useState<number | string>('');
  const [note, setNote] = useState(row?.note ?? '');
  const [saving, setSaving] = useState(false);

  const current = row?.onHand ?? 0;
  const entered = typeof value === 'number' ? value : Number(value);
  const { next, variance, hasValue, error } = resolveStockEntry({ mode, current, value });
  const errorText = error === null ? null : t(`inventoryV2.validation.${error}`);

  const switchMode = useCallback((raw: string) => {
    setMode(raw as StockEntryMode);

    setValue('');
  }, []);

  const handleSave = useCallback(async () => {
    if (error) return;
    setSaving(true);
    try {
      const trimmed = note.trim();
      const patch = { itemId, onHand: next, ...(trimmed ? { note: trimmed } : {}) };

      if (row) {
        await useStore.getState().updateSafely({ id: row.id, version: row.version, patch });
      } else {
        await useStore.getState().createSafely({ patch });
      }
      notifications.show({ color: 'green', message: t('inventoryV2.notifications.saved') });
      onClose();
    } catch (err) {
      const conflict = err instanceof EntityConflictError;
      notifications.show({
        color: conflict ? 'yellow' : 'red',
        message: conflict
          ? t('inventoryV2.notifications.conflict')
          : t('inventoryV2.notifications.error'),
      });
      if (conflict) onClose();
    } finally {
      setSaving(false);
    }
  }, [error, note, itemId, next, row, useStore, t, onClose]);

  const modeOptions = [
    { value: 'delta', label: t('inventoryV2.mode.delta') },
    { value: 'snapshot', label: t('inventoryV2.mode.snapshot') },
  ];

  return (
    <Modal opened={opened} onClose={onClose} title={t('inventoryV2.modalTitle')} centered size="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {itemName}
        </Text>

        {device.isMobile ? (
          <Select
            value={mode}
            onChange={(v) => v && switchMode(v)}
            data={modeOptions}
            allowDeselect={false}
            searchable={false}
            comboboxProps={{ withinPortal: true }}
          />
        ) : (
          <SegmentedControl fullWidth value={mode} onChange={switchMode} data={modeOptions} />
        )}

        <Card withBorder padding="md" radius="md" bg="var(--mantine-color-default-hover)">
          <Group justify="space-between" align="baseline" wrap="nowrap">
            <Stack gap={2}>
              <FieldLabel>{t('inventoryV2.currentOnHand')}</FieldLabel>
              <Group gap={4} align="baseline">
                <Text size="xl" fw={700}>
                  {formatNumber(current)}
                </Text>
                {unit && (
                  <Text size="xs" c="dimmed">
                    {unit}
                  </Text>
                )}
              </Group>
            </Stack>
            {hasValue && (
              <>
                <IconArrowRight size={20} color="var(--mantine-color-dimmed)" />
                <Stack gap={2} align="flex-end">
                  <FieldLabel>{t('inventoryV2.newOnHand')}</FieldLabel>
                  <Group gap={4} align="baseline">
                    <Text
                      size="xl"
                      fw={700}
                      c={
                        next < 0
                          ? 'red'
                          : variance > 0
                            ? 'teal'
                            : variance < 0
                              ? 'orange'
                              : undefined
                      }
                    >
                      {formatNumber(next)}
                    </Text>
                    {unit && (
                      <Text size="xs" c="dimmed">
                        {unit}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </>
            )}
          </Group>
        </Card>

        <NumberInput
          label={t(mode === 'delta' ? 'inventoryV2.deltaLabel' : 'inventoryV2.onHand')}
          description={
            mode === 'delta'
              ? t('inventoryV2.deltaDescription')
              : t('inventoryV2.onHandDescription')
          }
          placeholder={mode === 'delta' ? t('inventoryV2.deltaPlaceholder') : undefined}
          withAsterisk
          value={value}
          onChange={setValue}
          decimalScale={2}
          thousandSeparator=","
          leftSection={
            mode === 'delta' && hasValue ? (
              entered > 0 ? (
                <IconArrowUp size={14} color="var(--mantine-color-teal-6)" />
              ) : entered < 0 ? (
                <IconArrowDown size={14} color="var(--mantine-color-orange-6)" />
              ) : null
            ) : null
          }
          error={value === '' ? null : errorText}
          data-autofocus
        />

        {/* A warning, NOT a block — and the divergence from v1 is deliberate.
            There, a manual adjust cannot go negative because the warehouse
            delivery note is the sanctioned back-order path. This register has
            no such second door: refusing here would leave an operator with a
            real shortage no way to record it but a zero, which is a lie. The
            route accepts it for the same reason. */}
        {hasValue && next < 0 && (
          <Alert color="orange" variant="light">
            <Text size="xs">{t('inventoryV2.validation.willGoNegative')}</Text>
          </Alert>
        )}

        <Textarea
          label={t('inventoryV2.note')}
          autosize
          minRows={2}
          maxRows={4}
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} disabled={saving}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={error !== null}>
            {t('inventoryV2.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
