// Placeholder faker stub. The real generators live in the shared
// `deploy/10-shared-project-files/faker` location (a symlink target not
// present in this worktree) and are restored/generated locally. These keep the
// dev-only `fake-data` feature build-resolvable on a clean checkout; with real
// faker data restored, the seeders produce realistic records.
import type { FakerOption, FakerSource } from './types';

export type IndustryName = string;

export interface IndustryBlob {
  products: FakerSource[];
  materials: FakerSource[];
  lookups: {
    productCategory: FakerOption[];
    materialCategory: FakerOption[];
    unit: FakerOption[];
    /** Units for the material module (materials use the dedicated
     *  `material-unit` lookup category, not the shared `unit` one). */
    materialUnit: FakerOption[];
    productTag: FakerOption[];
  };
  description?: string;
}

export const INDUSTRY_OPTIONS: IndustryName[] = [];
export function loadIndustry(_industry?: IndustryName): IndustryBlob {
  return {
    products: [],
    materials: [],
    lookups: {
      productCategory: [],
      materialCategory: [],
      unit: [],
      materialUnit: [],
      productTag: [],
    },
  };
}
