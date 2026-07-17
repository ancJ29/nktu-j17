import type { Handler, HandlerId } from '../types';
import { reservesStockHandler } from './reservesStock';
import { shipsStockHandler } from './shipsStock';

export const HANDLER_REGISTRY: Record<HandlerId, Handler> = {
  [reservesStockHandler.id]: reservesStockHandler,
  [shipsStockHandler.id]: shipsStockHandler,
};

export function getHandler(id: HandlerId): Handler | undefined {
  return HANDLER_REGISTRY[id];
}
