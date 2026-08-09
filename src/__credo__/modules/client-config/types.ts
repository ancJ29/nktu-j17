export type { CMngtClientConfig as ClientConfig } from '@credo/connectors/types';

export interface RegisterClientInput<TExtra = Record<string, unknown>> {
  clientServiceCode: string;
  clientName: string;
  description?: string;
  contactEmail?: string;
  domains: string[];
  extra?: TExtra;

  expectedListHash?: string;
}

export interface UpdateClientInput<TExtra = Record<string, unknown>> {
  version?: string;

  expectedListHash?: string;
  clientName?: string;
  description?: string;
  contactEmail?: string;
  domains?: string[];
  isActive?: boolean;
  extra?: TExtra;
}
