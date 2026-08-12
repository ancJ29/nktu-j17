import {
  BASE_PERMISSIONS,
  CRUD_KEYS,
  type ModulePermissions,
  type PartialPermissions,
  type Permissions,
} from '@/types/permissions';
import { deepMergePermissions } from '@/utils/permission';
import { Box, Button, Checkbox, Group, Paper, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { buildFullOverlay, buildModuleOverlay, cleanAndEmit } from '../helpers';

const PERM_MODULE_LABELS: Record<string, string> = {
  crop: 'Crop',
  cropDiary: 'Crop Diary',
  cropDiaryTemplate: 'Crop Diary Template',
  customer: 'Customer',
  deliveryRequest: 'Delivery Request',
  employee: 'Employee',
  goodsReceipt: 'Goods Receipt',
  greenhouse: 'Greenhouse',
  location: 'Location',
  lookup: 'Lookup',
  lookupV2: 'Lookup (v2)',
  material: 'Material',
  materialInventory: 'Material Inventory',
  oilTank: 'Oil Tank',
  permissionManagement: 'Permission Management',
  product: 'Product',
  productInventory: 'Product Inventory',
  report: 'Report',
  salesOrder: 'Sales Order',
  transportOrder: 'Transport Order',
  transportRoute: 'Transport Route',
  truck: 'Truck',
  vendor: 'Vendor',
};

const PERM_LABELS: Record<string, string> = {
  canCreate: 'Add',
  canDelete: 'Del',
  canEdit: 'Edit',
  canView: 'View',
  actionsGroup: 'Actions',
  queryGroup: 'Query',
  enableAll: 'Enable all',
  disableAll: 'Disable all',
};

const PERM_FLAG_LABELS: Record<string, string> = {
  canCancel: 'Cancel',
  canConfirmReceived: 'Confirm Received',
  canExport: 'Export to Excel',
  canIssueMagicLink: 'Issue Magic Link',
  canManualRelease: 'Manual Release',
  canModify: 'Modify Permissions',
  canSetPassword: 'Set Password',
  canToggleStatus: 'Toggle Status',
  canTransitionStatus: 'Change Status',
  canViewAll: 'View all records',
  canViewPrice: 'View Prices',
  canViewSelf: 'View own records',
  canReorder: 'Re-order deliveries',
  canManagePhotos: 'Manage Photos',
  canManageInventory: 'Manage Inventory',
  canViewActivityLog: 'View Activity Log',
  canBulkImport: 'Bulk Import',
  canViewSetComponentInventory: 'View component inventory of sets',
};

function moduleHasAccess(mod: ModulePermissions | undefined): boolean {
  if (!mod) return false;
  if (mod.canView || mod.canCreate || mod.canEdit || mod.canDelete) return true;
  if (mod.actions && Object.values(mod.actions).some(Boolean)) return true;
  if (mod.query && Object.values(mod.query).some(Boolean)) return true;
  return false;
}

export function PermissionOverlayEditor({
  permissions,
  onChange,
  resolvedBase,
  showBulkToggle = false,
}: {
  permissions: PartialPermissions;
  onChange: (p: PartialPermissions) => void;
  resolvedBase?: Permissions;
  showBulkToggle?: boolean;
}) {
  const base = resolvedBase ?? BASE_PERMISSIONS;
  const resolved = deepMergePermissions(base, permissions);

  const storeValue = resolvedBase ? false : true;

  const visibleEntries = useMemo(() => {
    const entries = Object.entries(BASE_PERMISSIONS);
    if (!resolvedBase) return entries;
    return entries.filter(([key]) => moduleHasAccess(resolvedBase[key]));
  }, [resolvedBase]);
  const visibleKeys = useMemo(() => visibleEntries.map(([k]) => k), [visibleEntries]);

  const setAllModules = (enable: boolean) => {
    onChange(enable === storeValue ? buildFullOverlay(storeValue, visibleKeys) : {});
  };
  const setModule = (moduleKey: string, enable: boolean) => {
    if (enable === storeValue) {
      const baseMod = BASE_PERMISSIONS[moduleKey];
      onChange({ ...permissions, [moduleKey]: buildModuleOverlay(baseMod, storeValue) });
    } else {
      const { [moduleKey]: _removed, ...rest } = permissions;
      onChange(rest);
    }
  };

  const toggleCrud = (moduleKey: string, key: string, checked: boolean) => {
    const mod = permissions[moduleKey] ?? {};
    const next = { ...mod };

    if (checked !== storeValue) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = storeValue;
    }
    cleanAndEmit(permissions, moduleKey, next, onChange);
  };

  const toggleSub = (
    moduleKey: string,
    group: 'actions' | 'query',
    key: string,
    checked: boolean,
  ) => {
    const mod = permissions[moduleKey] ?? {};
    const sub = { ...(mod[group] ?? {}) };
    if (checked !== storeValue) {
      delete sub[key];
    } else {
      sub[key] = storeValue;
    }
    const nextMod = { ...mod, [group]: Object.keys(sub).length > 0 ? sub : undefined };
    if (!nextMod[group]) delete nextMod[group];
    cleanAndEmit(permissions, moduleKey, nextMod, onChange);
  };

  return (
    <Stack gap="sm">
      {showBulkToggle && visibleEntries.length > 0 && (
        <Group gap="xs">
          <Button size="xs" variant="light" color="teal" onClick={() => setAllModules(true)}>
            Enable all
          </Button>
          <Button size="xs" variant="light" color="red" onClick={() => setAllModules(false)}>
            Disable all
          </Button>
        </Group>
      )}
      {resolvedBase && visibleEntries.length === 0 && (
        <Text fz="sm" c="dimmed" fs="italic">
          Client has no permissions to restrict. Grant client-level access in the Client Permissions
          section first.
        </Text>
      )}
      {visibleEntries.map(([moduleKey, baseMod]) => {
        const resolvedMod = resolved[moduleKey];
        return (
          <Paper key={moduleKey} p="xs" withBorder>
            <Group justify="space-between" mb={4} wrap="nowrap">
              <Text fz="sm" fw={600}>
                {PERM_MODULE_LABELS[moduleKey] ?? moduleKey}
              </Text>
              {showBulkToggle && (
                <Group gap={4} wrap="nowrap">
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="teal"
                    onClick={() => setModule(moduleKey, true)}
                  >
                    Enable
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    onClick={() => setModule(moduleKey, false)}
                  >
                    Disable
                  </Button>
                </Group>
              )}
            </Group>
            <Group gap="md" mb="xs">
              {CRUD_KEYS.map((key) => (
                <Checkbox
                  key={key}
                  label={PERM_LABELS[key] ?? key}
                  checked={resolvedMod[key]}
                  onChange={(e) => toggleCrud(moduleKey, key, e.currentTarget.checked)}
                  size="sm"
                />
              ))}
            </Group>
            {baseMod.actions && Object.keys(baseMod.actions).length > 0 && (
              <Box mt="xs">
                <Text fz="xs" fw={500} c="dimmed" mb={4}>
                  Actions
                </Text>
                <Group gap="xs" wrap="wrap">
                  {Object.keys(baseMod.actions).map((key) => (
                    <Checkbox
                      key={key}
                      label={PERM_FLAG_LABELS[key] ?? key}
                      checked={resolvedMod.actions?.[key] ?? false}
                      onChange={(e) =>
                        toggleSub(moduleKey, 'actions', key, e.currentTarget.checked)
                      }
                      size="xs"
                    />
                  ))}
                </Group>
              </Box>
            )}
            {baseMod.query && Object.keys(baseMod.query).length > 0 && (
              <Box mt="xs">
                <Text fz="xs" fw={500} c="dimmed" mb={4}>
                  Query
                </Text>
                <Group gap="xs" wrap="wrap">
                  {Object.keys(baseMod.query).map((key) => (
                    <Checkbox
                      key={key}
                      label={PERM_FLAG_LABELS[key] ?? key}
                      checked={resolvedMod.query?.[key] ?? false}
                      onChange={(e) => toggleSub(moduleKey, 'query', key, e.currentTarget.checked)}
                      size="xs"
                    />
                  ))}
                </Group>
              </Box>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
