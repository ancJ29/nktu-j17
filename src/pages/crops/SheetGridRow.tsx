import { memo } from 'react';
import { SheetGridCellInput } from '@/components/SheetGridCellInput';
import { cellInputText, cellInputToStored } from '@/utils/cropSheetModel';
import { SHEET_STICKY } from '@/utils/sheetGridLayout';
import { sameSheetRow, type SheetGridRowProps } from './sheetRowEquality';

export const SheetGridRow = memo(function SheetGridRow({
  row,
  stageSpan,
  isToday,
  rowRef,
  editable,
  dayLabel,
  materialsWord,
  logMaterialsLabel,
  onCellChange,
  onOpenMaterials,
  onOpenDay,
  openLabel,
}: SheetGridRowProps) {
  return (
    <tr
      className="sheet-grid-row"
      ref={rowRef}
      style={isToday ? { outline: '2px solid var(--mantine-color-primary-5)' } : undefined}
    >
      {/* The opener is this cell, not the row: every cell to the right is a
          live input, so a row-level handler would fire on the way to a field
          and pull focus out of it. A real `button` keeps the day reachable by
          keyboard and gives it a spoken name — day number and date are one
          answer to one question, so they share the cell and the click. */}
      <td
        className="sheet-grid-day"
        style={SHEET_STICKY.day}
        data-today={isToday ? 'true' : undefined}
      >
        <button
          type="button"
          className="sheet-grid-open"
          aria-label={openLabel}
          onClick={() => onOpenDay(row.day)}
        >
          {row.day}
          {row.date && <span className="sheet-grid-daydate">{row.date}</span>}
        </button>
      </td>
      {/* Merged over the stage's whole run, the way the client's sheets merge
          it. A covered row must not render the td at all — a `0` span means
          the cell above already owns this row. */}
      {stageSpan > 0 && (
        <td className="sheet-grid-stage" style={SHEET_STICKY.stage} rowSpan={stageSpan}>
          {row.stage ?? ''}
        </td>
      )}
      {row.cells.map((cell) => (
        <td key={cell.column.key}>
          {/* Drift from the process is the thing an operator most needs to see
              at a glance, and it is the only signal the old model could not
              express at all — a seeded entry and a logged one were identical. */}
          <SheetGridCellInput
            multiline={cell.column.kind !== 'ratio'}
            name={`d${row.day}-${cell.column.key}`}
            label={`${cell.column.label || cell.column.key} — ${dayLabel} ${row.day}`}
            readOnly={!editable}
            changed={cell.changed}

            value={cellInputText(cell)}
            onChange={(value) =>
              onCellChange(row.day, cell.column.key, cellInputToStored(value, cell))
            }
          />
          {/* The way into an activity cell's material log. A plain button —
              the editor itself stays a single modal at the section, because a
              picker per cell is the ~1,200-component regression
              `SheetGridCellInput` exists to avoid. Hidden only when there is
              neither anything to see nor any right to add. */}
          {cell.column.kind === 'activity' && (editable || cell.materials) && (
            <button
              type="button"
              className="sheet-grid-matbtn"
              onClick={() => onOpenMaterials(row.day, cell.column.key)}
            >
              {cell.materials?.length
                ? `${cell.materials.length} ${materialsWord}`
                : `+ ${logMaterialsLabel}`}
            </button>
          )}
        </td>
      ))}
    </tr>
  );
}, sameSheetRow);
