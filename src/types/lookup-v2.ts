import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type LookupV2Extra = {
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type LookupV2Row = SingleRecordRow & {
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: LookupV2Extra;
};
