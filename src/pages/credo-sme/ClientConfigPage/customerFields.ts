import { CUSTOMER_V2_LIST_COLUMNS } from '@/pages/v2/customers/listColumns';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type CustomersV2Form = {
  enabled: boolean;
  simpleMode: boolean;
  codePrefix: string;
  codePadLength: number;
  listColumns: string[];
  hiddenColumns: string[];
};

const DEFAULTS: CustomersV2Form = {
  enabled: false,
  simpleMode: true,
  codePrefix: 'CST-',
  codePadLength: 4,
  listColumns: [],
  hiddenColumns: [],
};

export const readCustomersV2 = (config: CredoAppConfig | null): CustomersV2Form => {
  const v2 = config?.features?.customersV2;
  return {
    enabled: v2?.enabled ?? DEFAULTS.enabled,
    simpleMode: v2?.simpleMode ?? DEFAULTS.simpleMode,
    codePrefix: v2?.codePrefix ?? DEFAULTS.codePrefix,
    codePadLength: v2?.codePadLength ?? DEFAULTS.codePadLength,
    listColumns: [...(v2?.listColumns ?? DEFAULTS.listColumns)],
    hiddenColumns: [...(v2?.hiddenColumns ?? DEFAULTS.hiddenColumns)],
  };
};

export const customerListColumnOptions: Array<{ value: string; label: string }> =
  CUSTOMER_V2_LIST_COLUMNS.map(({ key, label }) => ({ value: key, label }));

export const customerCodePreview = ({ codePrefix, codePadLength }: CustomersV2Form): string =>
  `${codePrefix}${(1).toString().padStart(Math.max(0, codePadLength), '0')}`;

export const applyCustomersV2 = (
  storedFeatures: CredoAppConfig['features'],
  form: CustomersV2Form,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'customersV2', form);
