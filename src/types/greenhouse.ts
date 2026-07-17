import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type GreenhouseExtra = {
  
  notes?: string;
  
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type Greenhouse = SingleRecordRow & {
  code: string;
  name: string;
  description: string;
  
  area: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: GreenhouseExtra;
};
