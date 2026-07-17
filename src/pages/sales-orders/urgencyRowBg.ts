import type { ResolvedStatusOption } from '@/utils/permission';

export function resolveSalesOrderRowBg(
  isUrgent: boolean,
  stage: ResolvedStatusOption['stage'],
): string | undefined {
  if (stage === 'EXCEPTIONAL') return 'gray.2';
  if (!isUrgent) return undefined;
  if (stage === 'COMPLETED') return 'blue.1';
  return 'red.1';
}
