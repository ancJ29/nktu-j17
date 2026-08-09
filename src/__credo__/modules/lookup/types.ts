export type { CMngtLookupItem as LookupItem } from '@credo/connectors/types';

export interface CreateLookupInput<TExtra = Record<string, unknown>> {
  category: string;
  value: string;
  label: string;
  sortOrder?: number;
  extra?: TExtra;

  expectedListHash?: string;
}

export interface UpdateLookupInput<TExtra = Record<string, unknown>> {
  version?: string;

  expectedListHash?: string;
  value?: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  extra?: TExtra;
}

export interface LookupFilter {
  category?: string;
  isActive?: boolean;
  search?: string;
}
