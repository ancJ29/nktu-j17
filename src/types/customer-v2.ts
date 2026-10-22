import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type CustomerV2Extra = {
  isDeleted?: boolean;
  shortName?: string;

  customerType?: string;
  taxCode?: string;
  addressGoogleMapUrl?: string;
  [key: string]: unknown;
};

export type CustomerV2Row = SingleRecordRow & {
  code: string;
  name: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: CustomerV2Extra;
};
