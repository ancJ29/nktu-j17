import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type CropStatus = 'planned' | 'growing' | 'harvested';

export const CROP_STATUS_ORDER: CropStatus[] = ['planned', 'growing', 'harvested'];

export const CROP_CODE_PREFIX = 'CROP-';

export type CropExtra = {
  
  notes?: string;
  
  fromDate?: string;
  toDate?: string;
  
  plantType?: string;
  
  numberOfSeeds?: number;
  
  growingMedium?: string;
  
  picId?: string;
  
  diaryTemplateCode?: string;
  
  originalCropId?: string;
  [key: string]: unknown;
};

export type Crop = SingleRecordRow & {
  code: string;
  name: string;
  greenhouseCode: string;
  status: CropStatus;
  
  plantedAt?: number;
  
  harvestedAt?: number;
  createdAt: number;
  updatedAt: number;
  extra?: CropExtra;
};
