import { makeCropSheetExtra } from '@/utils/cropSheetModel';
import { addDays } from '@/utils/cropSchedule';
import { createCropSheet, queryCropPartition } from '@/stores/useCropSheetStore';
import { createCropDiaryEntry } from '@/stores/useCropDiaryStore';
import { useCropDiaryTemplateStore } from '@/stores/useCropDiaryTemplateStore';
import type { CropDiaryExtra, CropSheet, CropSheetExtra } from '@/types';

/**
 * Give a new crop its sheet — one write, from the chosen process template.
 *
 * This replaces `autoApplyDiaryTemplateOnCreate`, which expanded a template into
 * N independent diary entries. That shape is what made applying an unundoable
 * N-record write with no preview, and what left a half-failed apply impossible to
 * reason about. One record makes seeding atomic: it either exists or it doesn't.
 */
export async function seedCropSheet(input: {
  cropId: string;
  cropCode: string;
  templateCode?: string | null;
  /** Plants standing — snapshotted onto the sheet, since the doses scale by it. */
  plantCount?: number;
  /** Day 1's calendar date — what the preparation offsets are measured from. */
  startDate?: string;
}): Promise<CropSheet | undefined> {
  const code = input.templateCode?.trim();
  if (!code) return undefined;

  const template = useCropDiaryTemplateStore.getState().items.find((tpl) => tpl.code === code);
  const plan = template?.extra?.plan;
  // A template with no process is not an error worth blocking a crop over — the
  // crop exists, and a sheet can be seeded later once the template is authored.
  if (!plan?.columns.length) return undefined;

  const extra: CropSheetExtra = {
    ...makeCropSheetExtra(plan, { templateCode: code }),
    ...(input.plantCount && input.plantCount > 0 && { plantCount: input.plantCount }),
    // Starts at what the process was written for, so the crop reproduces the
    // template exactly until someone deliberately turns it up or down.
    ...(plan.referenceAdjustmentRate && { adjustmentRate: plan.referenceAdjustmentRate }),
  };

  const sheet = await createCropSheet({
    cropId: input.cropId,
    cropCode: input.cropCode,
    extra,
  });

  // Pre-planting jobs are dated work, not matrix rows, so they land as events.
  // Written after the sheet and non-fatally: the season is the thing that must
  // exist, and a missing prep line is re-addable by hand while a missing sheet
  // is not.
  if (input.startDate && plan.preparation?.length) {
    for (const job of plan.preparation) {
      const entryDate = addDays(input.startDate, job.dayOffset);
      if (!entryDate) continue;
      // The job's kind travels with it: once the line is an ordinary dated
      // event there is nothing left pointing back at the plan, so an entry that
      // does not say "this one consumes material" cannot be told apart from one
      // that needs nothing — see `CropDiaryExtra.prepKind`.
      const extra: CropDiaryExtra = {
        ...(job.label && { notes: job.label }),
        ...(job.kind === 'material' && { prepKind: job.kind }),
      };
      try {
        await createCropDiaryEntry({
          cropId: input.cropId,
          cropCode: input.cropCode,
          entryDate,
          activity: job.activity,
          ...(Object.keys(extra).length > 0 && { extra }),
        });
      } catch {
        // Reported by the caller's own failure path if the sheet write failed;
        // a prep line alone is not worth failing a crop over.
      }
    }
  }

  return sheet;
}

/**
 * Seed only if the crop has no sheet yet.
 *
 * The guard is a read, not an assumption: crop creation is not atomic with this
 * write, so a retried create — or two operators racing the same quick-add — must
 * not leave a crop with two seasons in its partition.
 */
export async function seedCropSheetIfMissing(input: {
  cropId: string;
  cropCode: string;
  templateCode?: string | null;
  plantCount?: number;
  startDate?: string;
}): Promise<CropSheet | undefined> {
  const existing = await queryCropPartition(input.cropId).catch(() => undefined);
  if (existing?.sheet) return existing.sheet;
  return seedCropSheet(input);
}
