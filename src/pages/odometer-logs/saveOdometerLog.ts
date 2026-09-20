import { isDuplicateUniqueFieldError } from '@/utils/code';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { OdometerLog, OdometerLogExtra } from '@/types';

export type SaveOdometerLogInput = {
  recordDate: string;
  employeeId: string;
  employeeName: string;
  km: number;
  photos: OdometerLogExtra['photos'];
  note?: string;
};

async function findServerEntry(
  recordDate: string,
  employeeId: string,
): Promise<OdometerLog | undefined> {
  const partition = await odometerLogBundle.queryPartition(recordDate);
  return partition.find((log) => log.extra?.employeeId === employeeId);
}

export async function saveOdometerLog(input: SaveOdometerLogInput): Promise<OdometerLog> {
  const { recordDate, employeeId, employeeName, km, photos, note } = input;
  const extra: OdometerLogExtra = {
    employeeId,
    employeeName,
    km,
    photos,
    ...(note ? { note } : {}),
  };

  const existing = await findServerEntry(recordDate, employeeId);
  if (existing) return update(existing, extra, recordDate);

  try {
    return await odometerLogBundle.createSafely({
      item: { recordDate, extra },
      partitionKey: recordDate,
    });
  } catch (err) {
    if (!isDuplicateUniqueFieldError(err, 'employeeId')) throw err;
    const raced = await findServerEntry(recordDate, employeeId);
    if (!raced) throw err;
    return update(raced, extra, recordDate);
  }
}

function update(
  existing: OdometerLog,
  extra: OdometerLogExtra,
  recordDate: string,
): Promise<OdometerLog> {
  return odometerLogBundle.updateSafely({
    id: existing.id,
    version: existing.version,

    patch: { recordDate, extra: { ...existing.extra, ...extra } },
    partitionKey: recordDate,
  });
}
