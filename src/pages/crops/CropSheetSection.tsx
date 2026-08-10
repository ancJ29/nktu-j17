import { Badge, Box, Button, Group, NumberInput, Table, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconDeviceFloppy, IconPlus } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import {
  CropSheetConflictError,
  queryCropPartition,
  updateCropSheet,
} from '@/stores/useCropSheetStore';
import { seedCropSheetIfMissing } from '@/utils/cropSheetSeed';
import {
  seasonTotals,
  sheetRows,
  type SheetColumnTotal,
  type SheetRow,
} from '@/utils/cropSheetModel';
import { formatNumber } from '@/utils/number';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import type { CropSheet, CropSheetExtra } from '@/types';

type Props = {
  readonly cropId: string;
  readonly cropCode: string;

  readonly startDate?: string;
  readonly templateCode?: string;

  readonly fallbackPlantCount?: number;

  readonly onTotalsChange?: (totals: SheetColumnTotal[]) => void;
};

const canEdit = perms.cropDiary.canEdit();
const canCreate = perms.cropDiary.canCreate();

export function CropSheetSection({
  cropId,
  cropCode,
  startDate,
  templateCode,
  fallbackPlantCount,
  onTotalsChange,
}: Props) {
  const { t } = useTranslation();

  const [sheet, setSheet] = useState<CropSheet | null>(null);
  const [draft, setDraft] = useState<CropSheetExtra | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const todayRowRef = useRef<HTMLTableRowElement | null>(null);
  const anchoredRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const partition = await queryCropPartition(cropId);
      setSheet(partition.sheet ?? null);
      setDraft(partition.sheet?.extra ? structuredClone(partition.sheet.extra) : null);
      setDirty(false);
    } catch {
      notifications.show({ color: 'red', message: t('crops.sheet.loadError') });
    } finally {
      setLoading(false);
    }
  }, [cropId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const plantCount = draft?.plantCount ?? fallbackPlantCount;

  const rows = useMemo(
    () =>
      draft
        ? sheetRows(draft, {
            ...(startDate ? { startDate } : {}),
            ...(typeof plantCount === 'number' ? { plantCount } : {}),
          })
        : [],
    [draft, startDate, plantCount],
  );

  const totals = useMemo(
    () => (draft ? seasonTotals(draft, typeof plantCount === 'number' ? { plantCount } : {}) : []),
    [draft, plantCount],
  );

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const today = todayInVnDateString();
  const todayDay = useMemo(() => rows.find((r) => r.date === today)?.day, [rows, today]);

  useEffect(() => {
    if (anchoredRef.current || !todayRowRef.current) return;
    anchoredRef.current = true;
    todayRowRef.current.scrollIntoView({ block: 'center' });
  }, [rows.length]);

  const setCell = useCallback((day: number, key: string, raw: string) => {
    setDraft((current) => {
      if (!current) return current;
      const days = current.days.map((d) => {
        if (d.day !== day) return d;
        const values = { ...d.values };
        const trimmed = raw.trim();
        if (!trimmed) delete values[key];
        else {
          const n = Number(trimmed.replace(/,/g, ''));
          values[key] = Number.isFinite(n) ? n : raw;
        }
        return { day: d.day, values };
      });
      return { ...current, days };
    });
    setDirty(true);
  }, []);

  const handleSeed = useCallback(async () => {
    setSaving(true);
    try {
      const created = await seedCropSheetIfMissing({
        cropId,
        cropCode,
        templateCode,
        ...(typeof fallbackPlantCount === 'number' ? { plantCount: fallbackPlantCount } : {}),
        ...(startDate ? { startDate } : {}),
      });
      if (!created) {
        notifications.show({ color: 'red', message: t('crops.sheet.seedNoPlan') });
        return;
      }
      await load();
      notifications.show({ color: 'green', message: t('crops.sheet.seedSuccess') });
    } catch {
      notifications.show({ color: 'red', message: t('crops.sheet.seedError') });
    } finally {
      setSaving(false);
    }
  }, [cropId, cropCode, templateCode, fallbackPlantCount, startDate, load, t]);

  const handleSave = useCallback(async () => {
    if (!sheet || !draft) return;
    setSaving(true);
    try {
      const saved = await updateCropSheet({
        id: sheet.id,
        cropId,
        version: sheet.version,
        extra: draft,
      });
      setSheet(saved);
      setDraft(structuredClone(saved.extra ?? draft));
      setDirty(false);
      notifications.show({ color: 'green', message: t('crops.sheet.saveSuccess') });
    } catch (err) {
      if (err instanceof CropSheetConflictError) {
        notifications.show({
          color: 'red',
          title: t('crops.sheet.conflictTitle'),
          message: t('crops.sheet.conflictMessage'),
          autoClose: 12000,
        });
        await load();
        return;
      }
      notifications.show({ color: 'red', message: t('crops.sheet.saveError') });
    } finally {
      setSaving(false);
    }
  }, [sheet, draft, cropId, load, t]);

  const patchSizing = useCallback((patch: Partial<CropSheetExtra>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  }, []);

  if (loading) return null;

  if (!draft || !sheet) {
    return (
      <SectionCard icon={<IconCalendar size={14} />} title={t('crops.sheet.title')}>
        <Text size="sm" c="dimmed" mb="sm">
          {t('crops.sheet.empty')}
        </Text>
        {canCreate && templateCode ? (
          <Button
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}
            loading={saving}
            onClick={handleSeed}
          >
            {t('crops.sheet.seed')}
          </Button>
        ) : null}
      </SectionCard>
    );
  }

  const columns = draft.plan.columns;

  return (
    <SectionCard
      icon={<IconCalendar size={14} />}
      title={t('crops.sheet.title')}
      actions={
        canEdit ? (
          <Button
            size="compact-sm"
            loading={saving}
            disabled={!dirty}
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={handleSave}
          >
            {t('__new__.01-common.actions.save')}
          </Button>
        ) : null
      }
    >
      <Group gap="sm" mb="sm" align="flex-end" wrap="wrap">
        <NumberInput
          size="xs"
          w={150}
          label={t('crops.sheet.plantCount')}
          min={0}
          allowDecimal={false}
          allowNegative={false}
          thousandSeparator=","
          disabled={!canEdit}
          value={typeof draft.plantCount === 'number' ? draft.plantCount : ''}
          onChange={(v) => patchSizing({ plantCount: Number(v) || undefined })}
        />
        <NumberInput
          size="xs"
          w={140}
          label={t('crops.sheet.adjustmentRate')}
          min={0}
          max={2}
          step={0.05}
          decimalScale={3}
          allowNegative={false}
          disabled={!canEdit}
          value={typeof draft.adjustmentRate === 'number' ? draft.adjustmentRate : ''}
          onChange={(v) => patchSizing({ adjustmentRate: Number(v) || undefined })}
        />
        {dirty && (
          <Badge color="yellow" variant="light" radius="sm">
            {t('crops.sheet.unsaved')}
          </Badge>
        )}
      </Group>

      <Box style={{ overflowX: 'auto' }}>
        <Table striped withTableBorder verticalSpacing={2} horizontalSpacing={4} miw={720}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={46}>{t('cropDiaryTemplates.plan.day')}</Table.Th>
              <Table.Th w={92}>{t('cropDiaryTemplates.excel.colDay')}</Table.Th>
              <Table.Th w={130}>{t('cropDiaryTemplates.plan.stage')}</Table.Th>
              {columns.map((column) => (
                <Table.Th key={column.key} miw={104}>
                  <Text size="xs" fw={600} lh={1.2}>
                    {column.label || column.key}
                  </Text>
                  {(column.unit || column.group) && (
                    <Text size="10px" c="dimmed" lh={1.2}>
                      {[column.group, column.unit].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <SheetGridRow
                key={row.day}
                row={row}
                isToday={row.day === todayDay}
                rowRef={row.day === todayDay ? todayRowRef : undefined}
                editable={canEdit}
                onCellChange={setCell}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </SectionCard>
  );
}

const SheetGridRow = memo(function SheetGridRow({
  row,
  isToday,
  rowRef,
  editable,
  onCellChange,
}: {
  readonly row: SheetRow;
  readonly isToday: boolean;
  readonly rowRef?: React.Ref<HTMLTableRowElement>;
  readonly editable: boolean;
  readonly onCellChange: (day: number, key: string, raw: string) => void;
}) {
  return (
    <Table.Tr
      ref={rowRef}
      style={isToday ? { outline: '2px solid var(--mantine-color-primary-5)' } : undefined}
    >
      <Table.Td>
        <Text size="xs" fw={600} ta="center">
          {row.day}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c={isToday ? 'primary' : 'dimmed'} fw={isToday ? 700 : 400}>
          {row.date ?? ''}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" fw={600} c="primary" lh={1.2}>
          {row.stage ?? ''}
        </Text>
      </Table.Td>
      {row.cells.map((cell) => (
        <Table.Td key={cell.column.key}>
          <TextInput
            size="xs"
            variant="unstyled"
            readOnly={!editable}

            styles={{
              input: {
                minHeight: 22,
                height: 22,
                fontWeight: cell.changed ? 700 : 400,
                color: cell.changed ? 'var(--mantine-color-orange-7)' : undefined,
              },
            }}
            value={String(cell.value ?? '')}
            onChange={(e) => onCellChange(row.day, cell.column.key, e.currentTarget.value)}
          />
          {cell.dayTotal !== undefined && cell.dayTotal !== cell.value && (
            <Text size="9px" c="dimmed" lh={1}>
              {formatNumber(Number(cell.dayTotal.toFixed(2)))}
            </Text>
          )}
        </Table.Td>
      ))}
    </Table.Tr>
  );
});
