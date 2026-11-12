export const MIN_COLUMN_WIDTH = 60;

export const MIN_DRAG_TRAVEL = 2;

export function resizedColumnWidth(startPx: number, travelPx: number): number {
  return Math.max(MIN_COLUMN_WIDTH, Math.round(startPx + travelPx));
}
