import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type VendorContact = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  isPrimary?: boolean;
};

export type VendorPickupAddress = {
  id: string;
  address: string;
  googleMapUrl?: string;

  deliveryHours?: string;
};

export type VendorNote = {
  id: string;
  text: string;
  createdAt: number;

  createdBy: string;

  createdByName?: string;
};

export type VendorExtra = {
  isDeleted?: boolean;
  shortName?: string;

  isDomestic?: boolean;

  addressGoogleMapUrl?: string;
  pickupAddresses?: VendorPickupAddress[];

  contacts?: VendorContact[];

  notes?: VendorNote[];

  [key: string]: unknown;
};

export type Vendor = SingleRecordRow & {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
  extra?: VendorExtra;
  createdAt: number;
  updatedAt: number;

  legacyId?: string;
  legacyCreatedAt?: number | string;
  legacyUpdatedAt?: number | string;
};
