

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataTableColumnFilterLabels } from '@credo/base-ui/hooks';

export function useColumnFilterLabels(): DataTableColumnFilterLabels {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      search: t('__new__.01-common.filters.columnFilter.search'),
      selectAll: t('__new__.01-common.filters.columnFilter.selectAll'),
      clear: t('__new__.01-common.filters.columnFilter.clear'),
      empty: t('__new__.01-common.filters.columnFilter.empty'),
      applyResults: t('__new__.01-common.filters.columnFilter.applyResults'),
    }),
    [t],
  );
}
