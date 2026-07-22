import { resolveClientCode } from './client-code';
import { isAdmin, isInternal } from './env';

const availableClientCodes = new Set<string>(['nktu']);

export const showRefreshConfig =
  isInternal || isAdmin || availableClientCodes.has(resolveClientCode());
