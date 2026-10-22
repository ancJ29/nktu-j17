import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type VendorV2Extra = {
  isDeleted?: boolean;
  shortName?: string;

  vendorType?: string;

  taxCode?: string;
  addressGoogleMapUrl?: string;
  [key: string]: unknown;
};

export type VendorV2Row = SingleRecordRow & {
  code: string;
  name: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: VendorV2Extra;
};
