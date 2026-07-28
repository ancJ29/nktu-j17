import { appConfig } from '@/config';

export type LookupCategoryId =
  'product-category' | 'product-tag' | 'unit' | 'material-category' | 'material-unit';

export type LookupCategory = {
  id: LookupCategoryId;

  labelKey: string;

  defaultSortOrder: number;
};

export const LOOKUP_CATEGORIES: LookupCategory[] = [
  { id: 'product-category', labelKey: 'lookups.categories.productCategory', defaultSortOrder: 10 },
  { id: 'product-tag', labelKey: 'lookups.categories.productTag', defaultSortOrder: 10 },
  { id: 'unit', labelKey: 'lookups.categories.unit', defaultSortOrder: 10 },
  {
    id: 'material-category',
    labelKey: 'lookups.categories.materialCategory',
    defaultSortOrder: 10,
  },
  { id: 'material-unit', labelKey: 'lookups.categories.materialUnit', defaultSortOrder: 10 },
];

export function getEnabledCategories(): LookupCategory[] {
  const cfg = appConfig.features?.lookups;
  if (!cfg?.enabledCategories?.length) return LOOKUP_CATEGORIES;
  return LOOKUP_CATEGORIES.filter((c) => cfg.enabledCategories.includes(c.id));
}

export function getLookupCategory(id: string): LookupCategory | undefined {
  return getEnabledCategories().find((c) => c.id === id);
}
