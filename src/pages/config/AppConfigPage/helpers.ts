import {
  BASE_PERMISSIONS,
  type ModulePermissions,
  type PartialModulePermissions,
  type PartialPermissions,
} from '@/types/permissions';

export function buildModuleOverlay(
  baseMod: ModulePermissions,
  value: boolean,
): PartialModulePermissions {
  const mod: PartialModulePermissions = {
    canView: value,
    canCreate: value,
    canEdit: value,
    canDelete: value,
  };
  if (baseMod.actions && Object.keys(baseMod.actions).length > 0) {
    mod.actions = Object.fromEntries(Object.keys(baseMod.actions).map((k) => [k, value]));
  }
  if (baseMod.query && Object.keys(baseMod.query).length > 0) {
    mod.query = Object.fromEntries(Object.keys(baseMod.query).map((k) => [k, value]));
  }
  return mod;
}

export function buildFullOverlay(value: boolean, keys?: string[]): PartialPermissions {
  const out: PartialPermissions = {};
  const entries = keys
    ? keys.map((k) => [k, BASE_PERMISSIONS[k]] as const).filter(([, mod]) => mod !== undefined)
    : Object.entries(BASE_PERMISSIONS);
  for (const [key, mod] of entries) {
    out[key] = buildModuleOverlay(mod, value);
  }
  return out;
}

export function cleanAndEmit(
  permissions: PartialPermissions,
  moduleKey: string,
  nextMod: PartialPermissions[string],
  onChange: (p: PartialPermissions) => void,
) {
  const hasKeys = Object.keys(nextMod).some(
    (k) =>
      k !== 'actions' && k !== 'query' && (nextMod as Record<string, unknown>)[k] !== undefined,
  );
  const hasActions = nextMod.actions && Object.keys(nextMod.actions).length > 0;
  const hasQuery = nextMod.query && Object.keys(nextMod.query).length > 0;
  if (!hasKeys && !hasActions && !hasQuery) {
    const { [moduleKey]: _, ...rest } = permissions;
    onChange(rest);
  } else {
    onChange({ ...permissions, [moduleKey]: nextMod });
  }
}

export function buildEmployeeCodePreview(prefix: string, padLength: number, n: number): string {
  return `${prefix}${n.toString().padStart(Math.max(0, padLength), '0')}`;
}

export function reconcileTransitions<T extends { value: string }>(
  prevOpts: T[],
  nextOpts: T[],
  transitions: Record<string, string[]>,
): Record<string, string[]> {
  let working = transitions;

  
  if (prevOpts.length === nextOpts.length) {
    const changed: number[] = [];
    for (let i = 0; i < nextOpts.length; i++) {
      if (prevOpts[i]?.value !== nextOpts[i]?.value) changed.push(i);
    }
    if (changed.length === 1) {
      const oldVal = prevOpts[changed[0]]?.value;
      const newVal = nextOpts[changed[0]]?.value;
      if (oldVal && newVal && oldVal !== newVal) {
        const remapped: Record<string, string[]> = {};
        for (const [from, tos] of Object.entries(transitions)) {
          const key = from === oldVal ? newVal : from;
          remapped[key] = tos.map((t) => (t === oldVal ? newVal : t));
        }
        working = remapped;
      }
    }
  }

  
  const valid = new Set(nextOpts.map((o) => o.value).filter(Boolean));
  const pruned: Record<string, string[]> = {};
  for (const [from, tos] of Object.entries(working)) {
    if (!valid.has(from)) continue;
    pruned[from] = tos.filter((t) => valid.has(t));
  }
  return pruned;
}
