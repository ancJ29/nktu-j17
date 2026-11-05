import type { TFunction } from 'i18next';
import type { Customer } from '@/types';

export function buildCustomerInfoText(customer: Customer, t: TFunction): string {
  return [
    customer.extra?.shortName || customer.name,
    customer.contactPerson && `${t('common.columns.contactPerson')}: ${customer.contactPerson}`,
    customer.phone && `${t('common.labels.phone')}: ${customer.phone}`,
    customer.address && `${t('common.labels.address')}: ${customer.address}`,
    customer.extra?.addressGoogleMapUrl,
  ]
    .filter(Boolean)
    .join('\n');
}
