import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type MaterialV2Extra = {
  isDeleted?: boolean;

  units?: string[];

  category?: string;
  [key: string]: unknown;
};

export type MaterialV2Row = SingleRecordRow & {
  code: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: MaterialV2Extra;
};
