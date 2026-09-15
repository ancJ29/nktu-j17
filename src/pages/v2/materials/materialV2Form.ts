import { featureFlags } from '@/utils/features';
import { perms } from '@/utils/permission';
import type { MaterialV2Row } from '@/types';

export const MATERIAL_UNIT_CATEGORY = featureFlags.materialsV2.unitCategory;

export const MATERIAL_CATEGORY_CATEGORY = 'material-category';

export const showInventory = featureFlags.materialsV2.inventory;
export const canManageInventory = perms.material.canManageInventory();

export type MaterialV2FormValues = {
  code: string;
  name: string;
  category: string;

  unit: string;
  isActive: boolean;
};

export const EMPTY_MATERIAL_V2: MaterialV2FormValues = {
  code: '',
  name: '',
  category: '',
  unit: '',
  isActive: true,
};

export const valuesOf = (row: MaterialV2Row): MaterialV2FormValues => ({
  code: row.code,
  name: row.name,
  category: row.extra?.category ?? '',
  unit: row.extra?.units?.[0] ?? '',
  isActive: row.isActive,
});

export const patchOf = (
  values: MaterialV2FormValues,
  editing: MaterialV2Row | null,
): Record<string, unknown> => {
  const code = values.code.trim().toUpperCase();
  const category = values.category.trim();
  const unit = values.unit.trim();
  const rest = (editing?.extra?.units ?? []).slice(1);
  return {
    ...(code ? { code } : {}),
    name: values.name.trim(),
    isActive: values.isActive,
    extra: {
      ...(editing?.extra ?? {}),
      units: unit ? [unit, ...rest] : rest,
      category: category || undefined,
    },
  };
};
