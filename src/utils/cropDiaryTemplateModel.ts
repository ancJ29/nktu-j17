import type { CropDiaryTemplate } from '@/types';

export function templateDayCount(tpl: Pick<CropDiaryTemplate, 'extra'>): number {
  return tpl.extra?.plan?.totalDays ?? 0;
}
