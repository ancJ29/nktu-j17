import { MATERIAL_V2_LIST_COLUMNS } from '@/pages/v2/materials/listColumns';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type MaterialsV2Form = {
  enabled: boolean;
  simpleMode: boolean;
  codePrefix: string;
  codePadLength: number;

  unitCategory: 'unit' | 'material-unit';
  inventory: boolean;
  listColumns: string[];
  hiddenColumns: string[];
};

const DEFAULTS: MaterialsV2Form = {
  enabled: false,
  simpleMode: true,
  codePrefix: 'MAT-',
  codePadLength: 4,
  unitCategory: 'material-unit',
  inventory: false,
  listColumns: [],
  hiddenColumns: [],
};

export const readMaterialsV2 = (config: CredoAppConfig | null): MaterialsV2Form => {
  const v2 = config?.features?.materialsV2;
  return {
    enabled: v2?.enabled ?? DEFAULTS.enabled,
    simpleMode: v2?.simpleMode ?? DEFAULTS.simpleMode,
    codePrefix: v2?.codePrefix ?? DEFAULTS.codePrefix,
    codePadLength: v2?.codePadLength ?? DEFAULTS.codePadLength,
    unitCategory:
      v2?.unitCategory === 'unit' || v2?.unitCategory === 'material-unit'
        ? v2.unitCategory
        : DEFAULTS.unitCategory,
    inventory: v2?.inventory ?? DEFAULTS.inventory,
    listColumns: [...(v2?.listColumns ?? DEFAULTS.listColumns)],
    hiddenColumns: [...(v2?.hiddenColumns ?? DEFAULTS.hiddenColumns)],
  };
};

export const materialListColumnOptions = (
  form: MaterialsV2Form,
): Array<{ value: string; label: string }> =>
  MATERIAL_V2_LIST_COLUMNS.filter(({ key }) => key !== 'onHand' || form.inventory).map(
    ({ key, label }) => ({ value: key, label }),
  );

export const materialCodePreview = ({ codePrefix, codePadLength }: MaterialsV2Form): string =>
  `${codePrefix}${(1).toString().padStart(Math.max(0, codePadLength), '0')}`;

export const applyMaterialsV2 = (
  storedFeatures: CredoAppConfig['features'],
  form: MaterialsV2Form,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'materialsV2', form);
