import type {
  CredoSmeEffectivePermissions,
  CredoSmePermissionMismatchEntry as MismatchEntry,
} from '@credo/connectors/types';
import type { Permissions } from '@credo/modules/permissions';

export const MAX_ENTRIES = 20;

export type PermissionComparison = {
  entries: MismatchEntry[];
  total: number;
  truncated: boolean;
};

type AnyPermissions = Permissions | CredoSmeEffectivePermissions;

const flag = (value: boolean | undefined): boolean | null =>
  typeof value === 'boolean' ? value : null;

const sub = (
  perms:
    | { actions?: Record<string, boolean> | undefined; query?: Record<string, boolean> | undefined }
    | undefined,
  group: 'actions' | 'query',
): Record<string, boolean> => perms?.[group] ?? {};

export function comparePermissions(
  browser: AnyPermissions | null | undefined,
  server: AnyPermissions | null | undefined,
): PermissionComparison {
  const all: MismatchEntry[] = [];
  const modules = new Set([...Object.keys(browser ?? {}), ...Object.keys(server ?? {})]);

  for (const mod of [...modules].sort()) {
    const b = browser?.[mod];
    const s = server?.[mod];

    if (!b || !s) {
      all.push({ path: mod, browser: b ? true : null, server: s ? true : null });
      continue;
    }

    for (const crud of ['canView', 'canCreate', 'canEdit', 'canDelete'] as const) {
      const bv = flag(b[crud]);
      const sv = flag(s[crud]);
      if (bv !== sv) all.push({ path: `${mod}.${crud}`, browser: bv, server: sv });
    }

    for (const group of ['actions', 'query'] as const) {
      const bg = sub(b, group);
      const sg = sub(s, group);
      for (const key of [...new Set([...Object.keys(bg), ...Object.keys(sg)])].sort()) {
        const bv = flag(bg[key]);
        const sv = flag(sg[key]);
        if (bv !== sv) all.push({ path: `${mod}.${group}.${key}`, browser: bv, server: sv });
      }
    }
  }

  return {
    entries: all.slice(0, MAX_ENTRIES),
    total: all.length,
    truncated: all.length > MAX_ENTRIES,
  };
}

export function comparisonSignature(comparison: PermissionComparison): string {
  return comparison.entries.map((entry) => entry.path).join(',');
}
