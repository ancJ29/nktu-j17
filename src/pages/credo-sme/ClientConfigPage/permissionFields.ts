import type { CredoAppConfig } from '../schema';

export const PERMISSION_MODULES = [
  {
    key: 'employee',
    label: 'Employee',
    actions: [
      { key: 'canSetPassword', label: 'Set password' },
      { key: 'canIssueMagicLink', label: 'Issue magic link' },
      { key: 'canToggleStatus', label: 'Toggle status' },
      { key: 'canViewActivityLog', label: 'View activity log' },
    ],
  },
  { key: 'vendor', label: 'Vendor', actions: [] },
  { key: 'customer', label: 'Customer', actions: [] },
  {
    key: 'product',
    label: 'Product',
    actions: [
      { key: 'canViewPrice', label: 'View price' },
      { key: 'canManagePrice', label: 'Edit price' },
      { key: 'canUploadPhoto', label: 'Upload photos' },
      { key: 'canManageInventory', label: 'Manage stock' },
    ],
  },
  {
    key: 'material',
    label: 'Material',
    actions: [{ key: 'canManageInventory', label: 'Manage stock' }],
  },
  {
    key: 'salesOrder',
    label: 'Sales Order',
    actions: [
      { key: 'canTransitionStatus', label: 'Change status' },
      { key: 'canCancel', label: 'Cancel' },

      { key: 'canManagePayment', label: 'Record payments' },
    ],
  },
  {
    key: 'deliveryRequest',
    label: 'Delivery Note',
    actions: [
      { key: 'canConfirmDelivered', label: 'Confirm delivered' },
      { key: 'canCancel', label: 'Cancel' },
    ],
  },
  {
    key: 'goodsReceipt',
    label: 'Goods Receipt',
    actions: [
      { key: 'canConfirmReceived', label: 'Confirm received' },
      { key: 'canCancel', label: 'Cancel' },
    ],
  },
  { key: 'lookupV2', label: 'Lookups (v2)', actions: [] },
] as const;

export const CRUD = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Add' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]['key'];

export type PermissionForm = Record<PermissionModuleKey, Record<string, boolean>>;

export type LayerStoreValue = true | false;

const readFlag = (raw: unknown, storeValue: LayerStoreValue): boolean =>
  raw === undefined ? storeValue === false : raw === true;

export const readOverlay = (
  overlay: Record<string, unknown> | undefined,
  storeValue: LayerStoreValue,
): PermissionForm =>
  Object.fromEntries(
    PERMISSION_MODULES.map((module) => {
      const mod = (overlay?.[module.key] ?? undefined) as Record<string, unknown> | undefined;
      const actions = (mod?.['actions'] ?? {}) as Record<string, unknown>;
      return [
        module.key,
        {
          ...Object.fromEntries(CRUD.map((c) => [c.key, readFlag(mod?.[c.key], storeValue)])),
          ...Object.fromEntries(
            module.actions.map((a) => [a.key, readFlag(actions[a.key], storeValue)]),
          ),
        },
      ];
    }),
  ) as PermissionForm;

export const readPermissions = (config: CredoAppConfig | null): PermissionForm =>
  readOverlay(config?.permissions as Record<string, unknown> | undefined, true);

export const applyOverlay = (
  storedOverlay: Record<string, unknown> | undefined,
  form: PermissionForm,
  storeValue: LayerStoreValue,
): Record<string, unknown> => {
  const next = { ...(storedOverlay ?? {}) };

  for (const module of PERMISSION_MODULES) {
    const allowed = form[module.key];
    const stored = (next[module.key] ?? {}) as Record<string, unknown>;

    const overlay: Record<string, unknown> = { ...stored };
    for (const crud of CRUD) {
      if (allowed[crud.key] === storeValue) overlay[crud.key] = storeValue;
      else delete overlay[crud.key];
    }

    if (module.actions.length > 0) {
      const actions: Record<string, unknown> = { ...((stored['actions'] ?? {}) as object) };
      for (const action of module.actions) {
        if (allowed[action.key] === storeValue) actions[action.key] = storeValue;
        else delete actions[action.key];
      }
      if (Object.keys(actions).length > 0) overlay['actions'] = actions;
      else delete overlay['actions'];
    }

    if (Object.keys(overlay).length > 0) next[module.key] = overlay;
    else delete next[module.key];
  }

  return next;
};

export const applyPermissions = (
  storedPermissions: CredoAppConfig['permissions'],
  form: PermissionForm,
): CredoAppConfig['permissions'] =>
  applyOverlay(
    storedPermissions as Record<string, unknown> | undefined,
    form,
    true,
  ) as CredoAppConfig['permissions'];

export type DepartmentGrant = { department: string; path: string };

const stripGrants = (
  overlay: Record<string, unknown>,
  department: string,
  dropped: DepartmentGrant[],
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};

  for (const [moduleKey, raw] of Object.entries(overlay)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const module: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'object' && value !== null) {
        const group: Record<string, unknown> = {};
        for (const [flag, flagValue] of Object.entries(value as Record<string, unknown>)) {
          if (flagValue === true) dropped.push({ department, path: `${moduleKey}.${key}.${flag}` });
          else group[flag] = flagValue;
        }
        if (Object.keys(group).length > 0) module[key] = group;
        continue;
      }
      if (value === true) dropped.push({ department, path: `${moduleKey}.${key}` });
      else module[key] = value;
    }

    if (Object.keys(module).length > 0) next[moduleKey] = module;
  }

  return next;
};

export const clampDepartmentOverlays = <T extends { value?: unknown; permissions?: unknown }>(
  options: readonly T[],
): { options: T[]; dropped: DepartmentGrant[] } => {
  const dropped: DepartmentGrant[] = [];

  const next = options.map((option) => {
    const overlay = option.permissions;
    if (typeof overlay !== 'object' || overlay === null) return option;

    const before = dropped.length;
    const name = typeof option.value === 'string' ? option.value : '(unnamed)';
    const clamped = stripGrants(overlay as Record<string, unknown>, name, dropped);
    if (dropped.length === before) return option;

    const { permissions: _dropped, ...rest } = option;
    return (Object.keys(clamped).length > 0 ? { ...rest, permissions: clamped } : rest) as T;
  });

  return { options: next, dropped };
};
