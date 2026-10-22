import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectFilter } from '@/components/DesktopFilterBar';
import type { VendorV2Row } from '@/types';
import { useLookupDimension } from '../master-data/useLookupDimension';
import { VENDOR_TYPE_CATEGORY } from './vendorV2Form';

const vendorTypeOf = (row: VendorV2Row) => row.extra?.vendorType;

export function useVendorV2ListFilters(
  _rows: readonly VendorV2Row[],
  values: Readonly<Record<string, string>>,
  setValue: (key: string, value: string | null) => void,
): { filters: SelectFilter[]; predicate: (row: VendorV2Row) => boolean } {
  const { t } = useTranslation();
  const { filter, predicate } = useLookupDimension<VendorV2Row>({
    key: 'vendorType',
    category: VENDOR_TYPE_CATEGORY,
    valueOf: vendorTypeOf,
    title: t('vendorsV2.form.vendorType'),
    placeholder: t('vendorsV2.filters.vendorTypeAll'),
    values,
    setValue,
  });

  const filters = useMemo(() => (filter ? [filter] : []), [filter]);
  return { filters, predicate };
}
