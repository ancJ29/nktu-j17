import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';

export type BookEntry = PartitionedRecordRow & {
  recordDate: string;
  createdAt?: number;
  updatedAt?: number;
  extra: BookEntryExtra;
};

export type BookEntryExtra = {
  description: string;

  inValue?: number;

  outValue?: number;

  note?: string;

  productId?: string;
  productCode?: string;

  unit?: string;

  vendorCode?: string;
  vendorName?: string;
  vendorItemCode?: string;

  createdBy: string;
  updatedBy?: string;

  isDeleted?: true;
  deletedBy?: string;
  deletedAt?: number;
};
