import { encodeFilterBlob, URL_KEY } from '@/hooks/useUrlFilterState';
import { MAX_RANGE_DAYS } from '@/stores/createPartitionedDayStore';
import { enumerateDates } from '@/utils/partitionReconcile';
import { addDays } from './buildRevenueReport';

export function transactionalListLink(
  listPath: string,
  scope: {
    fromDay: string;
    toDay: string;

    widenBackDays: number;

    statuses?: readonly string[];
    multi?: Record<string, readonly string[]>;
  },
): string {
  const periodDays = enumerateDates(scope.fromDay, scope.toDay).length;
  const widen = Math.max(0, Math.min(scope.widenBackDays, MAX_RANGE_DAYS - periodDays));

  const instant = (day: string) => new Date(`${day}T12:00:00+07:00`).toISOString();
  const blob = {
    ...(scope.statuses ? { s: [...scope.statuses] } : {}),
    ...(scope.multi ? { m: scope.multi } : {}),
    d: {
      from: instant(addDays(scope.fromDay, -widen)),
      to: instant(scope.toDay),
      preset: 'custom',
    },
    a: { from: scope.fromDay, to: scope.toDay },
  };
  return `${listPath}?${URL_KEY}=${encodeFilterBlob(blob)}`;
}

export function listWindowFits(fromDay: string, toDay: string): boolean {
  return enumerateDates(fromDay, toDay).length <= MAX_RANGE_DAYS;
}

export function detailLink(route: string, id: string): string {
  return route.replace(':id', encodeURIComponent(id));
}
