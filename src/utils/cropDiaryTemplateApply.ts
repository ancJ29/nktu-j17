import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { createCropDiaryEntry } from '@/stores/useCropDiaryStore';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { buildTemplateDiaryEntries, templatePlanDays } from '@/utils/cropDiaryTemplateModel';
import type { CropDiaryExtra, TemplateDay } from '@/types';

export async function applyTemplateToCropDiary(opts: {
  cropId: string;
  cropCode: string;
  templateCode: string;
  startDate: string;
  days: TemplateDay[];
}): Promise<number> {
  const drafts = buildTemplateDiaryEntries(opts.days, opts.startDate);
  for (const draft of drafts) {
    const extra: CropDiaryExtra = {
      ...(draft.memo && { notes: draft.memo }),
      ...(draft.materials.length > 0 && { materials: draft.materials }),
      templateCode: opts.templateCode,
    };
    await createCropDiaryEntry({
      cropId: opts.cropId,
      cropCode: opts.cropCode,
      entryDate: draft.entryDate,
      activity: draft.activity,
      extra,
    });
  }
  return drafts.length;
}

export function autoApplyDiaryTemplateOnCreate(opts: {
  diaryTemplateCode: string | null | undefined;
  fromDate: string | null | undefined;
  cropId: string;
  cropCode: string;
}): Promise<number> {
  if (!opts.diaryTemplateCode) return Promise.resolve(0);
  const tpl = useCropDiaryTemplateStore
    .getState()
    .items.find((x) => x.code === opts.diaryTemplateCode);
  if (!tpl) return Promise.resolve(0);
  return applyTemplateToCropDiary({
    cropId: opts.cropId,
    cropCode: opts.cropCode,
    templateCode: opts.diaryTemplateCode,
    startDate: opts.fromDate || todayInVnDateString(),
    days: templatePlanDays(tpl),
  });
}
