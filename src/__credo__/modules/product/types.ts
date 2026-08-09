export type { CMngtProduct as Product } from '@credo/connectors/types';

export interface CreateProductInput<TExtra = Record<string, unknown>> {
  name: string;
  code: string;
  description?: string;
  unit: string;
  price: number;
  extra?: TExtra;

  expectedListHash?: string;
}

export interface UpdateProductInput<TExtra = Record<string, unknown>> {
  version?: string;

  expectedListHash?: string;
  name?: string;
  code?: string;
  description?: string;
  unit?: string;
  price?: number;
  isActive?: boolean;
  extra?: TExtra;
}

export interface ProductFilter {
  isActive?: boolean;
  search?: string;
}
