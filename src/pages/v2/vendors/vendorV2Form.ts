import type { VendorV2Row } from '@/types';

export const VENDOR_TYPE_CATEGORY = 'vendor-type';

export type VendorV2FormValues = {
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  vendorType: string;
  phone: string;
  contactPerson: string;
  address: string;
  addressGoogleMapUrl: string;
  isActive: boolean;
};

export const EMPTY_VENDOR_V2: VendorV2FormValues = {
  code: '',
  name: '',
  shortName: '',
  taxCode: '',
  vendorType: '',
  phone: '',
  contactPerson: '',
  address: '',
  addressGoogleMapUrl: '',
  isActive: true,
};

export const valuesOf = (row: VendorV2Row): VendorV2FormValues => ({
  code: row.code,
  name: row.name,
  shortName: row.extra?.shortName ?? '',
  taxCode: row.extra?.taxCode ?? '',
  vendorType: row.extra?.vendorType ?? '',
  phone: row.phone ?? '',
  contactPerson: row.contactPerson ?? '',
  address: row.address ?? '',
  addressGoogleMapUrl: row.extra?.addressGoogleMapUrl ?? '',
  isActive: row.isActive,
});

export const patchOf = (
  values: VendorV2FormValues,
  editing: VendorV2Row | null,
): Record<string, unknown> => {
  const code = values.code.trim().toUpperCase();
  const shortName = values.shortName.trim();
  const taxCode = values.taxCode.trim();
  const vendorType = values.vendorType.trim();
  const addressGoogleMapUrl = values.addressGoogleMapUrl.trim();
  return {
    ...(code ? { code } : {}),
    name: values.name.trim(),
    phone: values.phone.trim(),
    contactPerson: values.contactPerson.trim(),
    address: values.address.trim(),
    isActive: values.isActive,
    extra: {
      ...(editing?.extra ?? {}),
      shortName: shortName || undefined,
      taxCode: taxCode || undefined,
      vendorType: vendorType || undefined,
      addressGoogleMapUrl: addressGoogleMapUrl || undefined,
    },
  };
};
