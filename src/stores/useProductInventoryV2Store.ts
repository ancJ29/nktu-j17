import { credoSmeConnector } from '@credo/connectors/connector';
import { createInventoryV2Store } from './createInventoryV2Store';

export const useProductInventoryV2Store = createInventoryV2Store({
  cacheKey: 'prdinv2.9a41c7',
  wire: {
    getAll: (params) => credoSmeConnector.getAllProductInventory(params),
    set: (args) => credoSmeConnector.setProductInventory(args),
  },
});
