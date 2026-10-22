import { cMngtConnector } from '@credo/connectors/connector';
import type { CMngtPartitionedRecordTarget } from '@credo/connectors/types';
import { isCropSheet } from '@/utils/cropSheetModel';
import type { CropDiaryEvent, CropDiaryRecord, CropSheet, CropSheetExtra } from '@/types';

const CROP_DIARY_TARGET: CMngtPartitionedRecordTarget = {
  entity: 'crop-diary',
  partitionLocate: 'explicit',
};

export type CropPartition = {
  sheet?: CropSheet;
  events: CropDiaryEvent[];
};

export async function queryCropPartition(cropId: string): Promise<CropPartition> {
  const res = await cMngtConnector.queryPartitionedRecordsSync(CROP_DIARY_TARGET, {
    partitionKeys: [cropId],
  });
  const records: CropDiaryRecord[] = res.changed
    ? ((res.updated[cropId] ?? []) as CropDiaryRecord[])
    : [];

  const sheets = records.filter(isCropSheet);
  const events = records.filter((r): r is CropDiaryEvent => !isCropSheet(r));
  return {
    ...(sheets.length && {
      sheet: sheets.reduce((newest, s) => (s.updatedAt > newest.updatedAt ? s : newest)),
    }),
    events,
  };
}

export async function createCropSheet(input: {
  cropId: string;
  cropCode: string;
  extra: CropSheetExtra;
}): Promise<CropSheet> {
  const res = await cMngtConnector.createPartitionedRecord(CROP_DIARY_TARGET, {
    item: {
      kind: 'sheet',
      cropId: input.cropId,
      cropCode: input.cropCode,
      extra: input.extra,
    },
    partitionKey: input.cropId,
  });
  return res.item as CropSheet;
}

export class CropSheetConflictError extends Error {
  readonly latest?: CropSheet;
  constructor(latest?: CropSheet) {
    super('Crop sheet changed since it was loaded');
    this.name = 'CropSheetConflictError';
    this.latest = latest;
  }
}

export async function updateCropSheet(input: {
  id: string;
  cropId: string;
  version: string;
  extra: CropSheetExtra;
}): Promise<CropSheet> {
  try {
    const res = await cMngtConnector.updatePartitionedRecord(CROP_DIARY_TARGET, {
      id: input.id,
      version: input.version,
      partitionKey: input.cropId,
      patch: { extra: input.extra },
    });
    return res.item as CropSheet;
  } catch (err) {
    if (!isVersionConflict(err)) throw err;
    const latest = await queryCropPartition(input.cropId).catch(() => undefined);
    throw new CropSheetConflictError(latest?.sheet);
  }
}

function isVersionConflict(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /conflict|version|precondition/i.test(message);
}
