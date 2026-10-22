import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DateRangePreset } from '@/types/date-range';

export function useDatePresetLabels(): Partial<Record<DateRangePreset, string>> {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      today: t('common.datePreset.today'),
      yesterday: t('common.datePreset.yesterday'),
      thisWeek: t('common.datePreset.thisWeek'),
      lastWeek: t('common.datePreset.lastWeek'),
      thisMonth: t('common.datePreset.thisMonth'),
      lastMonth: t('common.datePreset.lastMonth'),
      custom: t('common.datePreset.custom'),
    }),
    [t],
  );
}
