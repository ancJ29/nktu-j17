import type { CMngtLocation } from '@credo/connectors/types';

export const DEFAULT_LOCATION_CODE = 'DEFAULT';

const LEGACY_EMPTY_LOCATION_CODE = '__EMPTY__';

export function isDefaultLocation(code: string | undefined | null): boolean {
  return !code || code === DEFAULT_LOCATION_CODE || code === LEGACY_EMPTY_LOCATION_CODE;
}

export type LocationExtra = {
  isDeleted?: boolean;
  
  kind?: string;
  
  contactName?: string;
  contactPhone?: string;
  
  notes?: string;
  [key: string]: unknown;
};

export type Location = CMngtLocation<LocationExtra>;
