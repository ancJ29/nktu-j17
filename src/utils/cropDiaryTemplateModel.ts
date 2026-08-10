import type { CropDiaryTemplate } from '@/types';

export function templateDayCount(tpl: Pick<CropDiaryTemplate, 'steps' | 'extra'>): number {
  return (
    tpl.extra?.plan?.totalDays ??
    tpl.extra?.totalDates ??
    tpl.extra?.days?.length ??
    tpl.steps.length
  );
}
