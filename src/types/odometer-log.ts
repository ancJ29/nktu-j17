import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { PhotoEntry } from '@/components/ImageUploadPanel';

export type OdometerLogExtra = {
  employeeId: string;

  employeeName: string;

  km: number;

  photos: PhotoEntry[];
  note?: string;

  isDeleted?: boolean;
  [key: string]: unknown;
};

export type OdometerLog = PartitionedRecordRow & {
  recordDate: string;
  createdAt: number;
  updatedAt: number;
  extra: OdometerLogExtra;
};
