import type { CropDiaryEntry, CropDiaryExtra } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import type { CMngtPartitionedRecordTarget } from '@credo/connectors/types';

const CROP_DIARY_TARGET: CMngtPartitionedRecordTarget = {
  entity: 'crop-diary',
  partitionLocate: 'explicit',
};

export async function queryCropDiary(cropId: string): Promise<CropDiaryEntry[]> {
  const res = await cMngtConnector.queryPartitionedRecordsSync(CROP_DIARY_TARGET, {
    partitionKeys: [cropId],
  });
  const records: CropDiaryEntry[] = res.changed
    ? ((res.updated[cropId] ?? []) as CropDiaryEntry[])
    : [];
  const entries = records.filter((r) => (r as { kind?: string }).kind !== 'sheet');
  return entries.sort((a, b) =>
    String(b.entryDate).slice(0, 10).localeCompare(String(a.entryDate).slice(0, 10)),
  );
}

export async function createCropDiaryEntry(input: {
  cropId: string;
  cropCode: string;
  entryDate: string;
  activity: string;
  extra?: CropDiaryExtra;
}): Promise<CropDiaryEntry> {
  const item: Record<string, unknown> = {
    kind: 'event',
    cropId: input.cropId,
    cropCode: input.cropCode,
    entryDate: input.entryDate,
    activity: input.activity,
    ...(input.extra && { extra: input.extra }),
  };
  const res = await cMngtConnector.createPartitionedRecord(CROP_DIARY_TARGET, {
    item,
    partitionKey: input.cropId,
  });
  return res.item as CropDiaryEntry;
}

export async function updateCropDiaryEntry(input: {
  id: string;
  cropId: string;
  version: string;
  entryDate: string;
  activity: string;
  extra?: CropDiaryExtra;
}): Promise<CropDiaryEntry> {
  const res = await cMngtConnector.updatePartitionedRecord(CROP_DIARY_TARGET, {
    id: input.id,
    version: input.version,
    partitionKey: input.cropId,
    patch: {
      entryDate: input.entryDate,
      activity: input.activity,
      extra: input.extra ?? {},
    },
  });
  return res.item as CropDiaryEntry;
}

export async function deleteCropDiaryEntry(input: {
  id: string;
  cropId: string;
  version: string;
}): Promise<void> {
  await cMngtConnector.deletePartitionedRecord(CROP_DIARY_TARGET, {
    id: input.id,
    version: input.version,
    partitionKey: input.cropId,
  });
}
