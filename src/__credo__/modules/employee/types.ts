export type { CMngtEmployee as Employee } from '@credo/connectors/types';

export interface CreateEmployeeInput<TExtra = Record<string, unknown>> {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  extra?: TExtra;

  expectedListHash?: string;
}

export interface UpdateEmployeeInput<TExtra = Record<string, unknown>> {
  version?: string;

  expectedListHash?: string;
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isActive?: boolean;
  extra?: TExtra;
}

export interface EmployeeFilter {
  isActive?: boolean;
  search?: string;
}
