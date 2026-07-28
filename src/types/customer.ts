import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type CustomerContact = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  isPrimary?: boolean;
};

export type CustomerShippingAddress = {
  id: string;
  address: string;
  googleMapUrl?: string;

  deliveryHours?: string;
};

export type CustomerNote = {
  id: string;
  text: string;
  createdAt: number;

  createdBy: string;

  createdByName?: string;
};

export type CustomerExtra = {
  isDeleted?: boolean;
  shortName?: string;

  taxCode?: string;

  addressGoogleMapUrl?: string;
  shippingAddresses?: CustomerShippingAddress[];

  contacts?: CustomerContact[];

  notes?: CustomerNote[];

  [key: string]: unknown;
};

export type Customer = SingleRecordRow & {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
  extra?: CustomerExtra;
  createdAt: number;
  updatedAt: number;

  legacyId?: string;
  legacyCreatedAt?: number | string;
  legacyUpdatedAt?: number | string;
};
