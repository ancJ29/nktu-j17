import type { TFunction } from 'i18next';
import type { Vendor } from '@/types';

export function buildVendorInfoText(vendor: Vendor, t: TFunction): string {
  return [
    vendor.extra?.shortName || vendor.name,
    vendor.contactPerson && `${t('common.columns.contactPerson')}: ${vendor.contactPerson}`,
    vendor.phone && `${t('common.labels.phone')}: ${vendor.phone}`,
    vendor.address && `${t('common.labels.address')}: ${vendor.address}`,
    vendor.extra?.addressGoogleMapUrl,
  ]
    .filter(Boolean)
    .join('\n');
}
