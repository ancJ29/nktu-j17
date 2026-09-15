import { useMemo } from 'react';
import { fieldsForViewer, resolveCustomFields, type ViewerCustomField } from '@/utils/customFields';
import { useCurrentDepartment } from './statusFlowReader';

export type CustomFieldsReader = {
  errors: string[];

  useForViewer: () => ViewerCustomField[];
};

export function createCustomFieldsReader(raw: unknown): CustomFieldsReader {
  const { fields, errors } = resolveCustomFields(raw);
  return {
    errors,
    useForViewer: () => {
      const department = useCurrentDepartment();
      return useMemo(() => fieldsForViewer(fields, department), [department]);
    },
  };
}
