export type { CMngtProductInventory as ProductInventory } from '@credo/connectors/types';

export interface CreateProductInventoryInput<TExtra = Record<string, unknown>> {
  itemCode: string;
  locationCode: string;
  onHand: number;
  extra?: TExtra;

  expectedListHash?: string;
}

export interface UpdateProductInventoryInput<TExtra = Record<string, unknown>> {
  version?: string;

  expectedListHash?: string;
  onHand?: number;
  extra?: TExtra;
}

export interface ProductInventoryFilter {
  itemCode?: string;
  locationCode?: string;
  search?: string;
}
