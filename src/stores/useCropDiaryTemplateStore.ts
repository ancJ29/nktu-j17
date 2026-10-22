import type { CropDiaryTemplate } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';

export const CROP_DIARY_TEMPLATE_RECORD_TARGET = {
  entity: 'crop-diary-template',
  uniqueField: 'code',
} as const;

export const useCropDiaryTemplateStore = createSingleRecordsStore<CropDiaryTemplate>({
  ...CROP_DIARY_TEMPLATE_RECORD_TARGET,
  
  cacheKey: 'cdt2.c4e8a2',
  cacheTTL: 10 * ONE_MINUTE,
});
