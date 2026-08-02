import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import { createCropDiaryEntry } from '@/stores/useCropDiaryStore';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { buildAllTemplateEntries, type DiaryEntryDraft } from '@/utils/cropDiaryTemplateModel';
import { formatNumber } from '@/utils/number';
import type { CropDiaryExtra, CropDiaryTemplate } from '@/types';

function draftNote(draft: DiaryEntryDraft): string | undefined {
  const amount =
    draft.amount !== undefined
      ? `${formatNumber(draft.amount)}${draft.unit ? ` ${draft.unit}` : ''}`
      : undefined;
  const parts = [draft.memo, amount].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export async function applyTemplateToCropDiary(opts: {
  cropId: string;
  cropCode: string;
  template: Pick<CropDiaryTemplate, 'code' | 'steps' | 'extra'>;
  startDate: string;

  plantCount?: number;
}): Promise<number> {
  const drafts = buildAllTemplateEntries(opts.template, {
    startDate: opts.startDate,
    plantCount: opts.plantCount,
  });

  for (const draft of drafts) {
    const note = draftNote(draft);
    const extra: CropDiaryExtra = {
      ...(note && { notes: note }),
      ...(draft.materials.length > 0 && { materials: draft.materials }),
      templateCode: opts.template.code,
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
  plantCount?: number;
}): Promise<number> {
  if (!opts.diaryTemplateCode) return Promise.resolve(0);
  const tpl = useCropDiaryTemplateStore
    .getState()
    .items.find((x) => x.code === opts.diaryTemplateCode);
  if (!tpl) return Promise.resolve(0);
  return applyTemplateToCropDiary({
    cropId: opts.cropId,
    cropCode: opts.cropCode,
    template: tpl,
    startDate: opts.fromDate || todayInVnDateString(),
    plantCount: opts.plantCount,
  });
}
