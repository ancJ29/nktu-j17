import { credoSmeConnector } from '@credo/connectors/connector';
import { createInventoryV2Store } from './createInventoryV2Store';

export const useMaterialInventoryV2Store = createInventoryV2Store({
  cacheKey: 'matinv2.3f77e0',
  wire: {
    getAll: (params) => credoSmeConnector.getAllMaterialInventory(params),
    set: (args) => credoSmeConnector.setMaterialInventory(args),
  },
});
