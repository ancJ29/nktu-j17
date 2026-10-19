import { isDuplicateUniqueFieldError } from '@/utils/code';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { OdometerLog, OdometerLogExtra, OdometerOtherCost } from '@/types';

export type SaveOdometerLogInput = {
  recordDate: string;
  employeeId: string;
  employeeName: string;

  km?: number | undefined;
  photos: OdometerLogExtra['photos'];
  fuelCost?: number | undefined;

  otherCosts?: OdometerOtherCost[];
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
  const { recordDate, employeeId, employeeName, km, photos, fuelCost, note } = input;
  const otherCosts = (input.otherCosts ?? [])
    .filter((line) => line.amount > 0)
    .map((line) => ({ amount: line.amount, content: line.content.trim() }));

  const extra: OdometerLogExtra = {
    employeeId,
    employeeName,
    km: km && km > 0 ? km : undefined,
    photos,
    fuelCost: fuelCost && fuelCost > 0 ? fuelCost : undefined,
    otherCosts: otherCosts.length > 0 ? otherCosts : undefined,
    note: note || undefined,
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
