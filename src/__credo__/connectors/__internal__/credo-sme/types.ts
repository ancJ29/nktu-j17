import type { DateTimeInput } from '@credo/kits/types';

type BaseMutationRequest = {
  expectedListHash?: string;
};

type BaseMutationResponse = {
  success: boolean;

  listHash?: string;
};

export type ClientConfig<TExtra = Record<string, unknown>> = {
  clientServiceCode: string;
  clientName: string;
  description: string;
  contactEmail: string;
  domains: string[];
  isActive: boolean;
  extra: TExtra;
  createdAt: DateTimeInput;
  updatedAt: DateTimeInput;
  version: string;
};

export type ProvisionClientRequest<TExtra = Record<string, unknown>> = BaseMutationRequest & {
  clientServiceCode: string;
  clientName: string;
  description?: string;
  contactEmail?: string;
  domains: string[];
  rootEmail: string;

  rootPassword?: string;

  ssoAdminAccessKey: string;
  extra?: TExtra;
};

export type ProvisionClientResponse<TExtra = Record<string, unknown>> = BaseMutationResponse & {
  clientConfig: ClientConfig<TExtra>;
  ssoServiceCode: string;
  operatorAccessKey: string;
  rootEmail: string;
  rootPassword: string;
};
