import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { TemplateMaterialLine } from './crop-diary-template';

export type CropDiaryExtra = {
  
  notes?: string;
  
  materials?: TemplateMaterialLine[];
  
  templateCode?: string;
  [key: string]: unknown;
};

export type CropDiaryEntry = PartitionedRecordRow & {
  
  cropId: string;
  
  cropCode?: string;
  
  entryDate: string;
  
  activity: string;
  createdAt: number;
  updatedAt: number;
  extra?: CropDiaryExtra;
};
