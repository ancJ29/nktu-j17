import { Badge, Box, Button, Group, NumberInput, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCalendar,
  IconDeviceFloppy,
  IconDownload,
  IconExternalLink,
  IconFlask,
  IconPlus,
  IconSun,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { SheetColumnHeadCells, SheetGroupHeadCells } from '@/components/SheetGridColumnHeads';
import {
  CropSheetConflictError,
  queryCropPartition,
  updateCropSheet,
} from '@/stores/useCropSheetStore';
import { seedCropSheetIfMissing } from '@/utils/cropSheetSeed';
import { cropSheetExportLabels, exportCropSheet } from '@/utils/cropSheetExcel';
import { addDays } from '@/utils/cropSchedule';
import {
  cleanMaterialLines,
  columnUnit,
  resetDayToPlan,
  seasonTotals,
  sheetCellValue,
  sheetDayView,
  sheetHasGroups,
  sheetRows,
  sheetStageSpans,
  type SheetColumnTotal,
} from '@/utils/cropSheetModel';
import { device } from '@credo/base-ui/utils';
import { CropSheetActivityMaterialsModal } from './CropSheetActivityMaterialsModal';
import { CropSheetDayList } from './CropSheetDayList';
import { CropSheetDayModal } from './CropSheetDayModal';
import { CropSheetMaterialsModal } from './CropSheetMaterialsModal';
import { SheetGridRow } from './SheetGridRow';
import { SHEET_GRID_W, SHEET_STICKY_HEAD, sheetTableMinWidth } from '@/utils/sheetGridLayout';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import { ROUTES } from '@/constants/routes';
import type {
  CropColumnChoice,
  CropDiaryEvent,
  CropSheet,
  CropSheetExtra,
  MaterialLine,
} from '@/types';

type Props = {
  readonly cropId: string;
  readonly cropCode: string;

  readonly startDate?: string;
  readonly templateCode?: string;

  readonly templateId?: string;

  readonly fallbackPlantCount?: number;

  readonly onTotalsChange?: (totals: SheetColumnTotal[]) => void;
};

const canEdit = perms.cropDiary.canEdit();
const canCreate = perms.cropDiary.canCreate();
const canViewTemplate = perms.cropDiaryTemplate.canView();
const isMobile = device.isMobile;

export function CropSheetSection({
  cropId,
  cropCode,
  startDate,
  templateCode,
  templateId,
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
  const [materialsOpen, setMaterialsOpen] = useState(false);

  const [openMaterialsCell, setOpenMaterialsCell] = useState<{
    day: number;
    columnKey: string;
  } | null>(null);
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

  const stageSpans = useMemo(() => sheetStageSpans(rows), [rows]);

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

  const setCellMaterials = useCallback((day: number, key: string, lines: MaterialLine[]) => {
    setDraft((current) => {
      if (!current) return current;
      const days = current.days.map((d) => {
        if (d.day !== day) return d;
        const materials = { ...(d.materials ?? {}) };
        if (lines.length) materials[key] = lines;
        else delete materials[key];
        const { materials: _drop, ...rest } = d;
        return { ...rest, ...(Object.keys(materials).length > 0 && { materials }) };
      });
      return { ...current, days };
    });
    setDirty(true);
  }, []);

  const openCellMaterials = useCallback((day: number, columnKey: string) => {
    setOpenMaterialsCell({ day, columnKey });
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
      const days = draft.days.map((d) => {
        if (!d.materials) return d;
        const materials: Record<string, MaterialLine[]> = {};
        for (const key of Object.keys(d.materials)) {
          const lines = cleanMaterialLines(d.materials[key] ?? []);
          if (lines.length) materials[key] = lines;
        }
        const { materials: _drop, ...rest } = d;
        return { ...rest, ...(Object.keys(materials).length > 0 && { materials }) };
      });
      const saved = await updateCropSheet({
        id: sheet.id,
        cropId,
        version: sheet.version,
        extra: { ...draft, days },
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
      cropSheetExportLabels(t),
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
    return row ? sheetDayView(row, draft.plan.totalDays, draft) : null;
  }, [openDay, rows, draft]);

  const dayEvents = useMemo(() => {
    const date = dayView?.date;
    return date ? events.filter((e) => String(e.entryDate).slice(0, 10) === date) : [];
  }, [events, dayView]);

  const handleResetDay = useCallback((day: number) => {
    setDraft((current) => (current ? { ...current, days: resetDayToPlan(current, day) } : current));
    setDirty(true);
  }, []);

  const setColumnMaterials = useCallback((columnMaterials: Record<string, CropColumnChoice>) => {
    setDraft((current) => (current ? { ...current, columnMaterials } : current));
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
  const hasGroups = sheetHasGroups(columns);

  const columnHeaderCells = (
    <SheetColumnHeadCells columns={columns} unitOf={(column) => columnUnit(column, draft)} />
  );

  return (
    <SectionCard
      icon={<IconCalendar size={14} />}
      title={t('crops.sheet.title')}
      actions={
        <Group gap="xs">
          {/* The plan this sheet was seeded from, in a new tab: "compare"
              means both on screen, and same-tab navigation would drop the
              operator's unsaved grid. Gated on the reader's own template
              permission — the route would refuse them anyway. */}
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
            leftSection={<IconFlask size={14} />}
            onClick={() => setMaterialsOpen(true)}
          >
            {t('crops.sheet.materialConfig')}
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconDownload size={14} />}
            onClick={handleExport}
          >
            {t('__new__.01-common.actions.exportExcel')}
          </Button>
          {templateId && canViewTemplate && (
            <Button
              size="compact-sm"
              variant="default"
              onClick={() => {
                window.open(
                  ROUTES.CROP_DIARY_TEMPLATES.DETAIL.replace(':id', templateId),
                  '_blank',
                );
              }}
              leftSection={<IconExternalLink size={14} />}
            >
              {t('crops.sheet.viewTemplate')}
            </Button>
          )}
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
            className="crop-sheet-grid"
            withTableBorder
            verticalSpacing={2}
            horizontalSpacing={4}
            miw={sheetTableMinWidth(columns, SHEET_GRID_W.dayDate + SHEET_GRID_W.stage)}
          >
            <Table.Thead>
              <Table.Tr>
                {/* One identity column: the day number and its date answer the
                    same question, and two near-empty frozen columns were width
                    taken from the doses. */}
                <Table.Th
                  w={SHEET_GRID_W.dayDate}
                  rowSpan={hasGroups ? 2 : 1}
                  bg="var(--mantine-color-body)"
                  style={SHEET_STICKY_HEAD.day}
                >
                  {t('cropDiaryTemplates.plan.day')}
                </Table.Th>
                <Table.Th
                  w={SHEET_GRID_W.stage}
                  rowSpan={hasGroups ? 2 : 1}
                  bg="var(--mantine-color-body)"
                  style={SHEET_STICKY_HEAD.stage}
                >
                  {t('cropDiaryTemplates.plan.stage')}
                </Table.Th>
                {hasGroups ? <SheetGroupHeadCells columns={columns} /> : columnHeaderCells}
              </Table.Tr>
              {hasGroups && <Table.Tr>{columnHeaderCells}</Table.Tr>}
            </Table.Thead>
            {/* Plain `tbody`/`tr`/`td` — see `ProcessGridEditor` and
              `SheetGridCellInput` for why Mantine's table cells are not used at
              this cell count. */}
            <tbody>
              {rows.map((row, i) => (
                <SheetGridRow
                  key={row.day}
                  row={row}
                  stageSpan={stageSpans[i]!}
                  isToday={row.day === todayDay}
                  rowRef={row.day === todayDay ? todayRowRef : undefined}
                  editable={canEdit}
                  dayLabel={dayLabel}
                  materialsWord={t('crops.sheet.materialsWord')}
                  logMaterialsLabel={t('cropDiaries.logMaterial')}
                  onCellChange={setCell}
                  onOpenMaterials={openCellMaterials}
                  onOpenDay={setOpenDay}
                  openLabel={t('crops.sheet.day.open', { day: row.day })}
                />
              ))}
            </tbody>
          </Table>
        </Box>
      )}

      <CropSheetMaterialsModal
        opened={materialsOpen}
        onClose={() => setMaterialsOpen(false)}
        columns={columns}
        value={draft.columnMaterials ?? {}}
        onChange={setColumnMaterials}
        editable={canEdit}
      />

      <CropSheetDayModal
        view={dayView}
        onMaterialsChange={canEdit ? setCellMaterials : undefined}
        events={dayEvents}
        onClose={() => setOpenDay(null)}
        editable={canEdit}
        dirty={dirty}
        saving={saving}
        onCellChange={setCell}
        onReset={handleResetDay}
        onSave={handleSave}
      />

      <CropSheetActivityMaterialsModal
        cell={
          openMaterialsCell && {
            ...openMaterialsCell,
            columnLabel:
              columns.find((c) => c.key === openMaterialsCell.columnKey)?.label ??
              openMaterialsCell.columnKey,
          }
        }
        totalDays={draft.plan.totalDays}
        lines={
          (openMaterialsCell &&
            draft.days.find((d) => d.day === openMaterialsCell.day)?.materials?.[
              openMaterialsCell.columnKey
            ]) ||
          []
        }
        onChange={setCellMaterials}
        onClose={() => setOpenMaterialsCell(null)}
        editable={canEdit}
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
      />
    </SectionCard>
  );
}
