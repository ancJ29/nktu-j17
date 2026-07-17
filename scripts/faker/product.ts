// Placeholder faker stub. The real generators live in the shared
// `deploy/10-shared-project-files/faker` location (a symlink target not
// present in this worktree) and are restored/generated locally. These keep the
// dev-only `fake-data` feature build-resolvable on a clean checkout; with real
// faker data restored, the seeders produce realistic records.
import type { FakerSource } from './types';

export const products: FakerSource[] = [];
