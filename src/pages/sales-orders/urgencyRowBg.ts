import type { ResolvedStatusOption } from '@/utils/permission';

export function isOpenUrgentSalesOrder(
  isUrgent: boolean,
  stage: ResolvedStatusOption['stage'],
): boolean {
  return isUrgent && stage !== 'COMPLETED' && stage !== 'EXCEPTIONAL';
}

export function resolveSalesOrderRowBg(
  isUrgent: boolean,
  stage: ResolvedStatusOption['stage'],
): string | undefined {
  if (stage === 'EXCEPTIONAL') return 'gray.2';
  if (isOpenUrgentSalesOrder(isUrgent, stage)) return 'red.1';
  return isUrgent ? 'blue.1' : undefined;
}
