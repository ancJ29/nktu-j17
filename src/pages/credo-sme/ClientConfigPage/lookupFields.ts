import { LOOKUP_V2_CATEGORIES } from '@/pages/v2/lookup/categoryRegistry';
import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type LookupsV2Form = {
  enabled: boolean;

  enabledCategories: string[];
};

export const LOOKUP_CATEGORY_IDS: string[] = LOOKUP_V2_CATEGORIES.map((c) => c.id);

const DEFAULTS: LookupsV2Form = { enabled: false, enabledCategories: [] };

export const readLookupV2 = (config: CredoAppConfig | null): LookupsV2Form => {
  const lookups = config?.features?.lookupV2;
  return {
    enabled: lookups?.enabled ?? DEFAULTS.enabled,
    enabledCategories: Array.isArray(lookups?.enabledCategories)
      ? lookups.enabledCategories.filter((id): id is string => typeof id === 'string')
      : DEFAULTS.enabledCategories,
  };
};

export const applyLookupV2 = (
  storedFeatures: CredoAppConfig['features'],
  form: LookupsV2Form,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'lookupV2', form);
