import { VENDOR_V2_LIST_COLUMNS } from '@/pages/v2/vendors/listColumns';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type VendorsV2Form = {
  enabled: boolean;
  simpleMode: boolean;
  codePrefix: string;
  codePadLength: number;
  listColumns: string[];
  hiddenColumns: string[];
};

const DEFAULTS: VendorsV2Form = {
  enabled: false,
  simpleMode: true,
  codePrefix: 'VND-',
  codePadLength: 4,
  listColumns: [],
  hiddenColumns: [],
};

export const readVendorsV2 = (config: CredoAppConfig | null): VendorsV2Form => {
  const v2 = config?.features?.vendorsV2;
  return {
    enabled: v2?.enabled ?? DEFAULTS.enabled,
    simpleMode: v2?.simpleMode ?? DEFAULTS.simpleMode,
    codePrefix: v2?.codePrefix ?? DEFAULTS.codePrefix,
    codePadLength: v2?.codePadLength ?? DEFAULTS.codePadLength,
    listColumns: [...(v2?.listColumns ?? DEFAULTS.listColumns)],
    hiddenColumns: [...(v2?.hiddenColumns ?? DEFAULTS.hiddenColumns)],
  };
};

export const vendorListColumnOptions: Array<{ value: string; label: string }> =
  VENDOR_V2_LIST_COLUMNS.map(({ key, label }) => ({ value: key, label }));

export const vendorCodePreview = ({ codePrefix, codePadLength }: VendorsV2Form): string =>
  `${codePrefix}${(1).toString().padStart(Math.max(0, codePadLength), '0')}`;

export const applyVendorsV2 = (
  storedFeatures: CredoAppConfig['features'],
  form: VendorsV2Form,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'vendorsV2', form);
