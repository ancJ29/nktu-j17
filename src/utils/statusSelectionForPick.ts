import { fetchWindowForPick } from '@/utils/fetchWindowForPick';
import type { DateRangeValue } from '@/types/date-range';

export const LIST_FETCH_WINDOW_DAYS = 90;

export function isPickOlderThanWindow(
  base: DateRangeValue,
  picks: readonly DateRangeValue[],
): boolean {
  return fetchWindowForPick(base, picks) !== base;
}

export function statusSelectionForPick(a: {
  readonly selection: readonly string[] | undefined;
  readonly defaultSelection: readonly string[];

  readonly allStatuses?: readonly string[];
  readonly excluded?: string | undefined;
  readonly pickIsOld: boolean;
}): { readonly selection: string[]; readonly widened: boolean } {
  if (a.selection) return { selection: [...a.selection], widened: false };
  if (a.pickIsOld && a.defaultSelection.length > 0) {
    const every = a.allStatuses ? a.allStatuses.filter((s) => s !== a.excluded) : [];
    return { selection: every, widened: true };
  }
  return { selection: [...a.defaultSelection], widened: false };
}
