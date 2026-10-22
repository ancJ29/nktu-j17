import type { SheetColumnKind } from '@/types';

export const SHEET_GRID_W = {
  day: 54,

  dayDate: 92,

  stage: 150,

  column: 110,

  ratioColumn: 80,

  activityColumn: 500,
} as const;

export function sheetColumnWidth(kind: SheetColumnKind): number {
  if (kind === 'ratio') return SHEET_GRID_W.ratioColumn;
  if (kind === 'activity') return SHEET_GRID_W.activityColumn;
  return SHEET_GRID_W.column;
}

export function sheetColumnThProps(kind: SheetColumnKind): { w?: number; miw: number } {
  const width = sheetColumnWidth(kind);
  return kind === 'ratio' ? { w: width, miw: width } : { miw: width };
}

export function sheetTableMinWidth(
  columns: readonly { kind: SheetColumnKind }[],
  leadingWidth: number,
): number {
  return leadingWidth + columns.reduce((w, c) => w + sheetColumnWidth(c.kind), 0);
}

export const SHEET_STICKY = {
  day: { position: 'sticky', left: 0, zIndex: 1 },
  stage: {
    position: 'sticky',
    left: SHEET_GRID_W.dayDate,
    zIndex: 1,

    boxShadow: '1px 0 0 var(--mantine-color-default-border)',
  },
} as const satisfies Record<string, React.CSSProperties>;

export const SHEET_STICKY_HEAD = {
  day: { ...SHEET_STICKY.day, zIndex: 2 },
  stage: { ...SHEET_STICKY.stage, zIndex: 2 },
} as const satisfies Record<string, React.CSSProperties>;
