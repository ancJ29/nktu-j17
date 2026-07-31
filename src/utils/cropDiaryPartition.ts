import type { Crop } from '@/types';

export function cropDiaryPartitionId(crop: Pick<Crop, 'id' | 'extra'>): string {
  return crop.extra?.originalCropId ?? crop.id;
}
