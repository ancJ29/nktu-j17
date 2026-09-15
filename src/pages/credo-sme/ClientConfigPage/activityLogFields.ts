import type { CredoAppConfig } from '../schema';
import { mergeFeature } from './featureMerge';

export const readActivityLog = (config: CredoAppConfig | null): boolean =>
  config?.features?.activityLog?.enabled === true;

export const applyActivityLog = (
  storedFeatures: CredoAppConfig['features'],
  enabled: boolean,
): CredoAppConfig['features'] => mergeFeature(storedFeatures, 'activityLog', { enabled });
