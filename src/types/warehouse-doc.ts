import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';

export type WarehouseDocLine = {
  itemCode: string;
  itemName: string;
  quantity: number;

  unit?: string;
};

export type WarehouseDocStatus = 'draft' | 'confirmed';

export type WarehouseDocExtra = {
  code: string;

  status?: WarehouseDocStatus;
  note?: string;

  reference?: string;

  assignedTo?: string;
  lines?: WarehouseDocLine[];
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type WarehouseDocRow = PartitionedRecordRow & {
  recordDate: string;
  createdAt: number;
  updatedAt: number;
  extra: WarehouseDocExtra;
};
