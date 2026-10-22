import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { PhotoEntry } from '@/components/ImageUploadPanel';

export type OdometerLogExtra = {
  
  employeeId: string;
  
  employeeName: string;
  
  km?: number;
  
  photos: PhotoEntry[];
  
  fuelCost?: number;
  
  otherCosts?: OdometerOtherCost[];
  note?: string;
  
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type OdometerOtherCost = {
  amount: number;
  content: string;
};

export type OdometerLog = PartitionedRecordRow & {
  
  recordDate: string;
  createdAt: number;
  updatedAt: number;
  extra: OdometerLogExtra;
};
