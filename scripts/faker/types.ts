// Shared shapes for the dev-only faker stubs. The real generators live at the
// `deploy/10-shared-project-files/faker` symlink target (absent in this
// worktree); these types describe the records the seeders/`add-*` scripts read
// so the placeholder stubs stay type-safe without `any`.

/** A product/material source row consumed by the seeders. */
export interface FakerSource {
  name: string;
  code: string;
  price: number;
  units: string[];
  unitConversions?: unknown;
  category?: string;
  image?: string;
  tags?: string[];
}

/** A select-style `{ value, label }` option used by the lookup pools. */
export interface FakerOption {
  value: string;
  label: string;
}

/** The person-name bundle returned by `generateName()`. */
export interface FakerName {
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
}
