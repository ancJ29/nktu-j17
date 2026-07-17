

import type { SalesOrder, SalesOrderExtra } from '@/types';

export const CHEAT_TAG = '[CHEAT auto-complete]';

export function isCheatCompletedSalesOrder(so: SalesOrder): boolean {
  const extra = so.extra as SalesOrderExtra | undefined;
  if (extra?.cheatAutoComplete != null) return true;
  const log = extra?.activityLog ?? [];
  return log.some((entry) => (entry.note ?? '').includes(CHEAT_TAG));
}
