export const DEFAULT_LOCATION_CODE = 'DEFAULT';

export type { CMngtLocation as Location } from '@credo/connectors/types';

export interface CreateLocationInput<TExtra = Record<string, unknown>> {
  name: string;
  code: string;
  description?: string;
  address?: string;
  extra?: TExtra;

  expectedListHash?: string;
}

export interface UpdateLocationInput<TExtra = Record<string, unknown>> {
  version?: string;

  expectedListHash?: string;
  name?: string;
  code?: string;
  description?: string;
  address?: string;
  isActive?: boolean;
  extra?: TExtra;
}

export interface LocationFilter {
  isActive?: boolean;
  search?: string;
}
