import { Box, Table, Text } from '@mantine/core';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SheetGridCellInput } from '@/components/SheetGridCellInput';
import { SheetColumnHeadCells, SheetGroupHeadCells } from '@/components/SheetGridColumnHeads';
import { sheetCellValue, sheetHasGroups, stageOf } from '@/utils/cropSheetModel';
import { SHEET_GRID_W, sheetTableMinWidth } from '@/utils/sheetGridLayout';
import type { SheetColumn, SheetDay, SheetStage } from '@/types';

type Props = {
  readonly columns: SheetColumn[];
  readonly days: SheetDay[];
  readonly stages: SheetStage[];
  readonly onChange: (days: SheetDay[]) => void;
};

export function ProcessGridEditor({ columns, days, stages, onChange }: Props) {
  const { t } = useTranslation();
  const dayLabel = t('cropDiaryTemplates.plan.day');

  const stageNameFor = useMemo(() => {
    const map = new Map<number, string>();
    for (const stage of stages) {
      if (stageOf(stage.fromDay, stages) === stage) map.set(stage.fromDay, stage.name);
    }
    return map;
  }, [stages]);

  const latest = useRef({ days, onChange });
  useEffect(() => {
    latest.current = { days, onChange };
  });

  const setCell = useCallback((day: number, key: string, raw: string) => {
    const { days, onChange } = latest.current;
    onChange(
      days.map((d) => {
        if (d.day !== day) return d;
        const values = { ...d.values };

        const next = sheetCellValue(raw);
        if (next === undefined) delete values[key];
        else values[key] = next;
        return { day: d.day, values };
      }),
    );
  }, []);

  if (!columns.length) {
    return (
      <Text size="xs" c="dimmed">
        {t('cropDiaryTemplates.plan.gridNeedsColumns')}
      </Text>
    );
  }

  const hasGroups = sheetHasGroups(columns);

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table
        striped
        withTableBorder
        verticalSpacing={2}
        horizontalSpacing={4}
        miw={sheetTableMinWidth(columns, SHEET_GRID_W.day + SHEET_GRID_W.stage)}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={SHEET_GRID_W.day} rowSpan={hasGroups ? 2 : 1} style={STICKY_DAY}>
              {t('cropDiaryTemplates.plan.day')}
            </Table.Th>
            <Table.Th w={SHEET_GRID_W.stage} rowSpan={hasGroups ? 2 : 1}>
              {t('cropDiaryTemplates.plan.stage')}
            </Table.Th>
            {hasGroups ? (
              <SheetGroupHeadCells columns={columns} />
            ) : (
              <SheetColumnHeadCells columns={columns} unitOf={(c) => c.unit} />
            )}
          </Table.Tr>
          {hasGroups && (
            <Table.Tr>
              <SheetColumnHeadCells columns={columns} unitOf={(c) => c.unit} />
            </Table.Tr>
          )}
        </Table.Thead>
        {/* Plain `tbody`/`tr`/`td` below, not `Table.*`. Every Mantine table
            cell is a context consumer and `Table` hands its provider a **fresh
            object literal** on each render, so a context update reaches all
            ~1,200 cells and re-renders them straight through `memo` — the
            bailout does not apply to context. Measured at ~30 ms per keystroke
            on a 69×17 sheet for nothing but that. The row styling those
            components would have supplied lives in `SheetGridCellInput.css`. */}
        <tbody>
          {days.map((day) => (
            <GridRow
              key={day.day}
              day={day}
              columns={columns}
              stageName={stageNameFor.get(day.day)}
              dayLabel={dayLabel}
              onCellChange={setCell}
            />
          ))}
        </tbody>
      </Table>
    </Box>
  );
}

const STICKY_DAY = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 1,
  background: 'var(--mantine-color-body)',
};

const GridRow = memo(function GridRow({
  day,
  columns,
  stageName,
  dayLabel,
  onCellChange,
}: {
  readonly day: SheetDay;
  readonly columns: SheetColumn[];
  readonly stageName?: string;

  readonly dayLabel: string;
  readonly onCellChange: (day: number, key: string, raw: string) => void;
}) {
  return (
    <tr className="sheet-grid-row">
      <td className="sheet-grid-day" style={STICKY_DAY}>
        {day.day}
      </td>
      <td className="sheet-grid-stage">{stageName ?? ''}</td>
      {columns.map((column) => (
        <td key={column.key}>
          <SheetGridCellInput
            name={`d${day.day}-${column.key}`}
            label={`${column.label || column.key} — ${dayLabel} ${day.day}`}
            value={String(day.values[column.key] ?? '')}
            onChange={(value) => onCellChange(day.day, column.key, value)}
          />
        </td>
      ))}
    </tr>
  );
});
