import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export type PermissionModeForm = {
  useServerPermissions: boolean;
};

const DEFAULTS: PermissionModeForm = { useServerPermissions: false };

export const readPermissionMode = (config: CredoAppConfig | null): PermissionModeForm => ({
  useServerPermissions:
    config?.features?.permissionManagement?.useServerPermissions ?? DEFAULTS.useServerPermissions,
});

export const applyPermissionMode = (
  storedFeatures: CredoAppConfig['features'],
  form: PermissionModeForm,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'permissionManagement', form);
