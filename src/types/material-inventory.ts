import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type MaterialInventoryExtra = {
  isDeleted?: boolean;
  
  lastNote?: string;
  
  onHandByUnit?: Record<string, number>;
  [key: string]: unknown;
};

export type MaterialInventoryRow = SingleRecordRow & {
  itemCode: string;
  onHand: number;
  createdAt: number;
  updatedAt: number;
  extra?: MaterialInventoryExtra;
};
