import type { CustomerV2Row } from '@/types';

export const CUSTOMER_TYPE_CATEGORY = 'customer-type';

export type CustomerV2FormValues = {
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  customerType: string;
  phone: string;
  contactPerson: string;
  address: string;
  addressGoogleMapUrl: string;
  isActive: boolean;
};

export const EMPTY_CUSTOMER_V2: CustomerV2FormValues = {
  code: '',
  name: '',
  shortName: '',
  taxCode: '',
  customerType: '',
  phone: '',
  contactPerson: '',
  address: '',
  addressGoogleMapUrl: '',
  isActive: true,
};

export const valuesOf = (row: CustomerV2Row): CustomerV2FormValues => ({
  code: row.code,
  name: row.name,
  shortName: row.extra?.shortName ?? '',
  taxCode: row.extra?.taxCode ?? '',
  customerType: row.extra?.customerType ?? '',
  phone: row.phone ?? '',
  contactPerson: row.contactPerson ?? '',
  address: row.address ?? '',
  addressGoogleMapUrl: row.extra?.addressGoogleMapUrl ?? '',
  isActive: row.isActive,
});

export const patchOf = (
  values: CustomerV2FormValues,
  editing: CustomerV2Row | null,
): Record<string, unknown> => {
  const code = values.code.trim().toUpperCase();
  const shortName = values.shortName.trim();
  const taxCode = values.taxCode.trim();
  const customerType = values.customerType.trim();
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
      customerType: customerType || undefined,
      addressGoogleMapUrl: addressGoogleMapUrl || undefined,
    },
  };
};
