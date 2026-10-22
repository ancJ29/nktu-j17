import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectFilter } from '@/components/DesktopFilterBar';
import type { MaterialV2Row } from '@/types';
import { useLookupDimension } from '../master-data/useLookupDimension';
import { MATERIAL_CATEGORY_CATEGORY } from './materialV2Form';

const categoryOf = (row: MaterialV2Row) => row.extra?.category;

export function useMaterialV2ListFilters(
  _rows: readonly MaterialV2Row[],
  values: Readonly<Record<string, string>>,
  setValue: (key: string, value: string | null) => void,
): { filters: SelectFilter[]; predicate: (row: MaterialV2Row) => boolean } {
  const { t } = useTranslation();
  const { filter, predicate } = useLookupDimension<MaterialV2Row>({
    key: 'category',
    category: MATERIAL_CATEGORY_CATEGORY,
    valueOf: categoryOf,
    title: t('materialsV2.form.category'),
    placeholder: t('materialsV2.filters.categoryAll'),
    values,
    setValue,
  });

  const filters = useMemo(() => (filter ? [filter] : []), [filter]);
  return { filters, predicate };
}
