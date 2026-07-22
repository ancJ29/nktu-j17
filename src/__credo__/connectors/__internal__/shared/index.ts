export { apiGatewayUrl } from './api-gateway';
export { createApiGroup } from './api-group';
export type { ApiCallOptions, ApiGroupConfig } from './api-group';
export { callApi } from './call-api';
export type { CallApiOptions } from './call-api';
export { credoGroup, setCredoGroup, CREDO_GROUP_STORAGE_KEY, urls } from './config';
export { CallApiError } from './errors';
export { buildHeaders, buildHeadersWithRoute } from './headers';
export type { BuildHeadersOptions, StoragesShape } from './headers';
export {
  getEncodingMode,
  getStagePrefix,
  getVrxToken,
  registerStagePrefix,
  setEncodingMode,
  setVrxToken,
} from './transport-state';
export { clearCredoConnectorTrustedKey, getCredoConnectorTrustedKey } from './trusted-key';
