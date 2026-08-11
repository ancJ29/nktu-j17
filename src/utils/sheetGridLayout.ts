export const SHEET_GRID_W = {
  day: 54,

  date: 92,

  stage: 150,

  column: 110,
} as const;

export function sheetTableMinWidth(columnCount: number, leadingWidth: number): number {
  return leadingWidth + columnCount * SHEET_GRID_W.column;
}

export const SHEET_STICKY = {
  day: { position: 'sticky', left: 0, zIndex: 1 },
  date: { position: 'sticky', left: SHEET_GRID_W.day, zIndex: 1 },
  stage: {
    position: 'sticky',
    left: SHEET_GRID_W.day + SHEET_GRID_W.date,
    zIndex: 1,

    boxShadow: '1px 0 0 var(--mantine-color-default-border)',
  },
} as const satisfies Record<string, React.CSSProperties>;

export const SHEET_STICKY_HEAD = {
  day: { ...SHEET_STICKY.day, zIndex: 2 },
  date: { ...SHEET_STICKY.date, zIndex: 2 },
  stage: { ...SHEET_STICKY.stage, zIndex: 2 },
} as const satisfies Record<string, React.CSSProperties>;
