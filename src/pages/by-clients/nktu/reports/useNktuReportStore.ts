import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from '@/stores/createSingleRecordsStore';
import type { NktuReport, NktuReportKind } from './types';

export const useNktuReportStore = createSingleRecordsStore<NktuReport>({
  entity: 'nktu-reports',
  uniqueField: 'reportKey',
  
  cacheKey: 'nkrpt.5b91e4',
  cacheTTL: 5 * ONE_MINUTE,
  staleTime: ONE_MINUTE,
});

export function reportKeyOf(kind: NktuReportKind, periodKey: string): string {
  return `${kind}:${periodKey}`;
}
