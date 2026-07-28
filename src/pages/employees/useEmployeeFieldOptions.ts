import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createOptionLabelResolver,
  getDepartmentOptions,
  getPositionOptions,
  resolveOptions,
} from '@/utils/permission';

export function useEmployeeFieldOptions() {
  const { i18n } = useTranslation();

  const lang = i18n.language;
  return useMemo(() => {
    void lang;
    const departmentOptions = resolveOptions(getDepartmentOptions());
    const positionOptions = resolveOptions(getPositionOptions());
    return {
      departmentOptions,
      positionOptions,
      resolveDepartment: createOptionLabelResolver(departmentOptions),
      resolvePosition: createOptionLabelResolver(positionOptions),
    };
  }, [lang]);
}
