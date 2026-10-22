import type { Crop } from '@/types';
import { cMngtConnector, CallApiError } from '@credo/connectors/connector';
import type { CMngtPartitionedRecordTarget } from '@credo/connectors/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createSingleRecordsStore } from './createSingleRecordsStore';
import { findGrowingCropInGreenhouse } from '@/utils/cropSchedule';

export const CROP_RECORD_TARGET = { entity: 'crop', uniqueField: 'code' } as const;

export const useCropStore = createSingleRecordsStore<Crop>({
  ...CROP_RECORD_TARGET,
  
  cacheKey: 'crp2.b3d9e1',
  cacheTTL: 10 * ONE_MINUTE,
});

const CROP_ARCHIVE_TARGET: CMngtPartitionedRecordTarget = {
  entity: 'crop-archive',
  partitionLocate: 'creation:month',
  uniqueField: 'code',
};

export type CropPeriodRange = { fromPeriod: string; toPeriod: string };

function enumerateMonths(fromPeriod: string, toPeriod: string): string[] {
  const [fy, fm] = fromPeriod.split('-').map(Number);
  const [ty, tm] = toPeriod.split('-').map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  if (ty < fy || (ty === fy && tm < fm)) return [];
  const keys: string[] = [];
  let y = fy;
  let m = fm;
  
  while ((y < ty || (y === ty && m <= tm)) && keys.length < 240) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

export async function queryHarvestedCrops(
  range: CropPeriodRange,
  opts?: { greenhouseCode?: string; search?: string },
): Promise<Crop[]> {
  const keys = enumerateMonths(range.fromPeriod, range.toPeriod);
  if (keys.length === 0) return [];
  const res = await cMngtConnector.queryPartitionedRecordsSync(CROP_ARCHIVE_TARGET, {
    partitionKeys: keys,
  });
  
  
  let crops: Crop[] = res.changed ? (Object.values(res.updated).flat() as Crop[]) : [];
  if (opts?.greenhouseCode) {
    crops = crops.filter((c) => c.greenhouseCode === opts.greenhouseCode);
  }
  if (opts?.search) {
    const q = opts.search.trim().toLowerCase();
    if (q) {
      crops = crops.filter((c) =>
        [c.name, c.code, c.greenhouseCode].some((v) => v?.toLowerCase().includes(q)),
      );
    }
  }
  
  return crops.sort((a, b) => (b.harvestedAt ?? 0) - (a.harvestedAt ?? 0));
}

export function fetchArchivedCropById(id: string): Promise<Crop> {
  return cMngtConnector
    .getPartitionedRecordById(CROP_ARCHIVE_TARGET, { id })
    .then((r) => r.item as Crop);
}

export async function fetchCropById(id: string): Promise<Crop | null> {
  const cached = useCropStore.getState().getById(id) as Crop | undefined;
  if (cached) return cached;
  try {
    const r = await cMngtConnector.getSingleRecordById(CROP_RECORD_TARGET, { id });
    return r.item as Crop;
  } catch {
    // Active miss — fall through to the archive (harvested crops).
  }
  try {
    return await fetchArchivedCropById(id);
  } catch {
    return null;
  }
}

export class CropOccupancyError extends Error {
  constructor(public readonly occupantCode: string) {
    super(`Greenhouse already has a growing crop: ${occupantCode}`);
    this.name = 'CropOccupancyError';
  }
}

function isDuplicateCropCodeError(err: unknown): boolean {
  if (!(err instanceof CallApiError) || err.status !== 400) return false;
  const payload = err.payload;
  if (typeof payload !== 'object' || payload === null || !('fields' in payload)) return false;
  const fields = (payload as { fields?: unknown }).fields;
  return typeof fields === 'object' && fields !== null && 'code' in fields;
}

export async function plantCrop(crop: Crop): Promise<Crop> {
  const occupant = findGrowingCropInGreenhouse(
    useCropStore.getState().items as Crop[],
    crop.greenhouseCode,
    crop.id,
  );
  if (occupant) throw new CropOccupancyError(occupant.code);
  return useCropStore.getState().updateSafely({
    id: crop.id,
    version: crop.version,
    patch: { status: 'growing', plantedAt: Date.now() },
  }) as Promise<Crop>;
}

export async function harvestCrop(crop: Crop): Promise<Crop> {
  const item: Record<string, unknown> = {
    code: crop.code,
    name: crop.name,
    greenhouseCode: crop.greenhouseCode,
    status: 'harvested',
    ...(crop.plantedAt !== undefined && { plantedAt: crop.plantedAt }),
    harvestedAt: Date.now(),
    extra: { ...(crop.extra ?? {}), originalCropId: crop.id },
  };

  let archived: Crop = crop;
  try {
    const r = await cMngtConnector.createPartitionedRecord(CROP_ARCHIVE_TARGET, { item });
    archived = r.item as Crop;
  } catch (err) {
    
    
    
    if (!isDuplicateCropCodeError(err)) throw err;
  }

  await useCropStore.getState().deleteSafely({ id: crop.id, version: crop.version });
  return archived;
}
