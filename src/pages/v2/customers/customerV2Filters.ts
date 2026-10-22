import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectFilter } from '@/components/DesktopFilterBar';
import type { CustomerV2Row } from '@/types';
import { useLookupDimension } from '../master-data/useLookupDimension';
import { CUSTOMER_TYPE_CATEGORY } from './customerV2Form';

const customerTypeOf = (row: CustomerV2Row) => row.extra?.customerType;

export function useCustomerV2ListFilters(
  _rows: readonly CustomerV2Row[],
  values: Readonly<Record<string, string>>,
  setValue: (key: string, value: string | null) => void,
): { filters: SelectFilter[]; predicate: (row: CustomerV2Row) => boolean } {
  const { t } = useTranslation();
  const { filter, predicate } = useLookupDimension<CustomerV2Row>({
    key: 'customerType',
    category: CUSTOMER_TYPE_CATEGORY,
    valueOf: customerTypeOf,
    title: t('customersV2.form.customerType'),
    placeholder: t('customersV2.filters.customerTypeAll'),
    values,
    setValue,
  });

  const filters = useMemo(() => (filter ? [filter] : []), [filter]);
  return { filters, predicate };
}
