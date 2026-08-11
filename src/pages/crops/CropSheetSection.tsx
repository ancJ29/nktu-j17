import { Badge, Box, Button, Group, NumberInput, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCalendar,
  IconDeviceFloppy,
  IconDownload,
  IconPlus,
  IconSun,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { SheetGridCellInput } from '@/components/SheetGridCellInput';
import {
  CropSheetConflictError,
  queryCropPartition,
  updateCropSheet,
} from '@/stores/useCropSheetStore';
import { seedCropSheetIfMissing } from '@/utils/cropSheetSeed';
import { exportCropSheet } from '@/utils/cropSheetExcel';
import { addDays } from '@/utils/cropSchedule';
import {
  resetDayToPlan,
  seasonTotals,
  sheetCellValue,
  sheetDayView,
  sheetRows,
  type SheetColumnTotal,
} from '@/utils/cropSheetModel';
import { device } from '@credo/base-ui/utils';
import { CropSheetDayList } from './CropSheetDayList';
import { CropSheetDayModal } from './CropSheetDayModal';
import { sameSheetRow, type SheetGridRowProps } from './sheetRowEquality';
import { formatNumber } from '@/utils/number';
import {
  SHEET_GRID_W,
  SHEET_STICKY,
  SHEET_STICKY_HEAD,
  sheetTableMinWidth,
} from '@/utils/sheetGridLayout';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import type { CropDiaryEvent, CropSheet, CropSheetExtra } from '@/types';

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
const isMobile = device.isMobile;

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
  const [events, setEvents] = useState<CropDiaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [openDay, setOpenDay] = useState<number | null>(null);
  const todayRowRef = useRef<HTMLTableRowElement | null>(null);
  const anchoredRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const partition = await queryCropPartition(cropId);
      setSheet(partition.sheet ?? null);
      setDraft(partition.sheet?.extra ? structuredClone(partition.sheet.extra) : null);

      setEvents(partition.events);
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

  const dayLabel = t('cropDiaryTemplates.plan.day');
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

        const next = sheetCellValue(raw);
        if (next === undefined) delete values[key];
        else values[key] = next;
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

  const handleExport = useCallback(() => {
    if (!draft) return;
    exportCropSheet(
      { ...draft.plan, days: draft.days },
      {
        stage: t('cropDiaryTemplates.plan.stage'),
        day: t('cropDiaryTemplates.plan.day'),
        date: 'Ngày thực tế',
        weekday: 'Thứ',
        totals: 'TỔNG PHÂN',
        sheetName: t('cropDiaryTemplates.excel.sheetName'),
      },
      `crop_diary_${cropCode}.xlsx`,
      {
        crop: draft,
        ...(typeof plantCount === 'number' ? { plantCount } : {}),
        ...(draft.adjustmentRate !== undefined ? { adjustmentRate: draft.adjustmentRate } : {}),
        ...(startDate
          ? { startDate, dayDate: (day: number) => addDays(startDate, day - 1) ?? undefined }
          : {}),
      },
    );
  }, [draft, cropCode, plantCount, startDate, t]);

  const dayView = useMemo(() => {
    if (openDay === null || !draft) return null;
    const row = rows[openDay - 1];
    return row ? sheetDayView(row, draft.plan.totalDays) : null;
  }, [openDay, rows, draft]);

  const dayEvents = useMemo(() => {
    const date = dayView?.date;
    return date ? events.filter((e) => String(e.entryDate).slice(0, 10) === date) : [];
  }, [events, dayView]);

  const handleResetDay = useCallback((day: number) => {
    setDraft((current) => (current ? { ...current, days: resetDayToPlan(current, day) } : current));
    setDirty(true);
  }, []);

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
        <Group gap="xs">
          {todayDay !== undefined && (
            <Button
              size="compact-sm"
              variant="light"
              leftSection={<IconSun size={14} />}
              onClick={() => setOpenDay(todayDay)}
            >
              {t('crops.sheet.day.today')}
            </Button>
          )}
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconDownload size={14} />}
            onClick={handleExport}
          >
            {t('__new__.01-common.actions.exportExcel')}
          </Button>
          {canEdit ? (
            <Button
              size="compact-sm"
              loading={saving}
              disabled={!dirty}
              leftSection={<IconDeviceFloppy size={14} />}
              onClick={handleSave}
            >
              {t('__new__.01-common.actions.save')}
            </Button>
          ) : null}
        </Group>
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

      {isMobile ? (
        <CropSheetDayList rows={rows} todayDay={todayDay} onOpenDay={setOpenDay} />
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table
            striped
            withTableBorder
            verticalSpacing={2}
            horizontalSpacing={4}
            miw={sheetTableMinWidth(
              columns.length,
              SHEET_GRID_W.day + SHEET_GRID_W.date + SHEET_GRID_W.stage,
            )}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  w={SHEET_GRID_W.day}
                  bg="var(--mantine-color-body)"
                  style={SHEET_STICKY_HEAD.day}
                >
                  {t('cropDiaryTemplates.plan.day')}
                </Table.Th>
                <Table.Th
                  w={SHEET_GRID_W.date}
                  bg="var(--mantine-color-body)"
                  style={SHEET_STICKY_HEAD.date}
                >
                  {t('cropDiaryTemplates.excel.colDay')}
                </Table.Th>
                <Table.Th
                  w={SHEET_GRID_W.stage}
                  bg="var(--mantine-color-body)"
                  style={SHEET_STICKY_HEAD.stage}
                >
                  {t('cropDiaryTemplates.plan.stage')}
                </Table.Th>
                {columns.map((column) => (
                  <Table.Th key={column.key} miw={SHEET_GRID_W.column}>
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
            {/* Plain `tbody`/`tr`/`td` — see `ProcessGridEditor` and
              `SheetGridCellInput` for why Mantine's table cells are not used at
              this cell count. */}
            <tbody>
              {rows.map((row) => (
                <SheetGridRow
                  key={row.day}
                  row={row}
                  isToday={row.day === todayDay}
                  rowRef={row.day === todayDay ? todayRowRef : undefined}
                  editable={canEdit}
                  dayLabel={dayLabel}
                  onCellChange={setCell}
                  onOpenDay={setOpenDay}
                  openLabel={t('crops.sheet.day.open', { day: row.day })}
                />
              ))}
            </tbody>
          </Table>
        </Box>
      )}

      <CropSheetDayModal
        view={dayView}
        events={dayEvents}
        onClose={() => setOpenDay(null)}
        editable={canEdit}
        dirty={dirty}
        saving={saving}
        onCellChange={setCell}
        onReset={handleResetDay}
        onSave={handleSave}
      />
    </SectionCard>
  );
}

const SheetGridRow = memo(function SheetGridRow({
  row,
  isToday,
  rowRef,
  editable,
  dayLabel,
  onCellChange,
  onOpenDay,
  openLabel,
}: SheetGridRowProps) {
  return (
    <tr
      className="sheet-grid-row"
      ref={rowRef}
      style={isToday ? { outline: '2px solid var(--mantine-color-primary-5)' } : undefined}
    >
      {/* The opener is these two cells, not the row: every cell to the right is
          a live input, so a row-level handler would fire on the way to a field
          and pull focus out of it. A real `button` keeps the day reachable by
          keyboard and gives it a spoken name. */}
      <td className="sheet-grid-day" style={SHEET_STICKY.day}>
        <button
          type="button"
          className="sheet-grid-open"
          aria-label={openLabel}
          onClick={() => onOpenDay(row.day)}
        >
          {row.day}
        </button>
      </td>
      <td
        className="sheet-grid-date"
        style={SHEET_STICKY.date}
        data-today={isToday ? 'true' : undefined}
      >
        {/* The same action on the wider, more natural target. Named by its own
            date text, and out of the tab order so a keyboard user gets one stop
            per row rather than two. */}
        <button
          type="button"
          className="sheet-grid-open"
          tabIndex={-1}
          onClick={() => onOpenDay(row.day)}
        >
          {row.date ?? ''}
        </button>
      </td>
      <td className="sheet-grid-stage" style={SHEET_STICKY.stage}>
        {row.stage ?? ''}
      </td>
      {row.cells.map((cell) => (
        <td key={cell.column.key}>
          {/* Drift from the process is the thing an operator most needs to see
              at a glance, and it is the only signal the old model could not
              express at all — a seeded entry and a logged one were identical. */}
          <SheetGridCellInput
            dense
            name={`d${row.day}-${cell.column.key}`}
            label={`${cell.column.label || cell.column.key} — ${dayLabel} ${row.day}`}
            readOnly={!editable}
            changed={cell.changed}
            value={String(cell.value ?? '')}
            onChange={(value) => onCellChange(row.day, cell.column.key, value)}
          />
          {cell.dayTotal !== undefined && cell.dayTotal !== cell.value && (
            <Text size="9px" c="dimmed" lh={1}>
              {formatNumber(Number(cell.dayTotal.toFixed(2)))}
            </Text>
          )}
        </td>
      ))}
    </tr>
  );
}, sameSheetRow);
